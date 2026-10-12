import { HomeworkAiService } from "../services/homeworkAiService.js";
import { CourseAiModel } from "../models/courseAiModel.js";
import { HomeworkModel } from "../models/homeworkModel.js";
import { appendSubmissionHistory } from "../utils/dbHistoryLogger.js";
import { pool } from "../config/db.js";

function sendAiError(res, error, fallback) {
  const msg = error?.message || "";
  if (msg.startsWith("找不到")) return res.status(404).json({ message: msg });
  if (msg.includes("OPENAI_API_KEY")) return res.status(503).json({ message: "尚未設定 OpenAI 金鑰" });
  console.error("[homework-ai]", msg || error);
  res.status(500).json({ message: fallback });
}

export const HomeworkAiController = {
  async getPrompts(req, res) {
    try {
      const { courseId } = req.params;
      const prompts = await CourseAiModel.getPromptsByCourseCode(courseId);
      res.json(prompts);
    } catch {
      res.status(500).json({ message: "取得 Prompt 失敗" });
    }
  },

  async updatePrompts(req, res) {
    const { courseId } = req.params;
    const {
      chat_prompt,
      discussion_prompt,
      grading_prompt,
      send_announcements,
      send_assignments,
      send_student_info,
      send_grades,
    } = req.body;

    try {
      const data = {
        chat_prompt: chat_prompt,
        discussion: (discussion_prompt || chat_prompt || "").trim(),
        grading: (grading_prompt || chat_prompt || "").trim(),
        send_announcements: !!send_announcements,
        send_assignments: !!send_assignments,
        send_student_info: !!send_student_info,
        send_grades: !!send_grades,
      };
      await CourseAiModel.upsertPrompts(pool, courseId, data);
      res.json({ message: "Prompt 更新成功" });
    } catch {
      res.status(500).json({ message: "更新失敗" });
    }
  },

  async gradeOverall(req, res) {
    try {
      const { submissionId } = req.params;
      const { homeworkId } = req.body;
      const out = await HomeworkAiService.runAiGradeAllQuestions(submissionId, homeworkId);

      await pool.execute(
        "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [out.suggested_score, out.reason || "", submissionId],
      );
      await appendSubmissionHistory(submissionId, "ai_suggestion", {
        mode: "overall",
        suggested_score: out.suggested_score,
        reason: out.reason,
        perQuestion: out.perQuestion || [],
      });
      res.json(out);
    } catch (error) {
      sendAiError(res, error, "AI 評估失敗");
    }
  },

  async gradeQuestion(req, res) {
    try {
      const { submissionId, questionId } = req.params;
      const { homeworkId } = req.body;
      const out = await HomeworkAiService.runAiGradeQuestion(submissionId, homeworkId, questionId);

      // 單題建議只記在歷程，不覆蓋整份作業的 AI 預估總分
      await appendSubmissionHistory(submissionId, "ai_suggestion", {
        mode: "question",
        questionId,
        suggested_score: out.suggested_score,
        max_score: out.max_score,
        reason: out.reason,
      });
      res.json(out);
    } catch (error) {
      sendAiError(res, error, "單題 AI 評估失敗");
    }
  },

  async batchGrade(req, res) {
    try {
      const { hwId } = req.params;
      const [subRows] = await pool.execute(
        "SELECT id, student_id as studentId FROM homework_submissions WHERE homework_id = ? AND is_submitted = 1",
        [hwId],
      );
      const results = [];

      for (const row of subRows) {
        try {
          const out = await HomeworkAiService.runAiGradeAllQuestions(row.id, Number(hwId));
          await pool.execute(
            "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [out.suggested_score, out.reason || "", row.id],
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
    } catch {
      res.status(500).json({ message: "批次預估失敗" });
    }
  },

  async selfEstimate(req, res) {
    try {
      const { hwId } = req.params;
      const studentId = req.user.username;
      const sub = await HomeworkModel.getStudentSubmission(hwId, studentId);

      if (!sub || !sub.is_submitted) {
        return res.status(404).json({ message: "請先送出作業後再進行預估評分" });
      }

      const out = await HomeworkAiService.runAiGradeAllQuestions(sub.id, hwId);

      await pool.execute(
        "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [out.suggested_score, out.reason, sub.id],
      );
      await appendSubmissionHistory(sub.id, "student_self_estimate", {
        suggested_score: out.suggested_score,
        reason: out.reason,
      });

      res.json(out);
    } catch {
      res.status(500).json({ message: "預估失敗" });
    }
  },

  async chatWithAi(req, res) {
    try {
      const { hwId, questionId } = req.params;
      const { messages } = req.body;

      const reply = await HomeworkAiService.chatWithTutor(hwId, questionId, messages);
      res.json({ reply });
    } catch (error) {
      sendAiError(res, error, "AI 對話失敗");
    }
  },
};
