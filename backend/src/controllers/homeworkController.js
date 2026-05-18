import { HomeworkService } from "../services/homeworkService.js";
import { HomeworkModel } from "../models/homeworkModel.js";

export const HomeworkController = {
  async publishHomework(req, res) {
    try {
      const { courseId } = req.params;
      await HomeworkService.publishHomework(courseId, req.body, req.files);
      res.json({ message: "作業發布成功！" });
    } catch (error) {
      const msg = error.message || "";
      if (msg.includes("不允許") || msg.includes("檔案")) {
        return res.status(400).json({ message: msg });
      }
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async getCourseHomeworks(req, res) {
    try {
      const { courseId } = req.params;
      const homeworks = await HomeworkService.getCourseHomeworks(
        courseId,
        req.user.role,
        req.user.username,
      );
      res.json(homeworks);
    } catch {
      res.status(500).json({ message: "讀取列表失敗" });
    }
  },

  async getHomeworkDetail(req, res) {
    try {
      const { hwId } = req.params;
      const hw = await HomeworkService.getHomeworkDetail(hwId);
      if (!hw) return res.status(404).json({ message: "找不到作業" });
      res.json(hw);
    } catch {
      res.status(500).json({ message: "讀取作業失敗" });
    }
  },

  async updateHomework(req, res) {
    try {
      const { hwId } = req.params;
      await HomeworkService.updateHomework(hwId, req.body, req.files);
      res.json({ message: "作業更新成功！" });
    } catch (error) {
      const msg = error.message || "";
      if (msg.includes("不允許") || msg.includes("檔案")) {
        return res.status(400).json({ message: msg });
      }
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async deleteHomework(req, res) {
    try {
      await HomeworkService.deleteHomework(req.params.hwId);
      res.json({ message: "作業已刪除" });
    } catch {
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async submitHomework(req, res) {
    try {
      const { hwId } = req.params;
      const { answerText } = req.body;
      const studentId = req.user.username;
      if (!answerText && !req.file) {
        return res.status(400).json({ message: "不能繳交空內容" });
      }
      await HomeworkService.submitHomework(hwId, studentId, answerText, req.file);
      res.json({ message: "作業繳交成功！" });
    } catch (error) {
      const msg = error.message || "";
      if (msg.includes("截止")) {
        return res.status(400).json({ message: msg });
      }
      if (msg.includes("不允許") || msg.includes("檔案")) {
        return res.status(400).json({ message: msg });
      }
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async getMySubmission(req, res) {
    try {
      const { hwId } = req.params;
      const sub = await HomeworkModel.getStudentSubmission(hwId, req.user.username);
      res.json(sub);
    } catch {
      res.status(500).json({ message: "讀取繳交紀錄失敗" });
    }
  },

  async unsubmitHomework(req, res) {
    try {
      const { hwId } = req.params;
      await HomeworkService.unsubmitHomework(hwId, req.user.username);
      res.json({ message: "作業已收回" });
    } catch {
      res.status(500).json({ message: "收回失敗" });
    }
  },

  async getSubmissionsList(req, res) {
    try {
      const { hwId } = req.params;
      const list = await HomeworkModel.getSubmissionsList(hwId);
      res.json(list);
    } catch {
      res.status(500).json({ message: "讀取清單失敗" });
    }
  },

  async getSubmissionDetail(req, res) {
    try {
      const { submissionId } = req.params;
      const detail = await HomeworkModel.getSubmissionDetail(submissionId);
      if (!detail) return res.status(404).json({ message: "找不到資料" });

      const isStaff = ["teacher", "ta"].includes(req.user.role);
      if (!isStaff && detail.studentId !== req.user.username) {
        return res.status(403).json({ message: "權限不足" });
      }
      res.json(detail);
    } catch {
      res.status(500).json({ message: "讀取失敗" });
    }
  },

  async gradeSubmission(req, res) {
    try {
      const { submissionId } = req.params;
      const { score, feedback, gradedDetails } = req.body;
      await HomeworkService.gradeSubmission(submissionId, score, feedback, gradedDetails);
      res.json({ message: "批改完成！" });
    } catch {
      res.status(500).json({ message: "評分失敗" });
    }
  },

  async getSubmissionHistory(req, res) {
    try {
      const { submissionId } = req.params;
      const detail = await HomeworkModel.getSubmissionDetail(submissionId);
      if (!detail) return res.status(404).json({ message: "找不到繳交紀錄" });

      const isStaff = ["teacher", "ta"].includes(req.user.role);
      if (!isStaff && detail.studentId !== req.user.username) {
        return res.status(403).json({ message: "權限不足" });
      }

      const historyData = await HomeworkService.getSubmissionHistory(submissionId);
      if (!historyData) return res.status(404).json({ message: "找不到繳交紀錄" });
      res.json(historyData);
    } catch {
      res.status(500).json({ message: "讀取歷程失敗" });
    }
  },
};
