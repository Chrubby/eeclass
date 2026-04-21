import { pool } from "../config/db.js";
import { HomeworkAiService } from "../services/homeworkAiService.js";
import { appendSubmissionHistory } from "../utils/dbHistoryLogger.js";

export const HomeworkAiController = {
  // 老師：整份作業 AI 評估
  async gradeOverall(req, res) {
    try {
      const { submissionId } = req.params;
      const { homeworkId } = req.body;
      const out = await HomeworkAiService.runAiGradeOverall(submissionId, homeworkId);
      
      await pool.execute(
        "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [out.suggested_score, out.reason || "", submissionId]
      );
      await appendSubmissionHistory(submissionId, "ai_suggestion", {
        mode: "overall",
        suggested_score: out.suggested_score,
        reason: out.reason,
        feedback: out.feedback,
      });
      res.json(out);
    } catch (err) {
      res.status(500).json({ message: err.message || "AI 評估失敗" });
    }
  },

  // 老師：單題 AI 評估
  async gradeQuestion(req, res) {
    try {
      const { submissionId, questionId } = req.params;
      const { homeworkId } = req.body;
      const out = await HomeworkAiService.runAiGradeQuestion(submissionId, homeworkId, questionId);
      
      await pool.execute(
        "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [out.suggested_score, out.reason || "", submissionId]
      );
      await appendSubmissionHistory(submissionId, "ai_suggestion", {
        mode: "question",
        questionId,
        suggested_score: out.suggested_score,
        max_score: out.max_score,
        reason: out.reason,
      });
      res.json(out);
    } catch (err) {
      res.status(500).json({ message: err.message || "單題 AI 評估失敗" });
    }
  },

  // 老師：一鍵全班批次預估
  async batchGrade(req, res) {
    try {
      const { hwId } = req.params;
      const [subRows] = await pool.execute("SELECT id, student_id as studentId FROM homework_submissions WHERE homework_id = ?", [hwId]);
      const results = [];

      for (const row of subRows) {
        try {
          const out = await HomeworkAiService.runAiGradeAllQuestions(row.id, Number(hwId));
          await pool.execute(
            "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [out.suggested_score, out.reason || "", row.id]
          );
          await appendSubmissionHistory(row.id, "ai_suggestion", {
            mode: "batch",
            suggested_score: out.suggested_score,
            reason: out.reason,
            perQuestion: out.perQuestion || [],
          });
          results.push({ submissionId: row.id, studentId: row.studentId, ...out });
        } catch (e) {
          results.push({ submissionId: row.id, studentId: row.studentId, error: e.message });
        }
      }
      res.json({ results });
    } catch (err) {
      res.status(500).json({ message: err.message || "批次預估失敗" });
    }
  },

  // 學生：自我預估評分
  async selfEstimate(req, res) {
    try {
      const { hwId } = req.params;
      const { studentId } = req.body;
      
      const [rows] = await pool.execute(
        "SELECT id FROM homework_submissions WHERE homework_id = ? AND student_id = ?",
        [hwId, studentId]
      );
      if (!rows.length) return res.status(404).json({ message: "尚未找到你的繳交紀錄" });
      
      const submissionId = rows[0].id;
      const out = await HomeworkAiService.runAiGradeAllQuestions(submissionId, Number(hwId));
      
      await pool.execute(
        "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [out.suggested_score, out.reason || "", submissionId]
      );
      await appendSubmissionHistory(submissionId, "student_self_estimate", {
        studentId,
        suggested_score: out.suggested_score,
        reason: out.reason,
        perQuestion: out.perQuestion || [],
      });
      res.json({ submissionId, ...out });
    } catch (err) {
      res.status(500).json({ message: err.message || "自我預估失敗" });
    }
  },

  // 學生：與 AI 助教對話 (針對特定題目)
  async chatWithAi(req, res) {
    try {
      const { hwId, questionId } = req.params;
      const { messages } = req.body; // 注意：前端現在不需要傳 question_id 和 homework_id 了
      
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "缺少對話紀錄 messages" });
      }

      const reply = await HomeworkAiService.chatWithTutor(hwId, questionId, messages);
      res.json({ reply });
    } catch (err) {
      res.status(500).json({ message: err.message || "AI 對話失敗" });
    }
  }
};