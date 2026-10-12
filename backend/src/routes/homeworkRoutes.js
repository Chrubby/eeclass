import express from "express";
import { upload } from "../middlewares/upload.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/requireRole.js";
import { courseRole } from "../middlewares/courseRole.js";
import { HomeworkController } from "../controllers/homeworkController.js";

const router = express.Router();

router.use(authMiddleware);
router.param("hwId", courseRole.byHomework);
router.param("submissionId", courseRole.bySubmission);

const staff = requireRole("teacher", "ta");
// 助教在自己帶的課是工作人員，不繳交該課作業
const studentSide = requireRole("student");

router.get("/homeworks/:hwId", HomeworkController.getHomeworkDetail);
router.put("/homeworks/:hwId", staff, upload.any(), HomeworkController.updateHomework);
router.delete("/homeworks/:hwId", staff, HomeworkController.deleteHomework);

router.get("/homeworks/:hwId/export", staff, HomeworkController.exportSubmissions);
router.post("/homeworks/:hwId/submissions", studentSide, upload.any(), HomeworkController.submitHomework);
router.get("/homeworks/:hwId/submissions/me", studentSide, HomeworkController.getMySubmission);
router.delete("/homeworks/:hwId/submissions/me", studentSide, HomeworkController.unsubmitHomework);
router.get("/homeworks/:hwId/submissions", staff, HomeworkController.getSubmissionsList);

router.get("/submissions/:submissionId", staff, HomeworkController.getSubmissionDetail);
router.get("/submissions/:submissionId/pdf", staff, HomeworkController.exportSubmissionPdf);
router.post("/submissions/:submissionId/grade", staff, HomeworkController.gradeSubmission);
router.get("/submissions/:submissionId/history", staff, HomeworkController.getSubmissionHistory);

export default router;
