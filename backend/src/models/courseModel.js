import { pool } from "../config/db.js";

export const CourseModel = {
  // 尋找課程
  async findCourseByCode(courseCode, conn = pool) {
    const [rows] = await conn.execute(
      "SELECT * FROM courses WHERE course_code = ? ORDER BY created_at DESC LIMIT 1",
      [courseCode]
    );
    return rows[0];
  },
  async findCourseByName(courseName, conn = pool) {
    const [rows] = await conn.execute(
      "SELECT * FROM courses WHERE course_name LIKE ? ORDER BY created_at DESC LIMIT 1",
      [`%${courseName}%`]
    );
    return rows[0];
  },
  // 取得該課程的老師名單
  async getCourseTeachers(courseId, conn = pool) {
    const [rows] = await conn.execute(
      `SELECT t.id, t.name, t.teacher_id FROM teachers t
       JOIN teacher_courses tc ON t.id = tc.teacher_id
       WHERE tc.course_id = ?`,
      [courseId]
    );
    return rows;
  },
  
  // 取得該課程的選課名單
  async getCourseStudents(courseId, conn = pool){
    const [rows] = await conn.execute(
      `SELECT s.id, s.name, s.student_id , e.role FROM students s
      JOIN enrollments e ON s.id = e.student_id
      WHERE e.course_id = ?
      ORDER BY 
        CASE e.role
          WHEN 'student' THEN 1
          WHEN 'external' THEN 2
          WHEN 'auditor' THEN 3
          WHEN 'dropped' THEN 4
          ELSE 5
        END ASC,
       s.student_id ASC`,
      [courseId]
    );
    return rows;
  },

  // 選課相關
  async checkEnrollment(studentId, courseId, conn = pool) {
    const [rows] = await conn.execute(
      "SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?",
      [studentId, courseId]
    );
    return rows.length > 0;
  },

  async enrollStudent(studentId, courseId, conn = pool, role = 'student') {
    const [existing] = await conn.execute(
      "SELECT id, role FROM enrollments WHERE student_id = ? AND course_id = ?",
      [studentId, courseId]
    );
    if (existing.length > 0) {
      return conn.execute("UPDATE enrollments SET role = ? WHERE student_id = ? AND course_id = ?", [role, studentId, courseId]);
    }
    return conn.execute("INSERT INTO enrollments (student_id, course_id, role) VALUES (?, ?, ?)", [studentId, courseId, role]);
  },

  //退選相關
  async dropCourse(studentId, courseId, conn = pool) {
    const [result] = await conn.execute(
      `UPDATE enrollments SET role = 'dropped' WHERE student_id = ? AND course_id = ?`,
      [studentId, courseId]
    );
    return result;
  },

  //手動更新學生身分
  async updateStudentRole(studentId, courseId, conn = pool, role) {
    const [result] = await conn.execute(
      `UPDATE enrollments SET role = ? WHERE student_id = ? AND course_id = ?`,
      [role, studentId, courseId]
    );
    return result;
  },

  // 取得使用者所有課程
  async getStudentCourses(studentDbId, conn = pool) {
    const [rows] = await conn.execute(
      `SELECT c.* FROM courses c JOIN enrollments e ON c.id = e.course_id WHERE e.student_id = ? AND e.role != 'dropped'`,
      [studentDbId]
    );
    return rows;
  },
  async getTeacherCourses(teacherDbId, conn = pool) {
    const [rows] = await conn.execute(
      `SELECT c.* FROM courses c JOIN teacher_courses tc ON c.id = tc.course_id WHERE tc.teacher_id = ?`,
      [teacherDbId]
    );
    return rows;
  },

  // 建課相關
  async createCourse(courseName, courseCode, description, academicYear, conn = pool) {
    const [result] = await conn.execute(
      `INSERT INTO courses (course_name, course_code, description, academic_year) VALUES (?, ?, ?, ?)`,
      [courseName, courseCode, description || "", academicYear]
    );
    return result.insertId;
  },
  async bindTeacherToCourse(teacherDbId, courseId, conn = pool) {
    return conn.execute(
      "INSERT INTO teacher_courses (teacher_id, course_id) VALUES (?, ?)",
      [teacherDbId, courseId]
    );
  },
  async createDefaultAiPrompt(courseId, defaultPrompt, conn = pool) {
    return conn.execute(
      `INSERT INTO course_ai_prompts (course_id, chat_prompt, discussion_prompt, grading_prompt) VALUES (?, ?, ?, ?)`,
      [courseId, defaultPrompt, defaultPrompt, defaultPrompt]
    );
  }
};