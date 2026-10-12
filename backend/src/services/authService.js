import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { AuthModel } from "../models/authModel.js";
import { signAccessToken } from "../utils/jwt.js";
import { parseRosterExcel } from "../utils/rosterExcel.js";

const DEFAULT_RECOVERY_CODE = "20260519";

// accounts are only ever created by an admin; there is no self sign-up
const ROLE_CREATION_MATRIX = {
  admin: ["admin", "teacher", "student"],
};

function normalizeEmail(raw, { required = false } = {}) {
  const email = String(raw ?? "").trim();
  if (!email) {
    if (required) throw new Error("請填寫信箱");
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
    throw new Error("請輸入有效的信箱");
  }
  return email;
}

async function assertEmailAvailable(accountId, email) {
  const taken = await AuthModel.findOtherAccountByEmail(accountId ?? 0, email);
  if (!taken) return;
  if (String(taken.email || "").toLowerCase() === email.toLowerCase()) {
    throw new Error("此信箱已被使用");
  }
  throw new Error("此信箱與其他帳號相同，請改用別的信箱");
}

function validateAccountInput({ username, password, confirmPassword, name }) {
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
}

// fill in the corresponding names
async function createProfileForRole(role, name, username, conn) {
  if (role === "student") {
    await AuthModel.createStudent(name, username, conn);
  } else if (role === "teacher") {
    await AuthModel.createTeacher(name, username, conn);
  } else if (role === "admin") {
    await AuthModel.createAdmin(name, username, conn);
  }
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
  return new Error(msg || "建立帳號失敗，請稍後再試");
}

export const AuthService = {
// creating a single account from a logged in admin
  async createManagedAccount(creatorRole, { username, password, name, role, confirmPassword, email }) {
    const allowedTargets = ROLE_CREATION_MATRIX[creatorRole] ?? [];
    const targetRole = String(role ?? "").trim();
    if (!allowedTargets.includes(targetRole)) {
      throw new Error("權限不足，無法建立此身份的帳號");
    }

    const trimmedUsername = String(username ?? "").trim();
    validateAccountInput({
      username: trimmedUsername,
      password,
      confirmPassword,
      name,
    });
    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail) await assertEmailAvailable(0, normalizedEmail);

    const passwordHash = await bcrypt.hash(password, 10);
    try {
      await AuthModel.createAccount(trimmedUsername, passwordHash, normalizedEmail, targetRole);
      await createProfileForRole(targetRole, name, trimmedUsername);
    } catch (e) {
      throw mapDbError(e, "createManagedAccount");
    }

    return { username: trimmedUsername, role: targetRole };
  },

  /** admin batch-creates accounts from a roster Excel; existing accounts are left untouched */
  async importAccounts(fileBuffer, initialPassword) {
    validateNewPassword(initialPassword);
    const { title, rows, problems } = await parseRosterExcel(fileBuffer);

    // every imported account starts with the same password, so one hash is enough
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    const created = [];
    const skipped = [];
    const failed = [...problems];

    for (const row of rows) {
      // 名單上註記「助教」的人也是學生帳號；助教身分之後由授課老師在課程的學生名冊指定
      const accountRole = row.role === "teacher" ? "teacher" : "student";
      const summary = { rowNumber: row.rowNumber, username: row.username, name: row.name, role: accountRole };

      if (await AuthModel.findAccountByUsername(row.username)) {
        skipped.push({ ...summary, reason: "帳號已存在" });
        continue;
      }
      if (row.email) {
        try {
          normalizeEmail(row.email);
        } catch (e) {
          failed.push({ ...summary, reason: e.message });
          continue;
        }
        const emailOwner = await AuthModel.findAccountByUsernameOrEmail(row.email);
        if (emailOwner) {
          failed.push({ ...summary, reason: `信箱已被帳號 ${emailOwner.username} 使用` });
          continue;
        }
      }

      // account and profile row go in together so a failure never leaves a half-created account
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await AuthModel.createAccount(row.username, passwordHash, row.email, accountRole, connection);
        await createProfileForRole(accountRole, row.name, row.username, connection);
        await connection.commit();
        created.push(summary);
      } catch (e) {
        await connection.rollback();
        failed.push({ ...summary, reason: mapDbError(e, "importAccounts").message });
      } finally {
        connection.release();
      }
    }

    return { title, created, skipped, failed };
  },

  async login(username, password) {
    const identifier = String(username ?? "").trim();
    if (!identifier || !password) throw new Error("請輸入帳號與密碼");

    const account = await AuthModel.findAccountByUsernameOrEmail(identifier);
    if (!account) throw new Error("帳號或信箱錯誤");

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
    if (role === "student") {
      userData = await AuthModel.getStudentById(username);
    } else if (role === "admin") {
      userData = await AuthModel.getAdminById(username);
    } else {
      userData = await AuthModel.getTeacherById(username);
    }

    return {
      role,
      username: account.username,
      email: account.email || null,
      avatar_url: account.avatar_url || null,
      must_change_password: Boolean(account.must_change_password),
      user: userData || null,
    };
  },

  async updateEmail(username, rawEmail) {
    const email = normalizeEmail(rawEmail, { required: true });

    const account = await AuthModel.findAccountByUsername(username);
    if (!account) throw new Error("找不到使用者");

    await assertEmailAvailable(account.id, email);
    await AuthModel.updateEmail(account.id, email);
    return { message: "信箱已更新", email };
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
