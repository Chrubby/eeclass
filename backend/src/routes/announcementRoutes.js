import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import { courseRole } from "../middlewares/courseRole.js";
import { AnnouncementController } from "../controllers/announcementController.js";

const router = express.Router();

router.param("id", courseRole.byAnnouncement);

router.post("/:id/read", requireRole("student", "ta"), AnnouncementController.markAsRead);

export default router;
