import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { AuthModel } from "../models/authModel.js";
import { signAccessToken } from "../utils/jwt.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegisterInput({ username, password, confirmPassword, name, role, email }) {
  const u = String(username ?? "").trim();
  if (!u) throw new Error("帳號不可為空");
  if (u.length > 64) throw new Error("帳號過長");

  if (!password || typeof password !== "string") throw new Error("請提供密碼");
  if (password.length < 8) throw new Error("密碼長度至少 8 個字元");
  if (password.length > 128) throw new Error("密碼過長");

  if (confirmPassword != null && confirmPassword !== password) {
    throw new Error("兩次輸入的密碼不相符");
  }

  const em = String(email ?? "").trim();
  if (!em) throw new Error("請填寫信箱");
  if (!EMAIL_RE.test(em)) throw new Error("信箱格式不正確");

  if (!String(name ?? "").trim()) throw new Error("請填寫姓名");

  const allowedRoles = new Set(["student", "teacher", "ta"]);
  if (!allowedRoles.has(role)) throw new Error("身份不合法");
}

function hashPasswordResetToken(token) {
  return crypto.createHash("sha256").update(String(token), "utf8").digest("hex");
}

function validateResetPassword(password, confirmPassword) {
  if (!password || typeof password !== "string") throw new Error("請提供密碼");
  if (password.length < 8) throw new Error("密碼長度至少 8 個字元");
  if (password.length > 128) throw new Error("密碼過長");
  if (confirmPassword != null && confirmPassword !== password) {
    throw new Error("兩次輸入的密碼不相符");
  }
}

const PASSWORD_RESET_GENERIC_MESSAGE =
  "若您輸入的帳號或信箱已註冊且已綁定電子郵件，我們將寄送重設密碼連結至該信箱。請檢查收信匣與垃圾郵件。";

export const AuthService = {
  async register({ username, password, name, role, email, confirmPassword }) {
    validateRegisterInput({ username, password, confirmPassword, name, role, email });

    const passwordHash = await bcrypt.hash(password, 10);
    try {
      await AuthModel.createAccount(username, passwordHash, email, role);

      if (role === "student" || role === "ta") {
        await AuthModel.createStudent(name, username);
      } else if (role === "teacher") {
        await AuthModel.createTeacher(name, username);
      }
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY" || e.errno === 1062) {
        throw new Error("帳號或信箱已被使用");
      }
      throw e;
    }
  },

  async login(username, password) {
    const account = await AuthModel.findAccountByUsernameOrEmail(username);
    if (!account) throw new Error("帳號或信箱錯誤");

    const isMatch = await bcrypt.compare(password, account.password_hash);
    if (!isMatch) throw new Error("密碼錯誤");

    const token = signAccessToken(account.username, account.role);
    return {
      username: account.username,
      role: account.role,
      token,
    };
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
  },

  /**
   * 申請重設密碼：建立一次性 token 並寄信（SMTP 未設定時僅寫入資料庫，開發環境會於伺服器日誌輸出連結）
   */
  async requestPasswordReset(identifier) {
    const raw = String(identifier ?? "").trim();
    if (!raw) throw new Error("請輸入帳號或註冊信箱");

    const account = await AuthModel.findAccountByUsernameOrEmail(raw);
    if (!account) {
      return { message: PASSWORD_RESET_GENERIC_MESSAGE };
    }
    if (!account.email || !String(account.email).trim()) {
      console.warn("[password-reset] 帳號未綁定信箱，略過寄信:", account.username);
      return { message: PASSWORD_RESET_GENERIC_MESSAGE };
    }

    const plainToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashPasswordResetToken(plainToken);
    const ttlMs = (Number(process.env.PASSWORD_RESET_EXPIRE_MINUTES) || 60) * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);

    await AuthModel.deletePasswordResetTokensForAccount(account.id);
    await AuthModel.insertPasswordResetToken(account.id, tokenHash, expiresAt);

    const base = (process.env.FRONTEND_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(plainToken)}`;

    const sent = await sendPasswordResetEmail({
      to: account.email.trim(),
      resetUrl,
      username: account.username,
    }).catch((err) => {
      console.error("[password-reset] 寄信失敗:", err?.message || err);
      return false;
    });

    if (!sent) {
      if (process.env.NODE_ENV === "production") {
        await AuthModel.deletePasswordResetTokensForAccount(account.id);
      } else {
        console.warn(
          "[password-reset] 未成功寄信（請檢查 SMTP）。開發用重設連結（請勿於正式環境使用）：",
          resetUrl,
        );
      }
    }

    return { message: PASSWORD_RESET_GENERIC_MESSAGE };
  },

  /** 以信件內連結的一次性 token 重設密碼 */
  async resetPasswordWithToken({ token, password, confirmPassword }) {
    const t = String(token ?? "").trim();
    if (!t) throw new Error("重設連結無效或已過期");

    validateResetPassword(password, confirmPassword);

    const tokenHash = hashPasswordResetToken(t);
    const row = await AuthModel.findActivePasswordResetByTokenHash(tokenHash);
    if (!row) throw new Error("重設連結已失效或已使用，請重新申請忘記密碼");

    const passwordHash = await bcrypt.hash(password, 10);
    await AuthModel.updateAccountPasswordById(row.account_id, passwordHash);
    await AuthModel.markPasswordResetTokenUsed(row.id);
    await AuthModel.deletePasswordResetTokensForAccount(row.account_id);

    return { message: "密碼已重設，請使用新密碼登入" };
  },
};
