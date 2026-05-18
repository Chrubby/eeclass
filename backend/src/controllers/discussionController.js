import { DiscussionService } from "../services/discussionService.js";

export const DiscussionController = {
  async getCourseDiscussions(req, res) {
    try {
      const rooms = await DiscussionService.getCourseDiscussions(req.params.courseCode);
      res.json(rooms);
    } catch (error) {
      const msg = error.message || "";
      if (msg.includes("找不到")) {
        return res.status(404).json({ message: msg || "讀取討論區失敗" });
      }
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async createRoom(req, res) {
    try {
      const { course_code, title, content, ai_prompt } = req.body;
      if (!course_code || !title) return res.status(400).json({ message: "缺少必要參數" });

      await DiscussionService.createDiscussion(course_code, title, content, ai_prompt, req.file);
      res.json({ message: "討論區建立成功" });
    } catch (error) {
      const msg = error.message || "";
      if (msg.includes("只允許") || msg.includes("不允許") || msg.includes("PDF")) {
        return res.status(400).json({ message: msg });
      }
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async deleteRoom(req, res) {
    try {
      await DiscussionService.deleteDiscussion(req.params.id);
      res.json({ message: "刪除成功" });
    } catch {
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async getRoomThreads(req, res) {
    try {
      const result = await DiscussionService.getRoomAndThreads(req.params.roomId);
      res.json(result);
    } catch {
      res.status(500).json({ message: "讀取內容失敗" });
    }
  },

  async addThread(req, res) {
    try {
      const { content, parent_thread_id } = req.body;
      if (!content) return res.status(400).json({ message: "內容不能為空" });

      await DiscussionService.addThreadAndTriggerAI(
        req.params.roomId,
        req.user.username,
        content,
        parent_thread_id,
      );
      res.json({ message: "發表成功" });
    } catch {
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },
};
