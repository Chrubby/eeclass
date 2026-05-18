import { AnnouncementService } from "../services/announcementService.js";

export const AnnouncementController = {
  async getAnnouncements(req, res) {
    try {
      const { courseCode } = req.params;
      const student_id = ["student", "ta"].includes(req.user.role) ? req.user.username : undefined;

      const result = await AnnouncementService.getAnnouncements(courseCode, student_id);
      res.json(result);
    } catch (error) {
      const msg = error.message || "";
      if (msg === "找不到課程") {
        return res.status(404).json({ message: msg });
      }
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async markAsRead(req, res) {
    try {
      const { id: announcementId } = req.params;

      if (!announcementId) return res.status(400).json({ message: "缺少必要參數" });

      await AnnouncementService.markAsRead(req.user.username, announcementId);
      res.json({ message: "已記錄已讀" });
    } catch (error) {
      const msg = error.message || "";
      if (msg === "找不到學生") {
        return res.status(404).json({ message: msg });
      }
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async create(req, res) {
    try {
      const { courseCode } = req.params;
      const { title, content, is_pinned } = req.body;

      if (!courseCode || !title) return res.status(400).json({ message: "缺少必要參數" });

      await AnnouncementService.createAnnouncement(
        courseCode,
        req.user.username,
        title,
        content,
        is_pinned,
      );
      res.json({ message: "公告新增成功" });
    } catch (error) {
      res.status(400).json({ message: error.message || "公告新增失敗" });
    }
  },
};
