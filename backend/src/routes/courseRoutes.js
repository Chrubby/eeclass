import express from "express";
import { CourseController } from "../controllers/courseController.js";
import { AnnouncementController } from "../controllers/announcementController.js";
import { DiscussionController } from "../controllers/discussionController.js";
import { HomeworkController } from "../controllers/homeworkController.js";
import { MaterialController } from "../controllers/materialController.js";
import { StudentListController } from "../controllers/StudentListController.js";
import { uploadPdf, upload, uploadSpreadsheet } from "../middlewares/upload.js";
import { requireRole } from "../middlewares/requireRole.js";
import { courseRole } from "../middlewares/courseRole.js";
import courseAiRoutes from "./courseAiRoutes.js";
import aiQuizRoutes from "./AiQuizRoutes.js";
import groupRoutes from "./groupRoutes.js";

const router = express.Router();

// 兩個參數名稱帶的都是課程代碼；涵蓋底下所有 /:courseCode/... 與巢狀路由
router.param("courseCode", courseRole.byCode);
router.param("courseId", courseRole.byCode);

const staff = requireRole("teacher", "ta");
const studentSide = requireRole("student", "ta");
const rosterManagers = requireRole("admin", "teacher", "ta");

router.get("/", CourseController.search);
router.post("/enroll", studentSide, CourseController.enroll);
router.get("/user", CourseController.getUserCourses);
router.get("/all", requireRole("admin"), CourseController.getAllCourses);
router.get("/teachers", requireRole("admin"), CourseController.getAllTeachers);
router.get("/search", CourseController.search);
router.post("/", requireRole("admin", "teacher"), CourseController.createCourse);

router.get("/:courseCode/contacts", CourseController.getContacts);
router.get("/:courseCode/announcements", AnnouncementController.getAnnouncements);
router.post("/:courseCode/announcements", staff, AnnouncementController.create);
router.put("/:courseCode/announcements/:announcementId", staff, AnnouncementController.update);
router.delete("/:courseCode/announcements/:announcementId", staff, AnnouncementController.remove);

router.get("/:courseCode/discussions", DiscussionController.getCourseDiscussions);
router.post("/:courseCode/discussions", staff, uploadPdf.single("file"), DiscussionController.createRoom);

router.get("/:courseId/homeworks", HomeworkController.getCourseHomeworks);
router.post("/:courseId/homeworks", staff, upload.any(), HomeworkController.publishHomework);
router.use("/:courseCode/groups", groupRoutes);
router.use("/:courseCode", courseAiRoutes);

router.get("/:courseId/materials", MaterialController.getMaterials);
router.post("/:courseId/materials", staff, upload.single("file"), MaterialController.uploadMaterial);
router.put("/:courseId/materials/:materialId", staff, upload.single("file"), MaterialController.replaceMaterial);
router.delete("/:courseId/materials/:materialId", staff, MaterialController.deleteMaterial);

router.get("/:courseId/studentlist", rosterManagers, StudentListController.getCourseStudents);
router.post("/:courseId/studentlist", rosterManagers, uploadSpreadsheet.single("file"), StudentListController.syncStudents);
router.post("/:courseId/studentlist/update", rosterManagers, StudentListController.updateStudentRole);

//AIQuiz
router.use("/:courseId/aiquizzes", aiQuizRoutes);
export default router;
