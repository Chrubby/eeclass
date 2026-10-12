import { pool } from "../config/db.js";
import { CourseModel } from "../models/courseModel.js";
import { AuthModel } from "../models/authModel.js";
import * as XLSX from "xlsx";

export const StudentListService = {
  async getCourseStudentList(courseId, connection) {
    const course = await CourseModel.findCourseByCode(courseId, connection);
    return await CourseModel.getCourseStudents(course.id, connection);
  },

    
  async updateOrAddStudent(studentId, courseId, role = null, connection){
    const course = await CourseModel.findCourseByCode(courseId, connection);
    const student = await AuthModel.getStudentById(studentId);
    const currentEnrolledStudents = await CourseModel.getCourseStudents(course.id, connection);
    const currentEnrolledIds = new Set(currentEnrolledStudents.map(s => s.id));
    if (!currentEnrolledIds.has(student.id)) {
      //新增學生
      return await CourseModel.enrollStudent(student.id, course.id, connection, role);
    }
    else{
      //修正學生
      return await CourseModel.updateStudentRole(student.id, course.id, connection, role);
    }
  },

  async syncStudentsFromExcel(courseId, fileBuffer){

    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error("檔案 buffer 無效，請確認 Multer 使用 memoryStorage");
    }
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { range: 1 });
    
    if (!rows || rows.length === 0) {
      throw new Error("Excel 檔案內容為空或格式錯誤");
    }

    const excelStudentDbIds = new Set();
    const validationErrors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      const rowNum = i + 3; 

      const studentIdentifier = row["帳號"];

      if (!studentIdentifier) {
        validationErrors.push(`第 ${rowNum} 行：格式錯誤`);
        continue;
      }

      const student = await AuthModel.getStudentById(studentIdentifier);
      if (!student) {
        validationErrors.push(`第 ${rowNum} 行 (學號: ${studentIdentifier})：系統中找不到此學生`);
        continue;
      }

      excelStudentDbIds.add(student.id);
    }

    if (validationErrors.length > 0) {
      const errorObj = new Error("同步失敗，Excel  內容檢驗未通過");
      errorObj.details = validationErrors;
      throw errorObj;
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const course = await CourseModel.findCourseByCode(courseId, connection);
      const currentEnrolledStudents = await CourseModel.getCourseStudents(course.id, connection);
      const currentEnrolledIds = new Set(currentEnrolledStudents.filter(s => s.role !== 'dropped').map(s => s.id));

      // 執行加選
      for (const studentId of excelStudentDbIds) {
        if (!currentEnrolledIds.has(studentId)) {
          await CourseModel.enrollStudent(studentId, course.id, connection);
        }
      }

      // 執行退選
      for (const studentId of currentEnrolledIds) {
        if (!excelStudentDbIds.has(studentId)) {
          await CourseModel.dropCourse(studentId, course.id, connection);
        }
      }


      await connection.commit();
      
      return { message: "名冊更新成功！" };
    } 
    catch (error) {
      await connection.rollback();
      throw error;
    }
  }
};