import { NotificationModel } from "../models/notificationModel.js";
import { AuthModel } from "../models/authModel.js";
import { CourseModel } from "../models/courseModel.js";
import { pool } from "../config/db.js";
import { sendNotificationEmails } from "../utils/mailer.js";

export function previewText(text, max = 120) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
}

async function resolveStudentDbId(studentIdentifier) {
  const student = await AuthModel.getStudentById(studentIdentifier);
  return student?.id ?? null;
}

export const NotificationService = {
  async getNotifications(username, role, limit) {
    if (role === "teacher") {
      const teacher = await AuthModel.getTeacherById(username);
      if (!teacher) return { unread_count: 0, notifications: [] };
      const [notifications, unread_count] = await Promise.all([
        NotificationModel.listForTeacher(teacher.id, limit),
        NotificationModel.countUnreadForTeacher(teacher.id),
      ]);
      return { unread_count, notifications };
    }

    const studentDbId = await resolveStudentDbId(username);
    if (!studentDbId) return { unread_count: 0, notifications: [] };

    const [notifications, unread_count] = await Promise.all([
      NotificationModel.listForStudent(studentDbId, limit),
      NotificationModel.countUnread(studentDbId),
    ]);
    return { unread_count, notifications };
  },

  async markAsRead(username, role, notificationId) {
    if (role === "teacher") {
      const teacher = await AuthModel.getTeacherById(username);
      if (!teacher) throw new Error("找不到老師");
      await NotificationModel.markAsReadForTeacher(teacher.id, notificationId);
      return;
    }
    const studentDbId = await resolveStudentDbId(username);
    if (!studentDbId) throw new Error("找不到學生");
    await NotificationModel.markAsRead(studentDbId, notificationId);
  },

  async markAllAsRead(username, role) {
    if (role === "teacher") {
      const teacher = await AuthModel.getTeacherById(username);
      if (!teacher) throw new Error("找不到老師");
      await NotificationModel.markAllAsReadForTeacher(teacher.id);
      return;
    }
    const studentDbId = await resolveStudentDbId(username);
    if (!studentDbId) throw new Error("找不到學生");
    await NotificationModel.markAllAsRead(studentDbId);
  },

  async resolveExcludeStudentId(username) {
    if (!username) return null;
    const student = await AuthModel.getStudentById(username);
    return student?.id ?? null;
  },

  /**
   * 通知修課學生（站內＋信箱）。
   * 傳入 conn 時只寫入站內通知，呼叫端在交易提交後再 sendEmailPayload。
   */
  async notifyByCourseCode({
    courseCode,
    type,
    refId,
    headline,
    message = "",
    excludeUsername = null,
    linkPath = "",
    conn = null,
  }) {
    const db = conn || pool;
    const course = await CourseModel.findCourseByCode(courseCode, db);
    if (!course) {
      console.warn("[notify] 找不到課程", courseCode);
      return null;
    }

    const excludeStudentDbId = await this.resolveExcludeStudentId(excludeUsername);
    const title = `[${course.course_name}] ${headline}`.slice(0, 255);
    const body = message || "";

    await NotificationModel.createForCourseStudents(
      course.id,
      type,
      refId == null ? null : String(refId),
      title,
      body,
      excludeStudentDbId,
      db,
    );

    const emailPayload = {
      courseId: course.id,
      excludeStudentDbId,
      title,
      message: body,
      linkPath,
      courseName: course.course_name,
      headline,
    };
    if (!conn) this.sendEmailPayload(emailPayload);
    return emailPayload;
  },

  sendEmailPayload(payload) {
    if (!payload) return;
    setImmediate(() => {
      this.emailEnrolledStudents(payload).catch((err) => {
        console.error("[notify-email]", err?.message || err);
      });
    });
  },

  async emailEnrolledStudents({ courseId, excludeStudentDbId, title, message, linkPath, courseName, headline }) {
    const recipients = await NotificationModel.listEmailsForCourse(courseId, excludeStudentDbId);
    if (!recipients.length) return false;
    return sendNotificationEmails({
      recipients,
      subject: title,
      message: message || title,
      linkPath,
      courseName,
      headline,
    });
  },
};
