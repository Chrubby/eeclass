import { StudentListService } from "../services/StudentListService.js";

const isNotFound = (message) => message.includes("找不到課程");

export const StudentListController = {
  //取得學生名冊
  async getCourseStudents(req, res) {
    try {
      const students = await StudentListService.getCourseStudentList(req.params.courseId);
      res.json(students);
    } catch (err) {
      const msg = err.message || "";
      if (isNotFound(msg)) return res.status(404).json({ message: msg });
      console.error("取得學生名冊失敗：", err);
      res.status(500).json({ message: "取得學生名冊失敗" });
    }
  },

  async updateStudentRole(req, res) {
    try {
      const { studentId, role } = req.body;
      await StudentListService.updateOrAddStudent(studentId, req.params.courseId, role || "student", req.user.role);
      res.json({ message: "學生身分更新成功" });
    } catch (err) {
      const msg = err.message || "更新身分失敗";
      if (isNotFound(msg)) return res.status(404).json({ message: msg });
      if (msg.includes("只有授課老師或管理員")) return res.status(403).json({ message: msg });
      res.status(400).json({ message: msg });
    }
  },

  async syncStudents(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "請上傳xlsx檔案" });
      }
      const result = await StudentListService.syncStudentsFromExcel(req.params.courseId, req.file.buffer, req.user.role);
      res.json(result);
    } catch (err) {
      const msg = err.message || "同步失敗";
      if (isNotFound(msg)) return res.status(404).json({ message: msg });
      console.error("同步學生名冊失敗：", err);
      res.status(400).json({ message: msg });
    }
  },
};
