import { MaterialService } from "../services/materialService.js";

export const MaterialController = {
  async getMaterials(req, res) {
    try {
      const { courseId } = req.params;
      const materials = await MaterialService.getCourseMaterials(courseId);
      res.json({ materials });
    } catch {
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async uploadMaterial(req, res) {
    try {
      const { courseId } = req.params;

      const result = await MaterialService.uploadMaterial(courseId, req.user.username, req.file);

      res.json({
        message: "教材上傳成功",
        material: result,
      });
    } catch (error) {
      const msg = error.message || "";
      if (msg.includes("不允許") || msg.includes("檔案")) {
        return res.status(400).json({ message: msg });
      }
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },

  async deleteMaterial(req, res) {
    try {
      const { courseId, materialId } = req.params;
      await MaterialService.deleteMaterial(courseId, materialId);
      res.json({ message: "教材已刪除" });
    } catch {
      res.status(500).json({ message: "系統發生異常，請稍後再試" });
    }
  },
};
