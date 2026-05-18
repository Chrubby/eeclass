import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { AuthModel } from "../models/authModel.js";
import { signAccessToken } from "../utils/jwt.js";

const DEFAULT_RECOVERY_CODE = "20260519";

function validateRegisterInput({ username, password, confirmPassword, name, role }) {
  const u = String(username ?? "").trim();
  if (!u) throw new Error("帳號不可為空");
  if (u.length > 64) throw new Error("帳號過長");

  if (!password || typeof password !== "string") throw new Error("請提供密碼");
  if (password.length < 8) throw new Error("密碼長度至少 8 個字元");
  if (password.length > 128) throw new Error("密碼過長");

  if (confirmPassword != null && confirmPassword !== password) {
    throw new Error("兩次輸入的密碼不相符");
  }

  if (!String(name ?? "").trim()) throw new Error("請填寫姓名");

  const allowedRoles = new Set(["student", "teacher", "ta"]);
  if (!allowedRoles.has(role)) throw new Error("身份不合法");
}

function validateNewPassword(password, confirmPassword) {
  if (!password || typeof password !== "string") throw new Error("請提供密碼");
  if (password.length < 8) throw new Error("密碼長度至少 8 個字元");
  if (password.length > 128) throw new Error("密碼過長");
  if (confirmPassword != null && confirmPassword !== password) {
    throw new Error("兩次輸入的密碼不相符");
  }
}

function hashPasswordResetToken(token) {
  return crypto.createHash("sha256").update(String(token), "utf8").digest("hex");
}

function getRecoveryCode() {
  return String(process.env.PASSWORD_RECOVERY_CODE || DEFAULT_RECOVERY_CODE).trim();
}

function mapDbError(e, context) {
  if (e?.code === "ER_DUP_ENTRY" || e?.errno === 1062) {
    return new Error("帳號已被使用");
  }
  if (e?.code === "ER_BAD_FIELD_ERROR" || e?.errno === 1054) {
    return new Error(
      "資料庫結構尚未更新，請在伺服器執行：node scripts/initDB.js（或手動為 accounts 表新增 must_change_password 欄位）",
    );
  }
  if (e?.code === "ER_NO_SUCH_TABLE" || e?.errno === 1146) {
    return new Error("資料庫表尚未建立，請在伺服器執行：node scripts/initDB.js");
  }
  console.error(`[${context}]`, e);
  const msg = typeof e?.message === "string" ? e.message : "";
  if (msg.includes("Unknown column")) {
    return new Error("資料庫結構與程式不符，請執行 node scripts/initDB.js 更新資料庫");
  }
  return new Error(msg || "註冊失敗，請稍後再試");
}

export const AuthService = {
  async register({ username, password, name, role, confirmPassword }) {
    const trimmedUsername = String(username ?? "").trim();
    validateRegisterInput({
      username: trimmedUsername,
      password,
      confirmPassword,
      name,
      role,
    });

    const passwordHash = await bcrypt.hash(password, 10);
    try {
      await AuthModel.createAccount(trimmedUsername, passwordHash, null, role);

      if (role === "student" || role === "ta") {
        await AuthModel.createStudent(name, trimmedUsername);
      } else if (role === "teacher") {
        await AuthModel.createTeacher(name, trimmedUsername);
      }
    } catch (e) {
      throw mapDbError(e, "register");
    }
  },

  async login(username, password) {
    const account = await AuthModel.findAccountByUsernameOrEmail(username);
    if (!account) throw new Error("帳號錯誤");

    const isMatch = await bcrypt.compare(password, account.password_hash);
    if (!isMatch) throw new Error("密碼錯誤");

    const token = signAccessToken(account.username, account.role);
    return {
      username: account.username,
      role: account.role,
      token,
      mustChangePassword: Boolean(account.must_change_password),
    };
  },

  async getUserInfo(username) {
    const account = await AuthModel.findAccountByUsername(username);
    if (!account) throw new Error("找不到使用者");

    const role = account.role;
    let userData;
    if (role === "student" || role === "ta") {
      userData = await AuthModel.getStudentById(username);
    } else {
      userData = await AuthModel.getTeacherById(username);
    }

    return {
      role,
      username: account.username,
      avatar_url: account.avatar_url || null,
      must_change_password: Boolean(account.must_change_password),
      user: userData || null,
    };
  },

  /** 忘記密碼：帳號 + 教師提供之重設代碼 */
  async resetPasswordWithRecoveryCode({ username, recoveryCode, password, confirmPassword }) {
    const u = String(username ?? "").trim();
    if (!u) throw new Error("請輸入帳號");

    const code = String(recoveryCode ?? "").trim();
    if (code !== getRecoveryCode()) {
      throw new Error("重設密碼代碼不正確");
    }

    validateNewPassword(password, confirmPassword);

    const account = await AuthModel.findAccountByUsername(u);
    if (!account) throw new Error("找不到此帳號");

    const passwordHash = await bcrypt.hash(password, 10);
    await AuthModel.updateAccountPasswordById(account.id, passwordHash);
    await AuthModel.setMustChangePassword(account.id, false);

    return { message: "密碼已重設，請使用新密碼登入" };
  },

  /** 登入後變更密碼（含首次強制變更） */
  async changePassword(username, { password, confirmPassword, currentPassword }) {
    validateNewPassword(password, confirmPassword);

    const account = await AuthModel.findAccountByUsername(username);
    if (!account) throw new Error("找不到使用者");

    const mustChange = Boolean(account.must_change_password);
    if (!mustChange) {
      if (!currentPassword) throw new Error("請輸入目前密碼");
      const ok = await bcrypt.compare(currentPassword, account.password_hash);
      if (!ok) throw new Error("目前密碼不正確");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await AuthModel.updateAccountPasswordById(account.id, passwordHash);
    await AuthModel.setMustChangePassword(account.id, false);

    return { message: "密碼已更新", mustChangePassword: false };
  },

  async updateAvatar(username, avatarUrl) {
    const account = await AuthModel.findAccountByUsername(username);
    if (!account) throw new Error("找不到使用者");
    await AuthModel.updateAvatarUrl(account.id, avatarUrl);
    return { avatar_url: avatarUrl };
  },

  /** 舊版信件 token 重設（保留相容） */
  async resetPasswordWithToken({ token, password, confirmPassword }) {
    const t = String(token ?? "").trim();
    if (!t) throw new Error("重設連結無效或已過期");

    validateNewPassword(password, confirmPassword);

    const tokenHash = hashPasswordResetToken(t);
    const row = await AuthModel.findActivePasswordResetByTokenHash(tokenHash);
    if (!row) throw new Error("重設連結已失效或已使用，請重新申請忘記密碼");

    const passwordHash = await bcrypt.hash(password, 10);
    await AuthModel.updateAccountPasswordById(row.account_id, passwordHash);
    await AuthModel.markPasswordResetTokenUsed(row.id);
    await AuthModel.deletePasswordResetTokensForAccount(row.account_id);
    await AuthModel.setMustChangePassword(row.account_id, false);

    return { message: "密碼已重設，請使用新密碼登入" };
  },
};
