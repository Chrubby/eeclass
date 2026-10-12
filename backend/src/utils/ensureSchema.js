import { pool } from "../config/db.js";

/**
 * 啟動時補齊資料庫缺少的資料表、欄位與索引。
 */
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS course_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    leader_student_id VARCHAR(128) NULL,
    recruitment_enabled TINYINT(1) NOT NULL DEFAULT 0,
    recruitment_message VARCHAR(1000) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_course_group_name (course_id, name),
    CONSTRAINT fk_course_groups_course
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS course_group_memberships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    group_id INT NOT NULL,
    student_id VARCHAR(128) NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_course_group_student (course_id, student_id),
    KEY idx_course_group_memberships_group (group_id),
    CONSTRAINT fk_course_group_memberships_course
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_group_memberships_group
      FOREIGN KEY (group_id) REFERENCES course_groups(id) ON DELETE CASCADE
  )`,
  "ALTER TABLE course_groups ADD COLUMN leader_student_id VARCHAR(128) NULL",
  "ALTER TABLE course_groups ADD COLUMN recruitment_enabled TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE course_groups ADD COLUMN recruitment_message VARCHAR(1000) NULL",
  `CREATE TABLE IF NOT EXISTS course_group_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    group_id INT NOT NULL,
    student_id VARCHAR(128) NOT NULL,
    message VARCHAR(500) NULL,
    status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_group_application_student (group_id, student_id),
    KEY idx_group_application_queue (course_id, group_id, status),
    CONSTRAINT fk_group_applications_course
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_applications_group
      FOREIGN KEY (group_id) REFERENCES course_groups(id) ON DELETE CASCADE
  )`,
  "ALTER TABLE courses ADD COLUMN student_group_creation_enabled TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE homeworks ADD COLUMN is_group_homework TINYINT(1) NOT NULL DEFAULT 0",
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
  // 學生每題各自的檔案，避免新上傳蓋掉其他題
  "ALTER TABLE homework_submissions ADD COLUMN files_json LONGTEXT NULL",
  // 討論主題記錄建立者，舊資料維持 NULL
  "ALTER TABLE discussion_rooms ADD COLUMN created_by VARCHAR(64) NULL",
  // 公告實際發布者；舊公告維持 NULL，畫面仍顯示授課老師
  "ALTER TABLE announcements ADD COLUMN author_username VARCHAR(64) NULL",
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
