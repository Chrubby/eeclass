import express from "express";
import { upload } from "../middlewares/upload.js";
import { HomeworkController } from "../controllers/homeworkController.js";

const router = express.Router();

// ========================
// 單一作業操作 (/api/homeworks/...)
// ========================
router.get("/homeworks/:hwId", HomeworkController.getHomeworkDetail);
router.post("/homeworks/:hwId/submissions", upload.single("file"), HomeworkController.submitHomework);
router.get("/homeworks/:hwId/submissions/me", HomeworkController.getMySubmission);
router.delete("/homeworks/:hwId/submissions/me", HomeworkController.unsubmitHomework);
router.get("/homeworks/:hwId/submissions", HomeworkController.getSubmissionsList);

// ========================
// 繳交紀錄與批改操作 (/api/submissions/...)
// ========================
router.get("/submissions/:submissionId", HomeworkController.getSubmissionDetail);
router.put("/submissions/:submissionId/grade", HomeworkController.gradeSubmission);
router.get("/submissions/:submissionId/history", HomeworkController.getSubmissionHistory);

export default router;