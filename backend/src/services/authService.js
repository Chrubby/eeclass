import bcrypt from "bcryptjs";
import { AuthModel } from "../models/authModel.js";

export const AuthService = {
  async register({ username, password, name, role, email }) {
    const passwordHash = await bcrypt.hash(password, 10);
    await AuthModel.createAccount(username, passwordHash, email, role);

    if (role === "student" || role === "ta") {
      await AuthModel.createStudent(name, username);
    } else if (role === "teacher") {
      await AuthModel.createTeacher(name, username);
    }
  },

  async login(username, password) {
    const account = await AuthModel.findAccountByUsernameOrEmail(username);
    if (!account) throw new Error("帳號或信箱錯誤");

    const isMatch = await bcrypt.compare(password, account.password_hash);
    if (!isMatch) throw new Error("密碼錯誤");

    return { username: account.username, role: account.role };
  },

  async getUserInfo(userId) {
    const role = await AuthModel.getRoleByUsername(userId);
    if (!role) throw new Error("找不到使用者");

    let userData;
    if (role === "student" || role === "ta") {
      userData = await AuthModel.getStudentById(userId);
    } else {
      userData = await AuthModel.getTeacherById(userId);
    }

    return { role, user: userData || null };
  }
};