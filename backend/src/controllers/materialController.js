import { MaterialService } from "../services/materialService.js";

export const MaterialController = {
  // 取得教材列表
  async getMaterials(req, res) {
    try {
      const { courseId } = req.params;
      const materials = await MaterialService.getCourseMaterials(courseId);
      res.json({ materials });
    } catch (error) {
      res.status(500).json({ message: "讀取教材失敗: " + error.message });
    }
  },

  // 上傳教材
  async uploadMaterial(req, res) {
    try {
      const { courseId } = req.params;
      const { uploaderId } = req.body;
      
      const result = await MaterialService.uploadMaterial(courseId, uploaderId, req.file);
      
      res.json({ 
        message: "教材上傳成功", 
        material: result 
      });
    } catch (error) {
      res.status(500).json({ message: "教材上傳失敗: " + error.message });
    }
  },

  // 刪除教材
  async deleteMaterial(req, res) {
    try {
      const { courseId, materialId } = req.params;
      await MaterialService.deleteMaterial(courseId, materialId);
      res.json({ message: "教材已刪除" });
    } catch (error) {
      res.status(500).json({ message: "刪除教材失敗: " + error.message });
    }
  }
};