import { pool } from "../config/db.js"; 

export const appendSubmissionHistory = async (submissionId, eventType, payloadObj) => {
  if (!submissionId) return;
  try {
    await pool.execute(
      "INSERT INTO homework_submission_histories (submission_id, event_type, payload_json) VALUES (?, ?, ?)",
      [submissionId, eventType, JSON.stringify(payloadObj || {})]
    );
  } catch (err) {
    console.error("寫入繳交歷程失敗:", err);
  }
};