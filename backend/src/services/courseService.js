import { pool } from "../config/db.js";
import { CourseModel } from "../models/courseModel.js";
import { AuthModel } from "../models/authModel.js"; // 沿用剛才的 AuthModel
import { parseRosterExcel } from "../utils/rosterExcel.js";

/** finds the account for a roster row, falling back to the email for rows with no account number */
async function findRosterAccount(row) {
  const account = await AuthModel.findAccountByUsername(row.username);
  if (account || !row.email) return account;
  return AuthModel.findAccountByUsernameOrEmail(row.email);
}

export const CourseService = {
  async searchCourse(courseCode, courseName) {
    let course;
    if (courseCode) {
      course = await CourseModel.findCourseByCode(courseCode);
    } else if (courseName) {
      course = await CourseModel.findCourseByName(courseName);
    }

    if (!course) throw new Error("找不到課程");

    [course.teachers, course.tas] = await Promise.all([
      CourseModel.getCourseTeachers(course.id),
      CourseModel.getCourseTAs(course.id),
    ]);
    return course;
  },

  async enrollCourse(studentIdentifier, courseCode) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const student = await AuthModel.getStudentById(studentIdentifier);
      if (!student) throw new Error("找不到學生");

      const course = await CourseModel.findCourseByCode(courseCode, connection);
      if (!course) throw new Error("找不到課程");

      // a withdrawn student re-joining by course code would silently undo the instructor's roster
      const status = await CourseModel.getEnrollmentStatus(student.id, course.id, connection);
      if (status === "withdrawn") throw new Error("你已被退選此課程，如需重新加入請聯絡授課老師");
      if (status) throw new Error("已經選過此課程");

      await CourseModel.enrollStudent(student.id, course.id, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getUserCourses(userId, role) {
    let userDbId;
    let courses;

    if (role === "student" || role === "ta") {
      const student = await AuthModel.getStudentById(userId);
      if (!student) throw new Error(`找不到 ${role}`);
      userDbId = student.id;
      courses = await CourseModel.getStudentCourses(userDbId);
    } else if (role === "teacher") {
      const teacher = await AuthModel.getTeacherById(userId);
      if (!teacher) throw new Error(`找不到 ${role}`);
      userDbId = teacher.id;
      courses = await CourseModel.getTeacherCourses(userDbId);
    } else {
      throw new Error("role 無效");
    }

    // 幫每堂課補上授課老師資訊
    for (const course of courses) {
      course.teachers = await CourseModel.getCourseTeachers(course.id);
    }
    return courses;
  },

  async getAllCourses() {
    const courses = await CourseModel.getAllCoursesWithCounts();
    for (const course of courses) {
      course.teachers = await CourseModel.getCourseTeachers(course.id);
    }
    return courses;
  },

  async getAllTeachers() {
    return CourseModel.getAllTeachers();
  },

  async getRoster(courseCode) {
    const course = await CourseModel.findCourseByCode(courseCode);
    if (!course) throw new Error("找不到課程");

    const [teachers, students] = await Promise.all([
      CourseModel.getCourseTeachers(course.id),
      CourseModel.getCourseRoster(course.id),
    ]);
    return {
      course: {
        course_code: course.course_code,
        course_name: course.course_name,
        academic_year: course.academic_year,
      },
      teachers,
      students,
    };
  },

  /**
   * Syncs the course roster to an Excel file: listed students are enrolled (or reactivated),
   * enrolled students missing from the file are marked withdrawn. Nothing is deleted.
   * Accounts are never created here; rows without an account are reported back.
   */
  async importRoster(courseCode, fileBuffer) {
    const course = await CourseModel.findCourseByCode(courseCode);
    if (!course) throw new Error("找不到課程");

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

      if (account.role === "student" || account.role === "ta") {
        const student = await AuthModel.getStudentById(account.username);
        if (!student) {
          skipped.push({ ...summary, reason: "帳號缺少學生資料" });
          continue;
        }
        studentsToEnroll.set(student.id, { ...summary, username: account.username, role: account.role });
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

    // an unrelated or empty sheet would otherwise withdraw the entire class
    if (studentsToEnroll.size === 0) {
      throw new Error("名單中沒有任何已建立帳號的學生。為避免整班被標記為退選，本次未做任何變更");
    }

    const added = [];
    const reactivated = [];
    const withdrawn = [];
    const teachersAdded = [];
    let unchanged = 0;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const current = new Map();
      for (const e of await CourseModel.getCourseEnrollmentsForUpdate(course.id, connection)) {
        const seen = current.get(e.student_id);
        // a student with duplicate enrollment rows counts as active if any row is active
        if (!seen || e.status === "active") current.set(e.student_id, e);
      }

      for (const [studentDbId, info] of studentsToEnroll) {
        const existing = current.get(studentDbId);
        if (!existing) {
          await CourseModel.enrollStudent(studentDbId, course.id, connection);
          added.push(info);
        } else if (existing.status === "withdrawn") {
          await CourseModel.setEnrollmentStatus(studentDbId, course.id, "active", connection);
          reactivated.push(info);
        } else {
          unchanged++;
        }
      }

      for (const [studentDbId, existing] of current) {
        if (existing.status !== "active" || studentsToEnroll.has(studentDbId)) continue;
        await CourseModel.setEnrollmentStatus(studentDbId, course.id, "withdrawn", connection);
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

    return { title, added, reactivated, unchanged, withdrawn, teachersAdded, skipped };
  },

  async createCourse({ teacher_id, course_name, course_code, description, academic_year }) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const existCourse = await CourseModel.findCourseByCode(course_code, connection);
      if (existCourse) throw new Error("課程代碼已存在");
      const courseId = await CourseModel.createCourse(course_name, course_code, description, academic_year, connection);
      if (teacher_id) {
        const teacher = await AuthModel.getTeacherById(teacher_id);
        if (!teacher) throw new Error("找不到該老師");
        await CourseModel.bindTeacherToCourse(teacher.id, courseId, connection);
      }
      const defaultPrompt = "你是一位大學課程助教，請用繁體中文回答，並使用 '\\n' 來換行，保持訊息條列與換行，不要用 HTML 標籤。";
      await CourseModel.createDefaultAiPrompt(courseId, defaultPrompt, connection);
      await connection.commit();
      return courseId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};