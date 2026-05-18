import { pool } from "../config/db.js";

function isMissingColumnError(err) {
  return err?.code === "ER_BAD_FIELD_ERROR" || err?.errno === 1054;
}

export const AuthModel = {
  async createAccount(username, passwordHash, email, role) {
    try {
      return await pool.execute(
        "INSERT INTO accounts (username, password_hash, email, role, must_change_password) VALUES (?, ?, ?, ?, 1)",
        [username, passwordHash, email ?? null, role],
      );
    } catch (err) {
      if (!isMissingColumnError(err)) throw err;
      return pool.execute(
        "INSERT INTO accounts (username, password_hash, email, role) VALUES (?, ?, ?, ?)",
        [username, passwordHash, email ?? null, role],
      );
    }
  },

  async findAccountByUsernameOrEmail(identifier) {
    const [rows] = await pool.execute(
      "SELECT * FROM accounts WHERE username = ? OR email = ?",
      [identifier, identifier],
    );
    return rows[0];
  },

  async findAccountByUsername(username) {
    const [rows] = await pool.execute("SELECT * FROM accounts WHERE username = ?", [username]);
    return rows[0];
  },

  async getRoleByUsername(username) {
    const [rows] = await pool.execute("SELECT role FROM accounts WHERE username = ?", [username]);
    return rows[0]?.role;
  },

  async createStudent(name, studentId) {
    return pool.execute("INSERT INTO students (name, student_id) VALUES (?, ?)", [name, studentId]);
  },

  async createTeacher(name, teacherId) {
    return pool.execute("INSERT INTO teachers (name, teacher_id) VALUES (?, ?)", [name, teacherId]);
  },

  async getStudentById(studentId) {
    const [rows] = await pool.execute("SELECT * FROM students WHERE student_id = ?", [studentId]);
    return rows[0];
  },

  async getTeacherById(teacherId) {
    const [rows] = await pool.execute("SELECT * FROM teachers WHERE teacher_id = ?", [teacherId]);
    return rows[0];
  },

  async deletePasswordResetTokensForAccount(accountId) {
    await pool.execute("DELETE FROM password_reset_tokens WHERE account_id = ?", [accountId]);
  },

  async insertPasswordResetToken(accountId, tokenHash, expiresAt) {
    await pool.execute(
      "INSERT INTO password_reset_tokens (account_id, token_hash, expires_at) VALUES (?, ?, ?)",
      [accountId, tokenHash, expiresAt],
    );
  },

  async findActivePasswordResetByTokenHash(tokenHash) {
    const [rows] = await pool.execute(
      `SELECT id, account_id FROM password_reset_tokens
       WHERE token_hash = ? AND expires_at > NOW() AND used_at IS NULL
       LIMIT 1`,
      [tokenHash],
    );
    return rows[0] || null;
  },

  async markPasswordResetTokenUsed(id) {
    await pool.execute("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?", [id]);
  },

  async updateAccountPasswordById(accountId, passwordHash) {
    await pool.execute("UPDATE accounts SET password_hash = ? WHERE id = ?", [passwordHash, accountId]);
  },

  async setMustChangePassword(accountId, value) {
    try {
      await pool.execute("UPDATE accounts SET must_change_password = ? WHERE id = ?", [
        value ? 1 : 0,
        accountId,
      ]);
    } catch (err) {
      if (!isMissingColumnError(err)) throw err;
    }
  },

  async updateAvatarUrl(accountId, avatarUrl) {
    try {
      await pool.execute("UPDATE accounts SET avatar_url = ? WHERE id = ?", [avatarUrl, accountId]);
    } catch (err) {
      if (!isMissingColumnError(err)) throw err;
    }
  },
};
