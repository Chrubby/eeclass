import express from "express";
import { upload } from "../middlewares/upload.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/requireRole.js";
import { HomeworkController } from "../controllers/homeworkController.js";

const router = express.Router();

router.use(authMiddleware);

const staff = requireRole("teacher", "ta");
const studentSide = requireRole("student", "ta");

router.get("/homeworks/:hwId", HomeworkController.getHomeworkDetail);
router.put("/homeworks/:hwId", staff, upload.any(), HomeworkController.updateHomework);
router.delete("/homeworks/:hwId", staff, HomeworkController.deleteHomework);

router.post("/homeworks/:hwId/submissions", studentSide, upload.single("file"), HomeworkController.submitHomework);
router.get("/homeworks/:hwId/submissions/me", studentSide, HomeworkController.getMySubmission);
router.delete("/homeworks/:hwId/submissions/me", studentSide, HomeworkController.unsubmitHomework);
router.get("/homeworks/:hwId/submissions", staff, HomeworkController.getSubmissionsList);

router.get("/submissions/:submissionId", staff, HomeworkController.getSubmissionDetail);
router.post("/submissions/:submissionId/grade", staff, HomeworkController.gradeSubmission);
router.get("/submissions/:submissionId/history", staff, HomeworkController.getSubmissionHistory);

export default router;
