import { pool } from "../config/db.js";

export const AnnouncementModel = {
  // 取得課程公告（學生視角，包含已讀狀態）
  async getForStudent(courseId, studentDbId) {
    const [rows] = await pool.execute(
      `SELECT a.id, a.title, a.content, a.is_pinned, a.created_at, t.name AS teacher_name,
              CASE WHEN ar.id IS NULL THEN FALSE ELSE TRUE END AS is_read
       FROM announcements a
       LEFT JOIN teachers t ON a.teacher_id = t.id
       LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.student_id = ?
       WHERE a.course_id = ?
       ORDER BY a.is_pinned DESC, a.created_at DESC`,
      [studentDbId, courseId]
    );
    return rows;
  },

  // 取得課程公告（老師視角，全部預設已讀）
  async getForCourse(courseId) {
    const [rows] = await pool.execute(
      `SELECT a.id, a.title, a.content, a.is_pinned, a.created_at, t.name AS teacher_name, TRUE AS is_read
       FROM announcements a
       LEFT JOIN teachers t ON a.teacher_id = t.id
       WHERE a.course_id = ?
       ORDER BY a.is_pinned DESC, a.created_at DESC`,
      [courseId]
    );
    return rows;
  },

  // 記錄已讀
  async markAsRead(studentDbId, announcementId) {
    return pool.execute(
      "INSERT IGNORE INTO announcement_reads (student_id, announcement_id) VALUES (?, ?)",
      [studentDbId, announcementId]
    );
  },

  // 新增公告
  async create(courseId, teacherDbId, title, content, isPinned, conn = pool) {
    return conn.execute(
      `INSERT INTO announcements (course_id, teacher_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?)`,
      [courseId, teacherDbId, title, content || "", Boolean(isPinned)]
    );
  }
};