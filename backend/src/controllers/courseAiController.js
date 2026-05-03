import { CourseAiService } from "../services/courseAiService.js";
import { CourseAiModel } from "../models/courseAiModel.js";
import { pool } from "../config/db.js";

export const CourseAiController = {
  async askAi(req, res) {
    console.log(`Received request for askAi: courseCode=${req.body.courseCode}, studentCode=${req.body.studentCode}`);
    try {
      const { courseCode, studentCode, userMessage } = req.body;
      const reply = await CourseAiService.askAssistant(courseCode, studentCode, userMessage);
      res.json({ reply });
    } catch (err) {
      res.status(500).json({ message: "回覆失敗" });
    }
  },

  async remindHomework(req, res) {
    console.log(`Received request for remindHomework: courseCode=${req.body.courseCode}, studentCode=${req.body.studentCode}`);
    try {
      const { courseCode, studentCode } = req.body;
      const reply = await CourseAiService.remindHomework(courseCode, studentCode);
      res.json({ reply });
    } catch (err) {
      res.status(500).json({ message: "提醒失敗" });
    }
  },

  async getHistory(req, res) {
    console.log(`Received request for getHistory: courseCode=${req.params.courseCode}, studentCode=${req.params.studentCode}`);
    try {
      const { courseCode, studentCode } = req.params;
      const [courseRows] = await pool.execute("SELECT id FROM courses WHERE course_code = ?", [courseCode]);
      const [studentRows] = await pool.execute("SELECT id FROM students WHERE student_id = ?", [studentCode]);
      if (!courseRows.length || !studentRows.length) return res.status(404).json({ message: "資料不存在" });
      const chats = await CourseAiModel.getChatHistory(courseRows[0].id, studentRows[0].id, 20);
      res.json({ chats });
    } catch (err) {
      res.status(500).json({ message: "讀取紀錄失敗" });
    }
  }
};