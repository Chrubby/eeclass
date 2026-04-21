import { CourseService } from "../services/courseService.js";

export const CourseController = {
  async search(req, res) {
    try {
      const { code, name } = req.query;
      if (!code && !name) return res.status(404).json({ message: "找不到課程" });
      
      const course = await CourseService.searchCourse(code, name);
      res.json(course);
    } catch (error) {
      res.status(error.message === "找不到課程" ? 404 : 500).json({ message: error.message || "課程查詢失敗" });
    }
  },

  async enroll(req, res) {
    try {
      const { student_id, course_code } = req.body;
      if (!student_id || !course_code) return res.status(400).json({ message: "缺少參數" });

      await CourseService.enrollCourse(student_id, course_code);
      res.json({ message: "選課成功！" });
    } catch (error) {
      res.status(error.message.includes("已經選過") ? 400 : 404).json({ message: error.message || "選課失敗" });
    }
  },

  async getUserCourses(req, res) {
    try {
      const { user_id, role } = req.query;
      if (!user_id || !role) return res.status(400).json({ message: "缺少 user_id 或 role" });

      const courses = await CourseService.getUserCourses(user_id, role);
      res.json(courses);
    } catch (error) {
      res.status(error.message.includes("無效") ? 400 : 500).json({ message: error.message || "讀取課程失敗" });
    }
  },

  async createCourse(req, res) {
    try {
      const { teacher_id, course_name, course_code, description, academic_year } = req.body;
      if (!teacher_id || !course_name || !course_code || !academic_year) {
        return res.status(400).json({ message: "缺少必要欄位" });
      }

      const courseId = await CourseService.createCourse(req.body);
      res.json({ message: "課程建立成功", course_id: courseId });
    } catch (error) {
      res.status(400).json({ message: error.message || "課程建立失敗" });
    }
  }
};