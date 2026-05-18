import { CourseService } from "../services/courseService.js";

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
      if (msg.includes("已經選過")) return res.status(400).json({ message: msg });
      if (msg.includes("找不到")) return res.status(404).json({ message: msg });
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async getUserCourses(req, res) {
    try {
      const courses = await CourseService.getUserCourses(req.user.username, req.user.role);
      res.json(courses);
    } catch (error) {
      const msg = error.message || "";
      if (msg.includes("無效")) return res.status(400).json({ message: msg });
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async createCourse(req, res) {
    try {
      const { course_name, course_code, description, academic_year } = req.body;
      if (!course_name || !course_code || !academic_year) {
        return res.status(400).json({ message: "缺少必要欄位" });
      }

      const body = {
        ...req.body,
        teacher_id: req.user.username,
      };

      const courseId = await CourseService.createCourse(body);
      res.json({ message: "課程建立成功", course_id: courseId });
    } catch (error) {
      res.status(400).json({ message: error.message || "課程建立失敗" });
    }
  },
};
