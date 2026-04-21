import { MaterialModel } from "../models/materialModel.js";

export const MaterialService = {
  async getCourseMaterials(courseId) {
    return await MaterialModel.getByCourseId(courseId);
  },

  async uploadMaterial(courseId, uploaderId, file) {
    if (!file) throw new Error("未提供檔案");

    // 處理 Multer 的原始檔名編碼問題
    const fileName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const filePath = `/uploads/${file.filename}`;

    const materialId = await MaterialModel.create(courseId, uploaderId, fileName, filePath);
    
    return {
      id: materialId,
      fileName,
      filePath
    };
  }
};