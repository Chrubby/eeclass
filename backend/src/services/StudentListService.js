import { pool } from "../config/db.js";
import { CourseModel } from "../models/courseModel.js";
import { AuthModel } from "../models/authModel.js";
import { parseRosterExcel } from "../utils/rosterExcel.js";

const ENROLLMENT_ROLES = new Set(["student", "external", "auditor", "ta", "dropped"]);
const TA_ASSIGNERS = new Set(["admin", "teacher"]);
const TA_ASSIGN_DENIED = "只有授課老師或管理員可以指定或取消助教";

/** 備註欄寫「助教」「校外加選」「旁聽」時才指定課程身分；沒寫就沿用名冊上原本的身分 */
function enrollmentRoleFromNote(note) {
  if (/助教/.test(note)) return "ta";
  if (/校外/.test(note)) return "external";
  if (/旁聽/.test(note)) return "auditor";
  return null;
}

/** 名單上沒有帳號（學號）的人改用信箱找帳號 */
async function findRosterAccount(row) {
  const account = await AuthModel.findAccountByUsername(row.username);
  if (account || !row.email) return account;
  return AuthModel.findAccountByUsernameOrEmail(row.email);
}

async function requireCourse(courseCode, conn) {
  const course = await CourseModel.findCourseByCode(courseCode, conn);
  if (!course) throw new Error("找不到課程");
  return course;
}

export const StudentListService = {
  async getCourseStudentList(courseCode) {
    const course = await requireCourse(courseCode);
    return CourseModel.getCourseStudents(course.id);
  },

  /** 手動新增學生或修改單一學生的課程身分（含指定／取消助教） */
  async updateOrAddStudent(studentIdentifier, courseCode, role = "student", actorRole) {
    if (!ENROLLMENT_ROLES.has(role)) throw new Error("身分設定不正確");

    const course = await requireCourse(courseCode);
    const student = await AuthModel.getStudentById(String(studentIdentifier ?? "").trim());
    if (!student) throw new Error("系統中找不到此學號的學生");

    const currentRole = await CourseModel.getEnrollmentRole(student.id, course.id);
    // 助教不能自己指定助教，也不能更動其他助教
    if ((role === "ta" || currentRole === "ta") && !TA_ASSIGNERS.has(actorRole)) {
      throw new Error(TA_ASSIGN_DENIED);
    }
    if (role === "dropped" && !currentRole) {
      throw new Error("該學生不在這門課的名冊中");
    }
    return CourseModel.enrollStudent(student.id, course.id, undefined, role);
  },

  /**
   * 依 Excel 名單同步課程名冊：名單上的人加入（或恢復）修課，
   * 名冊上有、名單上沒有的學生改為退選，資料一律保留。
   * 這裡不建立帳號；找不到帳號的列會列在 skipped 回報，不會讓整份名單失敗。
   */
  async syncStudentsFromExcel(courseCode, fileBuffer, actorRole) {
    const canAssignTa = TA_ASSIGNERS.has(actorRole);
    const course = await requireCourse(courseCode);
    const { title, rows, problems } = await parseRosterExcel(fileBuffer);

    const skipped = [...problems];
    const studentsToEnroll = new Map();
    const teachersToBind = new Map();

    for (const row of rows) {
      const summary = { rowNumber: row.rowNumber, username: row.username, name: row.name };
      const account = await findRosterAccount(row);
      if (!account) {
        skipped.push({ ...summary, reason: "尚未建立帳號" });
        continue;
      }

      if (account.role === "student") {
        const student = await AuthModel.getStudentById(account.username);
        if (!student) {
          skipped.push({ ...summary, reason: "帳號缺少學生資料" });
          continue;
        }
        let noteRole = enrollmentRoleFromNote(row.note);
        if (noteRole === "ta" && !canAssignTa) {
          // 名單由上傳的人決定內容，所以助教上傳時不採用「助教」註記，仍照一般學生處理
          skipped.push({ ...summary, reason: `已照一般學生處理：${TA_ASSIGN_DENIED}` });
          noteRole = null;
        }
        studentsToEnroll.set(student.id, {
          ...summary,
          username: account.username,
          noteRole,
        });
      } else if (account.role === "teacher") {
        const teacher = await AuthModel.getTeacherById(account.username);
        if (!teacher) {
          skipped.push({ ...summary, reason: "帳號缺少教師資料" });
          continue;
        }
        teachersToBind.set(teacher.id, { ...summary, username: account.username });
      } else {
        skipped.push({ ...summary, reason: "管理員帳號無法加入課程" });
      }
    }

    // 傳錯檔案或空白名單時，不能把整班都改成退選
    if (studentsToEnroll.size === 0) {
      throw new Error("名單中沒有任何已建立帳號的學生。為避免整班被標記為退選，本次未做任何變更");
    }

    const added = [];
    const reactivated = [];
    const updated = [];
    const withdrawn = [];
    const teachersAdded = [];
    let unchanged = 0;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const current = new Map();
      for (const e of await CourseModel.getCourseEnrollmentsForUpdate(course.id, connection)) {
        const seen = current.get(e.student_id);
        // 同一學生若有重複的選課紀錄，只要有一筆未退選就視為在學
        if (!seen || e.role !== "dropped") current.set(e.student_id, e);
      }

      for (const [studentDbId, { noteRole, ...info }] of studentsToEnroll) {
        const existing = current.get(studentDbId);
        const isActive = existing && existing.role !== "dropped";
        const role = noteRole ?? (isActive ? existing.role : "student");

        if (!existing) {
          await CourseModel.enrollStudent(studentDbId, course.id, connection, role);
          added.push(info);
        } else if (!isActive) {
          await CourseModel.updateStudentRole(studentDbId, course.id, connection, role);
          reactivated.push(info);
        } else if (existing.role !== role) {
          await CourseModel.updateStudentRole(studentDbId, course.id, connection, role);
          updated.push(info);
        } else {
          unchanged++;
        }
      }

      for (const [studentDbId, existing] of current) {
        if (existing.role === "dropped" || studentsToEnroll.has(studentDbId)) continue;
        if (existing.role === "ta" && !canAssignTa) continue;
        await CourseModel.dropCourse(studentDbId, course.id, connection);
        withdrawn.push({ username: existing.username, name: existing.name });
      }

      for (const [teacherDbId, info] of teachersToBind) {
        if (await CourseModel.isTeacherBound(teacherDbId, course.id, connection)) continue;
        await CourseModel.bindTeacherToCourse(teacherDbId, course.id, connection);
        teachersAdded.push(info);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      message: "名冊更新成功！",
      title,
      added,
      reactivated,
      updated,
      unchanged,
      withdrawn,
      teachersAdded,
      skipped,
    };
  },
};
