import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import { courseRole } from "../middlewares/courseRole.js";
import { uploadPdf } from "../middlewares/upload.js";
import { DiscussionController } from "../controllers/discussionController.js";

const router = express.Router();

router.param("id", courseRole.byDiscussionRoom);
router.param("roomId", courseRole.byDiscussionRoom);
router.param("threadId", courseRole.byThread);

router.put("/threads/:threadId", DiscussionController.updateThread);
router.delete("/threads/:threadId", DiscussionController.deleteThread);
router.put("/:id", requireRole("teacher", "ta"), uploadPdf.single("file"), DiscussionController.updateRoom);
router.delete("/:id", requireRole("teacher", "ta"), DiscussionController.deleteRoom);
router.get("/:roomId/threads", DiscussionController.getRoomThreads);
router.post("/:roomId/threads", DiscussionController.addThread);

export default router;
