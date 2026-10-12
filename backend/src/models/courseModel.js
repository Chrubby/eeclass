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
  async listContactsByCourseCode(courseCode, conn = pool) {
    const [teachers] = await conn.execute(
      `SELECT t.name, a.email, 'teacher' AS role
       FROM teacher_courses tc
       JOIN teachers t ON t.id = tc.teacher_id
       JOIN courses c ON c.id = tc.course_id
       LEFT JOIN accounts a ON a.username = t.teacher_id
       WHERE c.course_code = ?
       ORDER BY t.id`,
      [courseCode],
    );
    const [tas] = await conn.execute(
      `SELECT s.name, a.email, 'ta' AS role
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN accounts a ON a.username = s.student_id
       JOIN courses c ON c.id = e.course_id
       WHERE c.course_code = ? AND a.role = 'ta'
       ORDER BY s.id`,
      [courseCode],
    );
    return { teachers, tas };
  },

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

  // 該課程目前的助教（已退選的不算）
  async getCourseTAs(courseId, conn = pool) {
    const [rows] = await conn.execute(
      `SELECT s.name, s.student_id AS username
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN accounts a ON a.username = s.student_id AND a.role = 'ta'
       WHERE e.course_id = ? AND e.status = 'active'
       ORDER BY s.name`,
      [courseId]
    );
    return rows;
  },

  // 選課相關：回傳 'active' / 'withdrawn'，沒選過則為 null
  async getEnrollmentStatus(studentId, courseId, conn = pool) {
    const [rows] = await conn.execute(
      `SELECT status FROM enrollments WHERE student_id = ? AND course_id = ?
       ORDER BY status = 'active' DESC LIMIT 1`,
      [studentId, courseId]
    );
    return rows[0]?.status ?? null;
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
  async setEnrollmentStatus(studentId, courseId, status, conn = pool) {
    return conn.execute(
      `UPDATE enrollments
       SET status = ?, withdrawn_at = IF(? = 'withdrawn', NOW(), NULL)
       WHERE student_id = ? AND course_id = ?`,
      [status, status, studentId, courseId]
    );
  },

  // 匯入名單時鎖住該課程的選課紀錄，避免兩人同時匯入互相覆蓋
  async getCourseEnrollmentsForUpdate(courseId, conn) {
    const [rows] = await conn.execute(
      `SELECT e.student_id, e.status, s.student_id AS username, s.name
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       WHERE e.course_id = ?
       FOR UPDATE`,
      [courseId]
    );
    return rows;
  },

  // 課程名單（含已退選，資料一律保留）
  async getCourseRoster(courseId, conn = pool) {
    const [rows] = await conn.execute(
      `SELECT s.student_id AS username, s.name, a.role, a.email,
              e.status, e.enrolled_at, e.withdrawn_at
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       LEFT JOIN accounts a ON a.username = s.student_id
       WHERE e.course_id = ?
       ORDER BY e.status = 'withdrawn', s.student_id`,
      [courseId]
    );
    return rows;
  },

  async isTeacherBound(teacherDbId, courseId, conn = pool) {
    const [rows] = await conn.execute(
      "SELECT id FROM teacher_courses WHERE teacher_id = ? AND course_id = ? LIMIT 1",
      [teacherDbId, courseId]
    );
    return rows.length > 0;
  },

  // 管理員建課時可指定的授課老師
  async getAllTeachers(conn = pool) {
    const [rows] = await conn.execute(
      `SELECT t.name, t.teacher_id AS username
       FROM teachers t
       JOIN accounts a ON a.username = t.teacher_id AND a.role = 'teacher'
       ORDER BY t.name`
    );
    return rows;
  },

  // 管理員總覽：所有課程與修課人數
  async getAllCoursesWithCounts(conn = pool) {
    const [rows] = await conn.execute(
      `SELECT c.id, c.course_name, c.course_code, c.academic_year, c.created_at,
              COALESCE(SUM(e.status = 'active'), 0) AS active_count,
              COALESCE(SUM(e.status = 'withdrawn'), 0) AS withdrawn_count
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    return rows.map((row) => ({
      ...row,
      active_count: Number(row.active_count),
      withdrawn_count: Number(row.withdrawn_count),
    }));
  },

  // 取得使用者所有課程（已退選的不顯示）
  async getStudentCourses(studentDbId, conn = pool) {
    const [rows] = await conn.execute(
      `SELECT c.* FROM courses c JOIN enrollments e ON c.id = e.course_id
       WHERE e.student_id = ? AND e.status = 'active' AND e.role != 'dropped'`,
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