import express from "express";
import { CourseController } from "../controllers/courseController.js";

const router = express.Router();

router.get("/", CourseController.search);             // 對應原本 /api/courses
router.post("/enroll", CourseController.enroll);      // 對應原本 /api/enroll
router.get("/user", CourseController.getUserCourses); // 將原本 /api/user_courses 改為 /api/courses/user 比較符合 RESTful
router.post("/", CourseController.createCourse);      // 將原本 /api/create_course 改為 POST /api/courses

export default router;