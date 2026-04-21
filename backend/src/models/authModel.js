import { pool } from "../config/db.js";

export const AuthModel = {
  // 建立帳號
  async createAccount(username, passwordHash, email, role) {
    return pool.execute(
      "INSERT INTO accounts (username, password_hash, email, role) VALUES (?, ?, ?, ?)",
      [username, passwordHash, email, role]
    );
  },

  // 依帳號或信箱尋找帳號
  async findAccountByUsernameOrEmail(identifier) {
    const [rows] = await pool.execute(
      "SELECT * FROM accounts WHERE username = ? OR email = ?",
      [identifier, identifier]
    );
    return rows[0];
  },

  // 依帳號名稱取得角色
  async getRoleByUsername(username) {
    const [rows] = await pool.execute("SELECT role FROM accounts WHERE username = ?", [username]);
    return rows[0]?.role;
  },

  // 建立學生/老師詳細資料
  async createStudent(name, studentId) {
    return pool.execute("INSERT INTO students (name, student_id) VALUES (?, ?)", [name, studentId]);
  },
  async createTeacher(name, teacherId) {
    return pool.execute("INSERT INTO teachers (name, teacher_id) VALUES (?, ?)", [name, teacherId]);
  },

  // 取得身分詳細資料
  async getStudentById(studentId) {
    const [rows] = await pool.execute("SELECT * FROM students WHERE student_id = ?", [studentId]);
    return rows[0];
  },
  async getTeacherById(teacherId) {
    const [rows] = await pool.execute("SELECT * FROM teachers WHERE teacher_id = ?", [teacherId]);
    return rows[0];
  }
};