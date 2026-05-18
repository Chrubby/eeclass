import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import { HomeworkAiController } from "../controllers/homeworkAiController.js";

const router = express.Router();

const staff = requireRole("teacher", "ta");
const studentSide = requireRole("student", "ta");

router.get("/courses/:courseId/ai-prompts", staff, HomeworkAiController.getPrompts);
router.put("/courses/:courseId/ai-prompts", staff, HomeworkAiController.updatePrompts);

router.post("/submissions/:submissionId/ai-grade", staff, HomeworkAiController.gradeOverall);
router.post("/submissions/:submissionId/questions/:questionId/ai-grade", staff, HomeworkAiController.gradeQuestion);
router.post("/homeworks/:hwId/ai-grade-batch", staff, HomeworkAiController.batchGrade);

router.post("/homeworks/:hwId/self-estimate", studentSide, HomeworkAiController.selfEstimate);
router.post("/homeworks/:hwId/questions/:questionId/ai-chat", studentSide, HomeworkAiController.chatWithAi);

export default router;
