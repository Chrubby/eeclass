import { pool } from "../config/db.js";

export const AiModel = {
  // === Prompt 相關 ===
  async getPromptsByCourseId(courseId) {
    const [rows] = await pool.execute(
      `SELECT chat_prompt, discussion_prompt, grading_prompt, 
              send_announcements, send_assignments, send_student_info 
       FROM course_ai_prompts WHERE course_id = ? ORDER BY updated_at DESC LIMIT 1`,
      [courseId]
    );
    return rows[0] || null;
  },

  async upsertPrompts(connection, courseId, data) {
    const [rows] = await connection.execute("SELECT id FROM course_ai_prompts WHERE course_id = ?", [courseId]);
    if (rows.length > 0) {
      await connection.execute(
        `UPDATE course_ai_prompts SET chat_prompt = ?, discussion_prompt = ?, grading_prompt = ? WHERE course_id = ?`,
        [data.discussion, data.discussion, data.grading, courseId]
      );
    } else {
      await connection.execute(
        `INSERT INTO course_ai_prompts (course_id, chat_prompt, discussion_prompt, grading_prompt) VALUES (?, ?, ?, ?)`,
        [courseId, data.discussion, data.discussion, data.grading]
      );
    }
  },

  // === 聊天紀錄相關 ===
  async saveChatMessage(courseId, studentId, role, message) {
    await pool.execute(
      "INSERT INTO ai_chat_messages (course_id, student_id, role, message) VALUES (?, ?, ?, ?)",
      [courseId, studentId, role, message]
    );
  },

  async getChatHistory(courseId, studentId, limit = 10) {
    const [rows] = await pool.execute(
      "SELECT role, message FROM ai_chat_messages WHERE course_id = ? AND student_id = ? ORDER BY created_at ASC LIMIT ?",
      [courseId, studentId, limit]
    );
    return rows.map(r => ({ role: r.role, content: r.message }));
  },

  // === RAG 背景資料抓取 (用於全域助教) ===
  async getLatestAnnouncements(courseId, limit = 5) {
    const [rows] = await pool.execute(
      "SELECT title, content FROM announcements WHERE course_id = ? ORDER BY created_at DESC LIMIT ?",
      [courseId, limit]
    );
    return rows;
  }
};