
import { DiscussionService } from "../services/discussionService.js";

export const DiscussionController = {
  async getCourseDiscussions(req, res) {
    try {
      const rooms = await DiscussionService.getCourseDiscussions(req.params.courseCode);
      res.json(rooms);
    } catch (error) {
      res.status(404).json({ message: error.message || "讀取討論區失敗" });
    }
  },

  async createRoom(req, res) {
    try {
      const { course_code, title, content, ai_prompt } = req.body;
      if (!course_code || !title) return res.status(400).json({ message: "缺少必要參數" });

      await DiscussionService.createDiscussion(course_code, title, content, ai_prompt, req.file);
      res.json({ message: "討論區建立成功" });
    } catch (error) {
      res.status(500).json({ message: "建立失敗: " + error.message });
    }
  },

  async deleteRoom(req, res) {
    try {
      await DiscussionService.deleteDiscussion(req.params.id);
      res.json({ message: "刪除成功" });
    } catch (error) {
      res.status(500).json({ error: "刪除失敗" });
    }
  },

  async getRoomThreads(req, res) {
    try {
      const result = await DiscussionService.getRoomAndThreads(req.params.roomId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "讀取內容失敗" });
    }
  },

  async addThread(req, res) {
    try {
      const { user_id, content, parent_thread_id } = req.body;
      if (!content) return res.status(400).json({ message: "內容不能為空" });

      // 使用者發文及觸發 AI 皆由 Service 處理，API 不需等待 AI 回覆即可回傳（若嫌 AI 處理太慢，Service 可改為非同步不 await）
      await DiscussionService.addThreadAndTriggerAI(req.params.roomId, user_id, content, parent_thread_id);
      res.json({ message: "發表成功" });
    } catch (error) {
      res.status(500).json({ message: "伺服器錯誤: " + error.message });
    }
  }
};