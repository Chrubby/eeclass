import fs from 'node:fs';
import { StudentListService } from "../services/StudentListService.js";

export const StudentListController = {
  
  //取得學生名冊
  async getCourseStudents(req, res) {
    try {
      const { courseId } = req.params;
      const students = await StudentListService.getCourseStudentList(courseId);
      res.json(students);
    } 
    catch (err) {
      res.status(500).json({ message: "取得學生名冊失敗", error: err.message });
    }
  },

  async updateStudentRole(req, res) {
    try {
      const { courseId } = req.params;
      const { studentId, role } = req.body;
      
      await StudentListService.updateOrAddStudent(studentId, courseId, role);
      res.json({ message: "學生身分更新成功" });
    } catch (err) {
      console.error("更新身分失敗：", err);
      res.status(500).json({ message: err.message || "更新身分失敗" });
    }
  },

  async syncStudents(req, res) {
    try {
      const { courseId } = req.params;

      // 檢查是否上傳檔案
      if (!req.file) {
        return res.status(400).json({ message: "請上傳xlsx檔案" });
      }

      const filePath = req.file.path;
      const fileBuffer = fs.readFileSync(filePath);
      // 呼叫 Service 執行同步
      const result = await StudentListService.syncStudentsFromExcel(courseId, fileBuffer);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json(result);

    } catch (error) {
      // 檔案上傳錯誤的詳細回報
      if (error.details) {
        return res.status(400).json({
          message: error.message,
          errors: error.details
        });
      }

      // 其他系統錯誤
      res.status(500).json({ message: "同步失敗", error: error.message });
    }
  }
};