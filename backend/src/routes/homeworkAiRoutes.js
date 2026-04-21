import express from "express";
import { HomeworkAiController } from "../controllers/homeworkAiController.js";

const router = express.Router();

// ========================
// 老師：AI 預估評分操作
// ========================
// 整份預估
router.post("/submissions/:submissionId/ai-grade", HomeworkAiController.gradeOverall);
// 單題預估
router.post("/submissions/:submissionId/questions/:questionId/ai-grade", HomeworkAiController.gradeQuestion);
// 批次預估全班
router.post("/homeworks/:hwId/ai-grade-batch", HomeworkAiController.batchGrade);

// ========================
// 學生：AI 互動操作
// ========================
// 學生自行觸發預估評分
router.post("/homeworks/:hwId/self-estimate", HomeworkAiController.selfEstimate);
// 學生與 AI 助教對話解惑
router.post("/homeworks/:hwId/questions/:questionId/ai-chat", HomeworkAiController.chatWithAi);

export default router;