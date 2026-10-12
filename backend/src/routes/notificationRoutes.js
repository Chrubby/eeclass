import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import { NotificationController } from "../controllers/notificationController.js";

const router = express.Router();

const notifyAudience = requireRole("student", "ta", "teacher");

router.get("/", notifyAudience, NotificationController.list);
router.post("/read-all", notifyAudience, NotificationController.markAllAsRead);
router.post("/:id/read", notifyAudience, NotificationController.markAsRead);

export default router;
