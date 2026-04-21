import { pool } from "../config/db.js";

export const DiscussionModel = {
  async getRoomsByCourseId(courseId) {
    const [rows] = await pool.execute(
      `SELECT id, title, created_at as date, '教授' as author 
       FROM discussion_rooms WHERE course_id = ? ORDER BY created_at DESC`,
      [courseId]
    );
    return rows;
  },

  async createRoom(courseId, title, content, aiPrompt, filePath) {
    return pool.execute(
      "INSERT INTO discussion_rooms (course_id, title, content, ai_prompt, file_path) VALUES (?, ?, ?, ?, ?)",
      [courseId, title, content || "", aiPrompt || "", filePath]
    );
  },

  async deleteRoom(roomId) {
    return pool.execute("DELETE FROM discussion_rooms WHERE id = ?", [roomId]);
  },

  async getRoomById(roomId) {
    const [rows] = await pool.execute(
      "SELECT id, title, content, ai_prompt, file_path FROM discussion_rooms WHERE id = ?", 
      [roomId]
    );
    return rows[0];
  },

  async getThreadsByRoomId(roomId) {
    const [rows] = await pool.execute(`
      SELECT t.*, 
             IFNULL(a.role, 'ai') as role,
             CASE WHEN t.student_id = 'AI' THEN 'AI 助教'
                  WHEN a.role = 'teacher' THEN (SELECT name FROM teachers WHERE teacher_id = a.username LIMIT 1)
                  ELSE (SELECT name FROM students WHERE student_id = a.username LIMIT 1)
             END as author_name
      FROM threads t
      LEFT JOIN accounts a ON t.student_id != 'AI' AND t.student_id = a.id
      WHERE t.room_id = ?
      ORDER BY t.created_at ASC
    `, [roomId]);
    return rows;
  },

  async createThread(roomId, studentDbId, content, parentThreadId) {
    const [result] = await pool.execute(
      "INSERT INTO threads (room_id, student_id, content, parent_thread_id) VALUES (?, ?, ?, ?)",
      [roomId, studentDbId, content, parentThreadId || null]
    );
    return result.insertId;
  },

  // 取得單一留言的父層資訊 (供 AI 追溯歷史紀錄使用)
  async getParentThreadInfo(threadId) {
    const [rows] = await pool.execute(`
      SELECT t.parent_thread_id, t.content, t.student_id, a.role as acc_role
      FROM threads t
      LEFT JOIN accounts a ON t.student_id != 'AI' AND t.student_id = a.id
      WHERE t.id = ?`,
      [threadId]
    );
    return rows[0];
  }
};