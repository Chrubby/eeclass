import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import { CourseAiController } from "../controllers/courseAiController.js";

const router = express.Router();

const studentSide = requireRole("student", "ta");

router.post("/ai-assistant/ask", studentSide, CourseAiController.askAi);
router.post("/ai-assistant/remind", studentSide, CourseAiController.remindHomework);
router.get("/ai-assistant/history/:courseCode/:studentCode", studentSide, CourseAiController.getHistory);

export default router;
