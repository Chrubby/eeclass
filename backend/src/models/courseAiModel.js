import { pool } from "../config/db.js";

export const CourseAiModel = {
  // --- Prompt 設定相關 ---
  async getPromptsByCourseId(courseId) {
    const [rows] = await pool.execute(
      "SELECT chat_prompt, discussion_prompt, grading_prompt, send_announcements, send_assignments, send_student_info FROM course_ai_prompts WHERE course_id = ? ORDER BY updated_at DESC LIMIT 1",
      [courseId]
    );
    const row = rows[0] || {};
    return {
      chat_prompt: row.chat_prompt || "",
      discussion_prompt: (row.discussion_prompt || row.chat_prompt || "").trim(),
      grading_prompt: (row.grading_prompt || row.chat_prompt || "").trim(),
      send_announcements: !!row.send_announcements,
      send_assignments: !!row.send_assignments,
      send_student_info: !!row.send_student_info
    };
  },

  async getPromptsByCourseCode(courseCode) {
    const [rows] = await pool.execute(
      `SELECT p.* FROM course_ai_prompts p 
       JOIN courses c ON c.id = p.course_id 
       WHERE c.course_code = ? LIMIT 1`,
      [courseCode]
    );
    return rows[0] || null;
  },

  async upsertPrompts(connection, courseId, data) {
    const [rows] = await connection.execute(
      "SELECT id FROM course_ai_prompts WHERE course_id = ?", [courseId]
    );

    if (rows.length > 0) {
      await connection.execute(
        `UPDATE course_ai_prompts SET chat_prompt = ?, discussion_prompt = ?, grading_prompt = ?, 
         send_announcements = ?, send_assignments = ?, send_student_info = ? WHERE course_id = ?`,
        [data.chat_prompt, data.discussion, data.grading, data.send_announcements, data.send_assignments, data.send_student_info, courseId]
      );
    } else {
      await connection.execute(
        `INSERT INTO course_ai_prompts (course_id, chat_prompt, discussion_prompt, grading_prompt, 
         send_announcements, send_assignments, send_student_info) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [courseId, data.chat_prompt, data.discussion, data.grading, data.send_announcements, data.send_assignments, data.send_student_info]
      );
    }
  },

  // --- 聊天紀錄相關 ---
  async saveMessage(courseId, studentId, role, message) {
    await pool.execute(
      "INSERT INTO ai_chat_messages (course_id, student_id, role, message) VALUES (?, ?, ?, ?)",
      [courseId, studentId, role, message]
    );
  },

  async getChatHistory(courseId, studentId, limit = 10) {
    const [rows] = await pool.execute(
      "SELECT role, message, created_at FROM ai_chat_messages WHERE course_id = ? AND student_id = ? ORDER BY created_at ASC LIMIT ?",
      [courseId, studentId, limit]
    );
    return rows;
  }
};