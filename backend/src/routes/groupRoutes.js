import express from "express";
import { GroupController } from "../controllers/groupController.js";
import { requireRole } from "../middlewares/requireRole.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router({ mergeParams: true });

router.get("/", GroupController.getGroups);
router.get("/student-creation", GroupController.getStudentCreationSetting);
router.put("/student-creation", requireRole("teacher", "ta"), GroupController.setStudentCreationSetting);
router.get("/max-members", GroupController.getCourseMaxMembers);
router.put("/max-members", requireRole("teacher", "ta"), GroupController.setCourseMaxMembers);
router.get("/homeworks", GroupController.getGroupHomeworks);
router.get("/:groupId/discussion", GroupController.getGroupDiscussion);
router.post("/:groupId/discussion", GroupController.addGroupDiscussionPost);
router.delete("/:groupId/discussion/:postId", GroupController.deleteGroupDiscussionPost);
router.get("/:groupId/homeworks/:hwId", GroupController.getGroupHomework);
router.post("/:groupId/homeworks/:hwId/submissions", requireRole("student"), upload.any(), GroupController.submitGroupHomework);
router.delete("/:groupId/homeworks/:hwId/submissions/me", requireRole("student"), GroupController.unsubmitGroupHomework);
router.post("/", requireRole("student", "teacher", "ta"), GroupController.createGroup);
router.post("/batch", requireRole("teacher", "ta"), GroupController.createGroups);
router.put("/:groupId/recruitment", requireRole("student"), GroupController.updateRecruitment);
router.put("/:groupId/leader", requireRole("student"), GroupController.transferLeadership);
router.get("/:groupId/applications", requireRole("student"), GroupController.getApplications);
router.post("/:groupId/applications", requireRole("student"), GroupController.submitApplication);
router.post("/:groupId/applications/:applicationId/approve", requireRole("student"), GroupController.approveApplication);
router.delete("/:groupId/applications/me", requireRole("student"), GroupController.withdrawApplication);
router.delete("/:groupId/applications/:applicationId", requireRole("student"), GroupController.deleteApplication);
router.delete("/:groupId", requireRole("teacher", "ta"), GroupController.deleteGroup);
router.post("/:groupId/members/me", requireRole("student", "ta"), GroupController.joinGroup);
router.delete("/:groupId/members/me", requireRole("student", "ta"), GroupController.leaveGroup);

export default router;
