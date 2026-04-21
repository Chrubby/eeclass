import express from "express";
import { HomeworkAiController } from "../controllers/homeworkAiController.js";

const router = express.Router();

// --- Prompt 管理 (老師端) ---
router.get("/courses/:courseId/ai-prompts", HomeworkAiController.getPrompts);
router.put("/courses/:courseId/ai-prompts", HomeworkAiController.updatePrompts);

// --- AI 評分操作 (老師端) ---
router.post("/submissions/:submissionId/ai-grade", HomeworkAiController.gradeOverall);
router.post("/submissions/:submissionId/questions/:questionId/ai-grade", HomeworkAiController.gradeQuestion);
router.post("/homeworks/:hwId/ai-grade-batch", HomeworkAiController.batchGrade);

// --- AI 互動 (學生端) ---
router.post("/homeworks/:hwId/self-estimate", HomeworkAiController.selfEstimate);
router.post("/homeworks/:hwId/questions/:questionId/ai-chat", HomeworkAiController.chatWithAi);

export default router;