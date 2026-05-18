import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import { DiscussionController } from "../controllers/discussionController.js";

const router = express.Router();

router.delete("/:id", requireRole("teacher", "ta"), DiscussionController.deleteRoom);
router.get("/:roomId/threads", DiscussionController.getRoomThreads);
router.post("/:roomId/threads", DiscussionController.addThread);

export default router;
