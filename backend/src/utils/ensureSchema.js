import { pool } from "../config/db.js";

/**
 * 啟動時補齊資料庫缺少的欄位／索引；
 * 將 ALTER TABLE 包在 try/catch，欄位已存在會丟 ER_DUP_FIELDNAME，可直接忽略。
 */
const MIGRATIONS = [
  // homework_submissions：保留收回紀錄需要的旗標
  "ALTER TABLE homework_submissions ADD COLUMN is_submitted TINYINT(1) NOT NULL DEFAULT 1",
  // accounts：強制變更密碼、頭貼、信箱（可為 NULL，不覆寫既有資料）
  "ALTER TABLE accounts ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE accounts ADD COLUMN avatar_url VARCHAR(500) NULL",
  "ALTER TABLE accounts ADD COLUMN email VARCHAR(100) NULL",
  // notifications：站內通知（公告、作業、測驗、討論）
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    type VARCHAR(30) NOT NULL,
    ref_id VARCHAR(64) NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_student (student_id, is_read, created_at),
    INDEX idx_notif_ref (type, ref_id)
  )`,
  // 舊資料庫的 ref_id 是 INT，放寬成字串以支援測驗 UUID，既有數字會原樣保留
  "ALTER TABLE notifications MODIFY COLUMN ref_id VARCHAR(64) NULL",
  // 老師批改通知：student_id 改為可空，既有學生通知列不受影響
  "ALTER TABLE notifications MODIFY COLUMN student_id INT NULL",
  "ALTER TABLE notifications ADD COLUMN teacher_id INT NULL",
  "ALTER TABLE notifications ADD INDEX idx_notif_teacher (teacher_id, is_read, created_at)",
  // 作業截止後只通知老師一次；NULL 代表尚未通知
  "ALTER TABLE homeworks ADD COLUMN grade_notified_at DATETIME NULL",
];

const IGNORABLE_CODES = new Set([
  "ER_DUP_FIELDNAME", // 欄位已存在
  "ER_NO_SUCH_TABLE", // 對應的表還沒被建立（initDB 尚未跑）
  "ER_BAD_FIELD_ERROR", // 其它衍生欄位錯誤一併忽略
  "ER_CANT_DROP_FIELD_OR_KEY",
  "ER_DUP_KEYNAME", // 索引已存在
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
