import express from "express";
import { AnnouncementController } from "../controllers/announcementController.js";

const router = express.Router();

// 標記特定公告為已讀
router.post("/:id/read", AnnouncementController.markAsRead);

export default router;