import express from "express";
import { GroupController } from "../controllers/groupController.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = express.Router({ mergeParams: true });

router.get("/", GroupController.getGroups);
router.get("/homeworks", GroupController.getGroupHomeworks);
router.get("/student-creation", GroupController.getStudentCreationSetting);
router.put("/student-creation", requireRole("teacher", "ta"), GroupController.setStudentCreationSetting);
router.post("/", requireRole("student", "teacher", "ta"), GroupController.createGroup);
router.post("/batch", requireRole("teacher", "ta"), GroupController.createGroups);
router.put("/:groupId/recruitment", requireRole("student"), GroupController.updateRecruitment);
router.put("/:groupId/leader", requireRole("student"), GroupController.transferLeadership);
router.get("/:groupId/applications", requireRole("student"), GroupController.getApplications);
router.post("/:groupId/applications", requireRole("student"), GroupController.submitApplication);
router.post("/:groupId/applications/:applicationId/approve", requireRole("student"), GroupController.approveApplication);
router.delete("/:groupId", requireRole("teacher", "ta"), GroupController.deleteGroup);
router.post("/:groupId/members/me", requireRole("student", "ta"), GroupController.joinGroup);
router.delete("/:groupId/members/me", requireRole("student", "ta"), GroupController.leaveGroup);

export default router;
