import { pool } from "../config/db.js";

export const MaterialModel = {
  // 取得特定課程的所有教材
  async getByCourseId(courseId) {
    const [rows] = await pool.execute(
      `SELECT m.id, m.course_id as courseId, m.uploader_id as uploaderId,
              m.file_name as fileName, m.file_path as filePath, m.created_at as createdAt,
              COALESCE(
                (SELECT name FROM teachers WHERE teacher_id = m.uploader_id LIMIT 1),
                (SELECT name FROM students WHERE student_id = m.uploader_id LIMIT 1),
                m.uploader_id
              ) AS uploaderName
       FROM course_materials m
       WHERE m.course_id = ?
       ORDER BY m.created_at DESC`,
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

  async replaceFile(materialId, uploaderId, fileName, filePath) {
    await pool.execute(
      "UPDATE course_materials SET uploader_id = ?, file_name = ?, file_path = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?",
      [uploaderId || null, fileName, filePath, materialId],
    );
  },

  async delete(materialId) {
    await pool.execute("DELETE FROM course_materials WHERE id = ?", [materialId]);
  }
};