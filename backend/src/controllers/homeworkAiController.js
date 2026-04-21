import { HomeworkAiService } from "../services/homeworkAiService.js";
import { CourseAiModel } from "../models/courseAiModel.js";
import { HomeworkModel } from "../models/homeworkModel.js";
import { appendSubmissionHistory } from "../utils/dbHistoryLogger.js";
import { pool } from "../config/db.js";

export const HomeworkAiController = {
  // ==============================
  // 1. Prompt 設定管理 (老師)
  // ==============================
  async getPrompts(req, res) {
    try {
      const { courseId } = req.params;
      const prompts = await CourseAiModel.getPromptsByCourseId(courseId);
      res.json(prompts);
    } catch (err) {
      res.status(500).json({ message: "取得 Prompt 失敗" });
    }
  },

  async updatePrompts(req, res) {
    const { courseId } = req.params;
    const { chat_prompt, discussion_prompt, grading_prompt, role, send_announcements, send_assignments, send_student_info } = req.body;
    
    if (role !== "teacher") return res.status(403).json({ message: "權限不足" });

    try {
      const data = {
        chat_prompt: chat_prompt,
        discussion: (discussion_prompt || chat_prompt || "").trim(),
        grading: (grading_prompt || chat_prompt || "").trim(),
        send_announcements: !!send_announcements,
        send_assignments: !!send_assignments,
        send_student_info: !!send_student_info
      };
      await CourseAiModel.upsertPrompts(pool, courseId, data);
      res.json({ message: "Prompt 更新成功" });
    } catch (err) {
      res.status(500).json({ message: "更新失敗" });
    }
  },

  // ==============================
  // 2. 老師 AI 預估評分操作
  // ==============================
  
  // 老師：整份作業 AI 評估
  async gradeOverall(req, res) {
    try {
      const { submissionId } = req.params;
      const { homeworkId } = req.body;
      const out = await HomeworkAiService.runAiGradeAllQuestions(submissionId, homeworkId);
      
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

  // ==============================
  // 3. 學生 AI 互動操作
  // ==============================

  // 學生：自我預估評分
  async selfEstimate(req, res) {
    try {
      const { hwId } = req.params;
      const { studentId } = req.body;
      const sub = await HomeworkModel.getStudentSubmission(hwId, studentId);
      
      if (!sub) return res.status(404).json({ message: "找不到繳交紀錄" });

      const out = await HomeworkAiService.runAiGradeAllQuestions(sub.id, hwId);
      
      await pool.execute(
        "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [out.suggested_score, out.reason, sub.id]
      );
      await appendSubmissionHistory(sub.id, "student_self_estimate", { 
        suggested_score: out.suggested_score, 
        reason: out.reason 
      });
      
      res.json(out);
    } catch (err) {
      res.status(500).json({ message: "預估失敗" });
    }
  },

  // 學生：作業單題解惑對話
  async chatWithAi(req, res) {
    try {
      const { hwId, questionId } = req.params;
      const { messages } = req.body;
      
      const reply = await HomeworkAiService.chatWithTutor(hwId, questionId, messages);
      res.json({ reply });
    } catch (err) {
      res.status(500).json({ message: "AI 對話失敗" });
    }
  }
};