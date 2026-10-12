import { pool } from "../config/db.js";

export const DiscussionModel = {
  async getRoomsByCourseId(courseId) {
    const [rows] = await pool.execute(
      `SELECT r.id, r.title, r.created_at as date,
              COALESCE(
                (SELECT name FROM teachers WHERE teacher_id = r.created_by LIMIT 1),
                (SELECT name FROM students WHERE student_id = r.created_by LIMIT 1),
                (
                  SELECT COALESCE(tchr.name, stu.name, acc.username)
                  FROM threads th
                  LEFT JOIN accounts acc
                    ON th.student_id <> 'AI'
                   AND CAST(acc.id AS CHAR) = th.student_id
                  LEFT JOIN teachers tchr ON tchr.teacher_id = acc.username
                  LEFT JOIN students stu ON stu.student_id = acc.username
                  WHERE th.room_id = r.id AND th.parent_thread_id IS NULL AND th.student_id <> 'AI'
                  ORDER BY th.created_at ASC
                  LIMIT 1
                ),
                r.created_by,
                '未知'
              ) AS author
       FROM discussion_rooms r
       WHERE r.course_id = ?
       ORDER BY r.created_at DESC`,
      [courseId]
    );
    return rows;
  },

  async createRoom(courseId, title, content, aiPrompt, filePath, createdBy = null) {
    const [result] = await pool.execute(
      "INSERT INTO discussion_rooms (course_id, title, content, ai_prompt, file_path, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [courseId, title, content || "", aiPrompt || "", filePath, createdBy]
    );
    return result.insertId;
  },

  async deleteRoom(roomId) {
    return pool.execute("DELETE FROM discussion_rooms WHERE id = ?", [roomId]);
  },

  async getRoomById(roomId) {
    const [rows] = await pool.execute(
      `SELECT r.id, r.title, r.content, r.ai_prompt, r.file_path, r.course_id,
              c.course_code, c.course_name
       FROM discussion_rooms r
       LEFT JOIN courses c ON c.id = r.course_id
       WHERE r.id = ?`,
      [roomId]
    );
    return rows[0];
  },

  async getThreadsByRoomId(roomId) {
    const [rows] = await pool.execute(`
      SELECT t.*, 
             -- 助教是課程層級身分，要看留言者在這個討論區所屬課程的身分
             CASE WHEN EXISTS (
               SELECT 1 FROM enrollments e
               JOIN students s ON s.id = e.student_id
               JOIN discussion_rooms dr ON dr.id = t.room_id
               WHERE s.student_id = a.username AND e.course_id = dr.course_id AND e.role = 'ta'
             ) THEN 'ta' ELSE IFNULL(a.role, 'ai') END as role,
             a.username as author_username,
             CASE WHEN t.student_id = 'AI' THEN 'AI 助教'
                  WHEN a.role = 'teacher' THEN (SELECT name FROM teachers WHERE teacher_id = a.username LIMIT 1)
                  ELSE (SELECT name FROM students WHERE student_id = a.username LIMIT 1)
             END as author_name
      FROM threads t
      LEFT JOIN accounts a ON t.student_id <> 'AI' AND CAST(a.id AS CHAR) = t.student_id
      WHERE t.room_id = ?
      ORDER BY t.created_at ASC
    `, [roomId]);
    return rows;
  },

  async getThreadById(threadId) {
    const [rows] = await pool.execute(
      `SELECT t.id, t.room_id, t.student_id, t.content, a.username AS author_username, a.role
       FROM threads t
       LEFT JOIN accounts a ON t.student_id <> 'AI' AND CAST(a.id AS CHAR) = t.student_id
       WHERE t.id = ?`,
      [threadId],
    );
    return rows[0] || null;
  },

  async updateThreadContent(threadId, content) {
    await pool.execute("UPDATE threads SET content = ? WHERE id = ?", [content, threadId]);
  },

  async deleteThread(threadId) {
    await pool.execute("DELETE FROM threads WHERE id = ?", [threadId]);
  },

  async updateRoom(roomId, { title, content, aiPrompt, filePath, clearFile }) {
    const room = await this.getRoomById(roomId);
    if (!room) return;
    await pool.execute(
      `UPDATE discussion_rooms
       SET title = ?, content = ?, ai_prompt = ?, file_path = ?
       WHERE id = ?`,
      [
        title ?? room.title,
        content ?? room.content,
        aiPrompt ?? room.ai_prompt,
        clearFile ? null : filePath || room.file_path,
        roomId,
      ],
    );
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
      SELECT t.parent_thread_id, t.content, t.student_id,
             CASE WHEN EXISTS (
               SELECT 1 FROM enrollments e
               JOIN students s ON s.id = e.student_id
               JOIN discussion_rooms dr ON dr.id = t.room_id
               WHERE s.student_id = a.username AND e.course_id = dr.course_id AND e.role = 'ta'
             ) THEN 'ta' ELSE a.role END as acc_role
      FROM threads t
      LEFT JOIN accounts a ON t.student_id <> 'AI' AND CAST(a.id AS CHAR) = t.student_id
      WHERE t.id = ?`,
      [threadId]
    );
    return rows[0];
  }
};