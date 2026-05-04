import { pool } from "../config/db.js";

export const MaterialModel = {
  // 取得特定課程的所有教材
  async getByCourseId(courseId) {
    const [rows] = await pool.execute(
      `SELECT id, course_id as courseId, uploader_id as uploaderId, 
              file_name as fileName, file_path as filePath, created_at as createdAt 
       FROM course_materials 
       WHERE course_id = ? 
       ORDER BY created_at DESC`,
      [courseId]
    );
    return rows;
  },

  // 儲存新教材資訊
  async create(courseId, uploaderId, fileName, filePath) {
    const [result] = await pool.execute(
      "INSERT INTO course_materials (course_id, uploader_id, file_name, file_path) VALUES (?, ?, ?, ?)",
      [courseId, uploaderId || null, fileName, filePath]
    );
    return result.insertId;
  },

  async getById(materialId) {
    const [rows] = await pool.execute(
      `SELECT id, course_id as courseId, uploader_id as uploaderId, file_name as fileName, file_path as filePath
       FROM course_materials WHERE id = ?`,
      [materialId]
    );
    return rows[0] || null;
  },

  async delete(materialId) {
    await pool.execute("DELETE FROM course_materials WHERE id = ?", [materialId]);
  }
};