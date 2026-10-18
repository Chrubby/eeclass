import { pool } from "../config/db.js";

export const NotificationModel = {
  // 對課程所有修課學生建立通知（可排除發文者本人，例如助教）
  async createForCourseStudents(courseId, type, refId, title, message, excludeStudentDbId = null, conn = pool) {
    return conn.execute(
      `INSERT INTO notifications (student_id, course_id, type, ref_id, title, message)
       SELECT DISTINCT e.student_id, ?, ?, ?, ?, ?
       FROM enrollments e
       WHERE e.course_id = ? AND e.student_id <> ?
         AND COALESCE(e.role, 'student') <> 'dropped'`,
      [courseId, type, refId, title, message || "", courseId, excludeStudentDbId ?? 0]
    );
  },

  // 取得學生通知（含課程代碼，供前端導向）
  async listForStudent(studentDbId, limit = 20) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const [rows] = await pool.execute(
      `SELECT n.id, n.type, n.ref_id, n.title, n.message, n.is_read, n.created_at,
              c.course_code, c.course_name
       FROM notifications n
       LEFT JOIN courses c ON n.course_id = c.id
       WHERE n.student_id = ?
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT ${safeLimit}`,
      [studentDbId]
    );
    return rows;
  },

  async countUnread(studentDbId) {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM notifications WHERE student_id = ? AND is_read = FALSE",
      [studentDbId]
    );
    return Number(rows[0]?.cnt || 0);
  },

  async listForTeacher(teacherDbId, limit = 20) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const [rows] = await pool.execute(
      `SELECT n.id, n.type, n.ref_id, n.title, n.message, n.is_read, n.created_at,
              c.course_code, c.course_name
       FROM notifications n
       LEFT JOIN courses c ON n.course_id = c.id
       WHERE n.teacher_id = ?
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT ${safeLimit}`,
      [teacherDbId]
    );
    return rows;
  },

  async countUnreadForTeacher(teacherDbId) {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM notifications WHERE teacher_id = ? AND is_read = FALSE",
      [teacherDbId]
    );
    return Number(rows[0]?.cnt || 0);
  },

  async markAsReadForTeacher(teacherDbId, notificationId) {
    return pool.execute(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND teacher_id = ?",
      [notificationId, teacherDbId]
    );
  },

  async markAllAsReadForTeacher(teacherDbId) {
    return pool.execute(
      "UPDATE notifications SET is_read = TRUE WHERE teacher_id = ? AND is_read = FALSE",
      [teacherDbId]
    );
  },

  async insertForTeacher(conn, { teacherDbId, courseId, type, refId, title, message }) {
    return conn.execute(
      `INSERT INTO notifications (student_id, teacher_id, course_id, type, ref_id, title, message)
       VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
      [teacherDbId, courseId, type, refId, title, message || ""]
    );
  },

  async listEmailsForTeachers(teacherDbIds, conn = pool) {
    const ids = [...new Set(teacherDbIds.filter((id) => id != null))];
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const [rows] = await conn.execute(
      `SELECT DISTINCT a.email
       FROM teachers t
       JOIN accounts a ON a.username = t.teacher_id
       WHERE t.id IN (${placeholders})
         AND a.email IS NOT NULL
         AND TRIM(a.email) <> ''`,
      ids
    );
    return rows.map((row) => row.email);
  },

  async markAsRead(studentDbId, notificationId) {
    return pool.execute(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND student_id = ?",
      [notificationId, studentDbId]
    );
  },

  async markAllAsRead(studentDbId) {
    return pool.execute(
      "UPDATE notifications SET is_read = TRUE WHERE student_id = ? AND is_read = FALSE",
      [studentDbId]
    );
  },

  // 依來源物件標記已讀（例如學生在公告頁直接點開公告）
  async markAsReadByRef(studentDbId, type, refId) {
    return pool.execute(
      "UPDATE notifications SET is_read = TRUE WHERE student_id = ? AND type = ? AND ref_id = ?",
      [studentDbId, type, refId]
    );
  },

  // 修課學生中已填信箱者（排除發文者）
  async listEmailsForCourse(courseId, excludeStudentDbId = null, conn = pool) {
    const [rows] = await conn.execute(
      `SELECT DISTINCT a.email
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN accounts a ON a.username = s.student_id
       WHERE e.course_id = ?
         AND e.student_id <> ?
         AND COALESCE(e.role, 'student') <> 'dropped'
         AND a.email IS NOT NULL
         AND TRIM(a.email) <> ''`,
      [courseId, excludeStudentDbId ?? 0]
    );
    return rows.map((row) => row.email);
  },
};
