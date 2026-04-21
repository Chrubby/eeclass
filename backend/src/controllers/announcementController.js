import { AnnouncementService } from "../services/announcementService.js";

export const AnnouncementController = {
  async getAnnouncements(req, res) {
    try {
      // 改從 params 拿 courseCode 會更符合 RESTful
      const { courseCode } = req.params; 
      const { student_id } = req.query;

      const result = await AnnouncementService.getAnnouncements(courseCode, student_id);
      res.json(result);
    } catch (error) {
      res.status(error.message === "找不到課程" ? 404 : 500).json({ message: error.message || "讀取公告失敗" });
    }
  },

  async markAsRead(req, res) {
    try {
      const { id: announcementId } = req.params;
      const { student_id } = req.body;
      
      if (!student_id || !announcementId) return res.status(400).json({ message: "缺少必要參數" });

      await AnnouncementService.markAsRead(student_id, announcementId);
      res.json({ message: "已記錄已讀" });
    } catch (error) {
      res.status(error.message === "找不到學生" ? 404 : 500).json({ message: error.message || "紀錄已讀失敗" });
    }
  },

  async create(req, res) {
    try {
      const { courseCode } = req.params;
      const { teacher_id, title, content, is_pinned } = req.body;
      
      if (!courseCode || !teacher_id || !title) return res.status(400).json({ message: "缺少必要參數" });

      await AnnouncementService.createAnnouncement(courseCode, teacher_id, title, content, is_pinned);
      res.json({ message: "公告新增成功" });
    } catch (error) {
      res.status(400).json({ message: error.message || "公告新增失敗" });
    }
  }
};