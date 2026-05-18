import express from "express";
import { CourseController } from "../controllers/courseController.js";
import { AnnouncementController } from "../controllers/announcementController.js";
import { DiscussionController } from "../controllers/discussionController.js";
import { HomeworkController } from "../controllers/homeworkController.js";
import { MaterialController } from "../controllers/materialController.js";
import { uploadPdf, upload} from "../middlewares/upload.js";
import { requireRole } from "../middlewares/requireRole.js";
import courseAiRoutes from "./courseAiRoutes.js";

const router = express.Router();

const staff = requireRole("teacher", "ta");
const studentSide = requireRole("student", "ta");

router.get("/", CourseController.search);
router.post("/enroll", studentSide, CourseController.enroll);
router.get("/user", CourseController.getUserCourses);
router.post("/", staff, CourseController.createCourse);

router.get("/:courseCode/announcements", AnnouncementController.getAnnouncements);
router.post("/:courseCode/announcements", staff, AnnouncementController.create);

router.get("/:courseCode/discussions", DiscussionController.getCourseDiscussions);
router.post("/:courseCode/discussions", staff, uploadPdf.single("file"), DiscussionController.createRoom);

router.get("/:courseId/homeworks", HomeworkController.getCourseHomeworks);
router.post("/:courseId/homeworks", staff, upload.any(), HomeworkController.publishHomework);
router.use("/:courseCode", courseAiRoutes);

router.get("/:courseId/materials", MaterialController.getMaterials);
router.post("/:courseId/materials", staff, upload.single("file"), MaterialController.uploadMaterial);
router.delete("/:courseId/materials/:materialId", staff, MaterialController.deleteMaterial);


export default router;
