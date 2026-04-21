import { pool } from "../config/db.js";

export const homeworkAiModel = {
  // 取得特定課程的 AI Prompt 設定
  async getByCourseId(courseId) {
    const [rows] = await pool.execute(
      "SELECT chat_prompt, discussion_prompt, grading_prompt FROM course_ai_prompts WHERE course_id = ? ORDER BY updated_at DESC LIMIT 1",
      [courseId]
    );
    const row = rows[0] || {};
    return {
      discussion_prompt: (row.discussion_prompt || row.chat_prompt || "").trim(),
      grading_prompt: (row.grading_prompt || row.chat_prompt || "").trim(),
    };
  }
};