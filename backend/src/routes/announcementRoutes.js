import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import { AnnouncementController } from "../controllers/announcementController.js";

const router = express.Router();

router.post("/:id/read", requireRole("student", "ta"), AnnouncementController.markAsRead);

export default router;
