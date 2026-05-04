import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { MaterialModel } from "../models/materialModel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../../uploads");

function resolveUploadFilePath(storedFilePath) {
  const rel = String(storedFilePath || "").replace(/^\/uploads\//, "");
  return path.join(uploadsDir, rel);
}

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
  },

  async deleteMaterial(courseId, materialId) {
    const material = await MaterialModel.getById(materialId);
    if (!material) throw new Error("找不到教材");
    if (String(material.courseId) !== String(courseId)) {
      throw new Error("教材不屬於此課程");
    }
    if (material.filePath) {
      const abs = resolveUploadFilePath(material.filePath);
      try {
        await fs.unlink(abs);
      } catch (err) {
        if (err && err.code !== "ENOENT") throw err;
      }
    }
    await MaterialModel.delete(materialId);
  }
};