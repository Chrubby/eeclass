import express from "express";
import { DiscussionController } from "../controllers/discussionController.js";

const router = express.Router();

router.delete("/:id", DiscussionController.deleteRoom);
router.get("/:roomId/threads", DiscussionController.getRoomThreads);
router.post("/:roomId/threads", DiscussionController.addThread);

export default router;