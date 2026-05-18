import { CourseAiService } from "../services/courseAiService.js";
import { CourseAiModel } from "../models/courseAiModel.js";
import { pool } from "../config/db.js";

function assertOwnStudentRecord(req, studentCode) {
  if (!studentCode || studentCode !== req.user.username) {
    return false;
  }
  return true;
}

export const CourseAiController = {
  async askAi(req, res) {
    try {
      const { courseCode, studentCode, userMessage } = req.body;
      if (!assertOwnStudentRecord(req, studentCode)) {
        return res.status(403).json({ message: "權限不足" });
      }
      const reply = await CourseAiService.askAssistant(courseCode, studentCode, userMessage);
      res.json({ reply });
    } catch {
      res.status(500).json({ message: "回覆失敗" });
    }
  },

  async remindHomework(req, res) {
    try {
      const { studentCode, courseCode } = req.body;
      if (!assertOwnStudentRecord(req, studentCode)) {
        return res.status(403).json({ message: "權限不足" });
      }
      const reply = await CourseAiService.remindHomework(courseCode, studentCode);
      res.json({ reply });
    } catch {
      res.status(500).json({ message: "提醒失敗" });
    }
  },

  async getHistory(req, res) {
    try {
      const { courseCode, studentCode } = req.params;
      if (!assertOwnStudentRecord(req, studentCode)) {
        return res.status(403).json({ message: "權限不足" });
      }
      const [courseRows] = await pool.execute("SELECT id FROM courses WHERE course_code = ?", [courseCode]);
      const [studentRows] = await pool.execute("SELECT id FROM students WHERE student_id = ?", [studentCode]);
      if (!courseRows.length || !studentRows.length) return res.status(404).json({ message: "資料不存在" });
      const chats = await CourseAiModel.getChatHistory(courseRows[0].id, studentRows[0].id, 20);
      res.json({ chats });
    } catch {
      res.status(500).json({ message: "讀取紀錄失敗" });
    }
  },
};
