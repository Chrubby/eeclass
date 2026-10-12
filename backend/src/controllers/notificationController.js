import { NotificationService } from "../services/notificationService.js";

export const NotificationController = {
  async list(req, res) {
    try {
      const result = await NotificationService.getNotifications(
        req.user.username,
        req.user.role,
        req.query.limit,
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ message: "缺少必要參數" });

      await NotificationService.markAsRead(req.user.username, req.user.role, id);
      res.json({ message: "已記錄已讀" });
    } catch (error) {
      const msg = error.message || "";
      if (msg === "找不到學生" || msg === "找不到老師") return res.status(404).json({ message: msg });
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async markAllAsRead(req, res) {
    try {
      await NotificationService.markAllAsRead(req.user.username, req.user.role);
      res.json({ message: "已全部標為已讀" });
    } catch (error) {
      const msg = error.message || "";
      if (msg === "找不到學生" || msg === "找不到老師") return res.status(404).json({ message: msg });
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },
};
