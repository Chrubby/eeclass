import { pool } from "../config/db.js";
import { CourseModel } from "../models/courseModel.js";
import { HomeworkModel } from "../models/homeworkModel.js";
import { NotificationModel } from "../models/notificationModel.js";
import { sendNotificationEmails } from "../utils/mailer.js";

const CHECK_INTERVAL_MS = 60 * 1000;
const warnedHomeworkIds = new Set();

function formatDeadline(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-TW", { hour12: false });
}

function warnOnce(homeworkId, reason) {
  const key = `${homeworkId}:${reason}`;
  if (warnedHomeworkIds.has(key)) return;
  warnedHomeworkIds.add(key);
  console.warn(`[homework-deadline] 作業 ${homeworkId} 略過批改通知：${reason}`);
}

async function notifyOneDueHomework(row) {
  const course = await CourseModel.findCourseByCode(row.course_code);
  if (!course) {
    warnOnce(row.id, "找不到對應課程");
    return false;
  }

  const teachers = await CourseModel.getCourseTeachers(course.id);
  const teacherIds = [...new Set(teachers.map((teacher) => teacher.id).filter((id) => id != null))];
  if (!teacherIds.length) {
    warnOnce(row.id, "課程沒有授課老師");
    return false;
  }

  const stats = await HomeworkModel.getHomeworkStats(row.id);
  const submitCount = Number(stats?.submitCount || 0);
  const when = formatDeadline(row.deadline);
  const title = `[${course.course_name}] 作業已截止，請批改：${row.title}`.slice(0, 255);
  const message = when
    ? `「${row.title}」已於 ${when} 截止，請前往批改。已繳交 ${submitCount} 份。`
    : `「${row.title}」已截止，請前往批改。已繳交 ${submitCount} 份。`;
  const linkPath = `/course/${row.course_code}/homework/${row.id}`;

  const conn = await pool.getConnection();
  let claimed = false;
  try {
    await conn.beginTransaction();
    const [claim] = await conn.execute(
      `UPDATE homeworks
       SET grade_notified_at = NOW()
       WHERE id = ? AND grade_notified_at IS NULL AND deadline IS NOT NULL AND deadline <= NOW()`,
      [row.id],
    );
    if (claim.affectedRows !== 1) {
      await conn.rollback();
      return false;
    }

    for (const teacherId of teacherIds) {
      await NotificationModel.insertForTeacher(conn, {
        teacherDbId: teacherId,
        courseId: course.id,
        type: "homework_grade",
        refId: String(row.id),
        title,
        message,
      });
    }
    await conn.commit();
    claimed = true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  if (!claimed) return false;

  const recipients = await NotificationModel.listEmailsForTeachers(teacherIds);
  sendNotificationEmails({
    recipients,
    subject: title,
    message,
    linkPath,
    courseName: course.course_name,
    headline: `作業已截止，請批改：${row.title}`,
  }).catch((error) => {
    console.error("[homework-deadline] 批改通知信寄送失敗", error?.message || error);
  });
  return true;
}

export async function notifyDueHomeworks() {
  const [rows] = await pool.query(
    `SELECT id, course_id AS course_code, title, deadline
     FROM homeworks
     WHERE deadline IS NOT NULL
       AND deadline <= NOW()
       AND grade_notified_at IS NULL`,
  );

  let notified = 0;
  for (const row of rows) {
    try {
      if (await notifyOneDueHomework(row)) notified += 1;
    } catch (error) {
      console.error(`[homework-deadline] 作業 ${row.id} 通知失敗`, error?.message || error);
    }
  }
  return { checked: rows.length, notified };
}

export function startHomeworkDeadlineNotifier() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await notifyDueHomeworks();
    } catch (error) {
      console.error("[homework-deadline]", error?.message || error);
    } finally {
      running = false;
    }
  };

  tick();
  return setInterval(tick, CHECK_INTERVAL_MS);
}
