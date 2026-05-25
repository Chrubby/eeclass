import { pool } from "../config/db.js";

export const HomeworkModel = {
  // 建立作業主檔 (需傳入 connection 以支援 Transaction)
  async createHomework(connection, courseId, title, deadline, description) {
    const [result] = await connection.execute(
      "INSERT INTO homeworks (course_id, title, deadline, description, attachments_json) VALUES (?, ?, ?, ?, ?)",
      [courseId, title, deadline, description || '', "[]"]
    );
    return result.insertId;
  },

  async updateHomeworkAttachments(connection, hwId, attachmentsJson) {
    await connection.execute(
      "UPDATE homeworks SET attachments_json = ? WHERE id = ?",
      [attachmentsJson, hwId]
    );
  },

  async updateHomeworkById(connection, hwId, { title, deadline, description }) {
    await connection.execute(
      "UPDATE homeworks SET title = ?, deadline = ?, description = ? WHERE id = ?",
      [title, deadline, description, hwId]
    );
  },

  async deleteSubmissionsByHomeworkId(hwId) {
    await pool.execute("DELETE FROM homework_submissions WHERE homework_id = ?", [hwId]);
  },

  async deleteQuestionsByHomeworkId(connection, hwId) {
    const sql = "DELETE FROM homework_questions WHERE homework_id = ?";
    if (connection) {
      await connection.execute(sql, [hwId]);
    } else {
      await pool.execute(sql, [hwId]);
    }
  },

  async deleteHomeworkById(hwId) {
    await pool.execute("DELETE FROM homeworks WHERE id = ?", [hwId]);
  },

  // 建立作業子題
  async createQuestions(connection, hwId, questions) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await connection.execute(
        `INSERT INTO homework_questions
        (homework_id, question_order, title, description, answer_format, has_attachment, ai_prompt, discussion_prompt)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          hwId,
          i + 1,
          q.title,
          q.description || "",
          q.answerFormat,
          q.aiPrompt || q.ai_prompt || q.gradingPrompt || "",
          q.discussionPrompt || q.discussion_prompt || "",
        ]
      );
    }
  },

  async getHomeworksByCourse(courseId) {
    const [rows] = await pool.execute(
      "SELECT id, title, deadline, description FROM homeworks WHERE course_id = ? ORDER BY id DESC",
      [courseId]
    );
    return rows;
  },

  async getHomeworkById(hwId) {
    const [rows] = await pool.execute("SELECT * FROM homeworks WHERE id = ?", [hwId]);
    return rows[0] || null;
  },

  async getQuestionsByHomework(hwId) {
    const [rows] = await pool.execute(
      "SELECT * FROM homework_questions WHERE homework_id = ? ORDER BY question_order",
      [hwId]
    );
    return rows;
  },

  // 學生端：取得繳交紀錄
  async getStudentSubmission(hwId, studentId) {
    const [rows] = await pool.execute(
      `
      SELECT
        id,
        answer_text,
        file_name,
        file_path,
        score,
        feedback,
        graded_details,
        is_submitted
      FROM homework_submissions
      WHERE homework_id = ? AND student_id = ?
      `,
      [hwId, studentId]
    );
    return rows[0] || null;
  },

  // 老師端：取得該作業所有學生的繳交狀況與評分狀態（僅計入正式繳交）
  async getHomeworkStats(hwId) {
    const [rows] = await pool.execute(
      `SELECT
         SUM(CASE WHEN is_submitted = 1 THEN 1 ELSE 0 END) as submitCount,
         SUM(CASE WHEN is_submitted = 1 AND score IS NOT NULL THEN 1 ELSE 0 END) as gradedCount
       FROM homework_submissions
       WHERE homework_id = ?`,
      [hwId]
    );
    return rows[0];
  },

  /**
   * 學生繳交作業 (Upsert)：
   * - 未提供新檔案時，沿用原本的 file_name / file_path（COALESCE）
   * - 一律將 is_submitted 設為 1，並更新 submitted_at
   */
  async upsertSubmission(hwId, studentId, answerText, correctFileName, filePath) {
    const sql = `
      INSERT INTO homework_submissions (homework_id, student_id, answer_text, file_name, file_path, is_submitted)
      VALUES (?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        answer_text = VALUES(answer_text),
        file_name = COALESCE(VALUES(file_name), file_name),
        file_path = COALESCE(VALUES(file_path), file_path),
        is_submitted = 1,
        submitted_at = CURRENT_TIMESTAMP
    `;
    await pool.execute(sql, [
      hwId, studentId, answerText || null, correctFileName, filePath
    ]);

    const [rows] = await pool.execute(
      "SELECT id FROM homework_submissions WHERE homework_id = ? AND student_id = ?",
      [hwId, studentId]
    );
    return rows[0]?.id;
  },

  /** 學生收回作業：保留作答內容與檔案，僅標記為未繳交 */
  async markSubmissionUnsubmitted(hwId, studentId) {
    await pool.execute(
      "UPDATE homework_submissions SET is_submitted = 0 WHERE homework_id = ? AND student_id = ?",
      [hwId, studentId]
    );
  },

  async deleteSubmission(hwId, studentId) {
    await pool.execute(
      "DELETE FROM homework_submissions WHERE homework_id = ? AND student_id = ?",
      [hwId, studentId]
    );
  },

  // 老師端：取得單一作業的所有繳交清單
  async getSubmissionsList(hwId) {
    // 舊查詢（保留參考）：包含 ai_estimated_score、ai_estimated_at 等欄位
    // const [rows] = await pool.execute(
    //   "SELECT id, student_id as studentId, submitted_at as submittedAt, score, feedback, ai_estimated_score as aiEstimatedScore, ai_estimated_at as aiEstimatedAt FROM homework_submissions WHERE homework_id = ?",
    //   [hwId]
    // );
    const [rows] = await pool.execute(
      `
      SELECT
        id,
        student_id as studentId,
        submitted_at as submittedAt,
        score,
        feedback
      FROM homework_submissions
      WHERE homework_id = ? AND is_submitted = 1
      `,
      [hwId]
    );
    return rows;
  },

  // 老師端：取得單一繳交的詳細內容
  async getSubmissionDetail(submissionId) {
    const [rows] = await pool.execute(
      `SELECT hs.*, hs.student_id as studentId, hs.submitted_at as submittedAt, hs.answer_text as answerText,
              h.title as homeworkTitle
       FROM homework_submissions hs
       JOIN homeworks h ON h.id = hs.homework_id
       WHERE hs.id = ?`,
      [submissionId]
    );
    return rows[0] || null;
  },

  // 老師批改評分寫入
  async updateGrade(submissionId, score, feedback, gradedDetails) {
    await pool.execute(
      "UPDATE homework_submissions SET score = ?, feedback = ?, graded_details = ?, graded_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        score ?? null,
        feedback ?? null,
        gradedDetails ? JSON.stringify(gradedDetails) : null,
        submissionId
      ]
    );
  },

  // 取得歷程紀錄
  async getSubmissionHistoryLogs(submissionId) {
    const [rows] = await pool.execute(
      "SELECT id, event_type as eventType, payload_json as payloadJson, created_at as createdAt FROM homework_submission_histories WHERE submission_id = ? ORDER BY created_at DESC",
      [submissionId]
    );
    return rows;
  }
};