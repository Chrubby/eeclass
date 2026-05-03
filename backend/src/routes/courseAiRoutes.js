import express from "express";
import { CourseAiController } from "../controllers/courseAiController.js";

const router = express.Router();

// 聊天與提醒
router.post("/ai-assistant/ask", CourseAiController.askAi);
router.post("/ai-assistant/remind", CourseAiController.remindHomework);
router.get("/ai-assistant/history/:courseCode/:studentCode", CourseAiController.getHistory);
export default router;