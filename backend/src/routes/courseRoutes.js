import express from "express";
import { CourseController } from "../controllers/courseController.js";
import { AnnouncementController } from "../controllers/announcementController.js";
import { DiscussionController } from "../controllers/discussionController.js";
import { HomeworkController } from "../controllers/homeworkController.js";
import { MaterialController } from "../controllers/materialController.js";
import { uploadPdf, upload} from "../middlewares/upload.js";
import courseAiRoutes from "./courseAiRoutes.js";

const router = express.Router();

router.get("/", CourseController.search);             // 對應原本 /api/courses
router.post("/enroll", CourseController.enroll);      // 對應原本 /api/enroll
router.get("/user", CourseController.getUserCourses); // 將原本 /api/user_courses 改為 /api/courses/user 比較符合 RESTful
router.post("/", CourseController.createCourse);      // 將原本 /api/create_course 改為 POST /api/courses
//公告
router.get("/:courseCode/announcements", AnnouncementController.getAnnouncements);
router.post("/:courseCode/announcements", AnnouncementController.create);
//討論區
router.get("/:courseCode/discussions", DiscussionController.getCourseDiscussions);
router.post("/:courseCode/discussions", uploadPdf.single("file"), DiscussionController.createRoom);
//作業
router.get("/:courseId/homeworks", HomeworkController.getCourseHomeworks);
router.post("/:courseId/homeworks", upload.any(), HomeworkController.publishHomework);
router.use("/:courseCode", courseAiRoutes);

//教材
router.get("/:courseId/materials", MaterialController.getMaterials);
router.post("/:courseId/materials", upload.single("file"), MaterialController.uploadMaterial);
router.delete("/:courseId/materials/:materialId", MaterialController.deleteMaterial);


export default router;
