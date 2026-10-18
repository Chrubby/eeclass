import { CourseService } from "../services/courseService.js";
import { CourseModel } from "../models/courseModel.js";

export const CourseController = {
  async search(req, res) {
    try {
      const { code, name } = req.query;
      if (!code && !name) return res.status(404).json({ message: "找不到課程" });

      const course = await CourseService.searchCourse(code, name);
      res.json(course);
    } catch (error) {
      const msg = error.message || "";
      if (msg === "找不到課程") {
        return res.status(404).json({ message: msg });
      }
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async enroll(req, res) {
    try {
      const { course_code } = req.body;
      if (!course_code) return res.status(400).json({ message: "缺少參數" });

      const student_id = req.user.username;
      await CourseService.enrollCourse(student_id, course_code);
      res.json({ message: "選課成功！" });
    } catch (error) {
      const msg = error.message || "";
      if (msg.includes("已經選過") || msg.includes("退選")) return res.status(400).json({ message: msg });
      if (msg.includes("找不到")) return res.status(404).json({ message: msg });
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async getContacts(req, res) {
    try {
      const contacts = await CourseModel.listContactsByCourseCode(req.params.courseCode);
      res.json(contacts);
    } catch {
      res.status(500).json({ message: "讀取聯絡資訊失敗" });
    }
  },

  async getUserCourses(req, res) {
    try {
      const courses = await CourseService.getUserCourses(req.user.username, req.user.role);
      res.json(courses);
    } catch (error) {
      const msg = error.message || "";
      if (msg.includes("無效")) return res.status(400).json({ message: msg });
      console.error("[getUserCourses]", error);
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async getAllCourses(_req, res) {
    try {
      res.json(await CourseService.getAllCourses());
    } catch (error) {
      console.error("[getAllCourses]", error);
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async getAllTeachers(_req, res) {
    try {
      res.json(await CourseService.getAllTeachers());
    } catch (error) {
      console.error("[getAllTeachers]", error);
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async createCourse(req, res) {
    try {
      const { course_name, course_code, description, academic_year } = req.body;
      if (!course_name || !course_code || !academic_year) {
        return res.status(400).json({ message: "缺少必要欄位" });
      }

      // teachers own the course they create; an admin may assign a teacher now or leave it to the roster import
      const teacherId = req.user.role === "admin" ? req.body.teacher_username || null : req.user.username;

      const courseId = await CourseService.createCourse({
        course_name,
        course_code,
        description,
        academic_year,
        teacher_id: teacherId,
      });
      res.json({ message: "課程建立成功", course_id: courseId });
    } catch (error) {
      res.status(400).json({ message: error.message || "課程建立失敗" });
    }
  },
};
