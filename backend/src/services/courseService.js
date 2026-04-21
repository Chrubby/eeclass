import { pool } from "../config/db.js";
import { CourseModel } from "../models/courseModel.js";
import { AuthModel } from "../models/authModel.js"; // 沿用剛才的 AuthModel

export const CourseService = {
  async searchCourse(courseCode, courseName) {
    let course;
    if (courseCode) {
      course = await CourseModel.findCourseByCode(courseCode);
    } else if (courseName) {
      course = await CourseModel.findCourseByName(courseName);
    }

    if (!course) throw new Error("找不到課程");

    course.teachers = await CourseModel.getCourseTeachers(course.id);
    return course;
  },

  async enrollCourse(studentIdentifier, courseCode) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const student = await AuthModel.getStudentById(studentIdentifier);
      if (!student) throw new Error("找不到學生");

      const course = await CourseModel.findCourseByCode(courseCode, connection);
      if (!course) throw new Error("找不到課程");

      const isEnrolled = await CourseModel.checkEnrollment(student.id, course.id, connection);
      if (isEnrolled) throw new Error("已經選過此課程");

      await CourseModel.enrollStudent(student.id, course.id, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getUserCourses(userId, role) {
    let userDbId;
    let courses;

    if (role === "student" || role === "ta") {
      const student = await AuthModel.getStudentById(userId);
      if (!student) throw new Error(`找不到 ${role}`);
      userDbId = student.id;
      courses = await CourseModel.getStudentCourses(userDbId);
    } else if (role === "teacher") {
      const teacher = await AuthModel.getTeacherById(userId);
      if (!teacher) throw new Error(`找不到 ${role}`);
      userDbId = teacher.id;
      courses = await CourseModel.getTeacherCourses(userDbId);
    } else {
      throw new Error("role 無效");
    }

    // 幫每堂課補上授課老師資訊
    for (const course of courses) {
      course.teachers = await CourseModel.getCourseTeachers(course.id);
    }
    return courses;
  },

  async createCourse({ teacherAccount, courseName, courseCode, description, academicYear }) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const existCourse = await CourseModel.findCourseByCode(courseCode, connection);
      if (existCourse) throw new Error("課程代碼已存在");

      const courseId = await CourseModel.createCourse(courseName, courseCode, description, academicYear, connection);
      
      const teacher = await AuthModel.getTeacherById(teacherAccount);
      if (!teacher) throw new Error("找不到該老師");

      await CourseModel.bindTeacherToCourse(teacher.id, courseId, connection);

      const defaultPrompt = "你是一位大學課程助教，請用繁體中文回答，並使用 '\\n' 來換行，保持訊息條列與換行，不要用 HTML 標籤。";
      await CourseModel.createDefaultAiPrompt(courseId, defaultPrompt, connection);

      await connection.commit();
      return courseId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};