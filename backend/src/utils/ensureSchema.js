import { pool } from "../config/db.js";

/**
 * 啟動時補齊資料庫缺少的欄位／索引；
 * 將 ALTER TABLE 包在 try/catch，欄位已存在會丟 ER_DUP_FIELDNAME，可直接忽略。
 */
const MIGRATIONS = [
  // homework_submissions：保留收回紀錄需要的旗標
  "ALTER TABLE homework_submissions ADD COLUMN is_submitted TINYINT(1) NOT NULL DEFAULT 1",
  // accounts：強制變更密碼與頭貼欄位
  "ALTER TABLE accounts ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE accounts ADD COLUMN avatar_url VARCHAR(500) NULL",
  // role in old db is an enum without admin, so change to varchar
  "ALTER TABLE accounts MODIFY COLUMN role VARCHAR(20) NOT NULL",
  `CREATE TABLE IF NOT EXISTS admins (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(100) NOT NULL,
     admin_id VARCHAR(50) UNIQUE NOT NULL,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   )`,
  // roster rows without a student number use the email as the username, which can exceed 20 chars
  "ALTER TABLE students MODIFY COLUMN student_id VARCHAR(100)",
  "ALTER TABLE teachers MODIFY COLUMN teacher_id VARCHAR(100)",
  // roster imports withdraw students missing from the file instead of deleting their enrollment
  "ALTER TABLE enrollments ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'",
  "ALTER TABLE enrollments ADD COLUMN withdrawn_at DATETIME NULL",
];

const IGNORABLE_CODES = new Set([
  "ER_DUP_FIELDNAME", // 欄位已存在
  "ER_NO_SUCH_TABLE", // 對應的表還沒被建立（initDB 尚未跑）
  "ER_BAD_FIELD_ERROR", // 其它衍生欄位錯誤一併忽略
  "ER_CANT_DROP_FIELD_OR_KEY",
]);

export async function ensureSchema() {
  for (const sql of MIGRATIONS) {
    try {
      await pool.execute(sql);
    } catch (e) {
      if (IGNORABLE_CODES.has(e?.code)) continue;
      console.warn("[ensureSchema] 略過：", sql, "原因：", e?.message || e);
    }
  }
}
