import { HomeworkService } from "../services/homeworkService.js";
import { HomeworkModel } from "../models/homeworkModel.js";

export const HomeworkController = {
  // --- 課程層級 ---
  async publishHomework(req, res) {
    try {
      const { courseId } = req.params;
      await HomeworkService.publishHomework(courseId, req.body, req.files);
      res.json({ message: "作業發布成功！" });
    } catch (error) {
      res.status(500).json({ message: "發布失敗: " + error.message });
    }
  },

  async getCourseHomeworks(req, res) {
    try {
      const { courseId } = req.params;
      const { userId, role } = req.query;
      const homeworks = await HomeworkService.getCourseHomeworks(courseId, role, userId);
      res.json(homeworks);
    } catch (error) {
      res.status(500).json({ message: "讀取列表失敗" });
    }
  },

  // --- 作業層級 ---
  async getHomeworkDetail(req, res) {
    try {
      const { hwId } = req.params;
      const hw = await HomeworkService.getHomeworkDetail(hwId);
      if (!hw) return res.status(404).json({ message: "找不到作業" });
      res.json(hw);
    } catch (error) {
      res.status(500).json({ message: "讀取作業失敗" });
    }
  },

  async submitHomework(req, res) {
    try {
      const { hwId } = req.params;
      const { studentId, answerText } = req.body;
      await HomeworkService.submitHomework(hwId, studentId, answerText, req.file);
      res.json({ message: "作業繳交成功！" });
    } catch (error) {
      res.status(500).json({ message: "繳交失敗: " + error.message });
    }
  },

  async getMySubmission(req, res) {
    try {
      const { hwId } = req.params;
      const { studentId } = req.query;
      const sub = await HomeworkModel.getStudentSubmission(hwId, studentId);
      res.json(sub); // 若未繳交會回傳 null
    } catch (error) {
      res.status(500).json({ message: "讀取繳交紀錄失敗" });
    }
  },

  async unsubmitHomework(req, res) {
    try {
      const { hwId } = req.params;
      const { studentId } = req.body;
      await HomeworkService.unsubmitHomework(hwId, studentId);
      res.json({ message: "作業已收回" });
    } catch (error) {
      res.status(500).json({ message: "收回失敗" });
    }
  },

  async getSubmissionsList(req, res) {
    try {
      const { hwId } = req.params;
      const list = await HomeworkModel.getSubmissionsList(hwId);
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "讀取清單失敗" });
    }
  },

  // --- 繳交紀錄層級 ---
  async getSubmissionDetail(req, res) {
    try {
      const { submissionId } = req.params;
      const detail = await HomeworkModel.getSubmissionDetail(submissionId);
      if (!detail) return res.status(404).json({ message: "找不到資料" });
      res.json(detail);
    } catch (error) {
      res.status(500).json({ message: "讀取失敗" });
    }
  },

  async gradeSubmission(req, res) {
    try {
      const { submissionId } = req.params;
      const { score, feedback, gradedDetails } = req.body;
      await HomeworkService.gradeSubmission(submissionId, score, feedback, gradedDetails);
      res.json({ message: "批改完成！" });
    } catch (error) {
      res.status(500).json({ message: "評分失敗" });
    }
  },

  async getSubmissionHistory(req, res) {
    try {
      const { submissionId } = req.params;
      const historyData = await HomeworkService.getSubmissionHistory(submissionId);
      if (!historyData) return res.status(404).json({ message: "找不到繳交紀錄" });
      res.json(historyData);
    } catch (error) {
      res.status(500).json({ message: "讀取歷程失敗" });
    }
  }
};