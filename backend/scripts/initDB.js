import { pool } from "../src/config/db.js";

const initDB = async () => {
  console.log("開始進行資料庫檢查與初始化...");

  try {
    // 1. 帳號表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        role VARCHAR(20) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. 學生表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        student_id VARCHAR(50) UNIQUE NOT NULL
        )
    `);

    // 3. 老師表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        teacher_id VARCHAR(50) UNIQUE NOT NULL
        )
    `);

    // 4. 課程主表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_name VARCHAR(100) NOT NULL,
        course_code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        academic_year VARCHAR(20),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 5. 老師與課程關聯表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS teacher_courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id INT NOT NULL,
        course_id INT NOT NULL
        )
    `);

    // 6. 學生選課表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        course_id INT NOT NULL
        )
    `);

    // 7. 公告表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        teacher_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        is_pinned BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 8. 公告已讀紀錄表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS announcement_reads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        announcement_id INT NOT NULL,
        UNIQUE KEY uniq_student_announcement (student_id, announcement_id)
        )
    `);

    // 9. 作業主表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS homeworks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id VARCHAR(50),
        title VARCHAR(255),
        description TEXT,
        deadline DATETIME
        )
    `);

    // 10. 作業題目表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS homework_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        homework_id INT,
        question_order INT,
        title VARCHAR(255),
        description TEXT,
        answer_format VARCHAR(50),
        discussion_prompt TEXT,
        has_attachment BOOLEAN DEFAULT FALSE,
        file_name VARCHAR(255),
        file_path VARCHAR(255)
        )
    `);

    // 11. 作業繳交紀錄表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS homework_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        homework_id INT,
        student_id VARCHAR(128),
        answer_text TEXT,
        file_name VARCHAR(255),
        file_path VARCHAR(255),
        score VARCHAR(10),
        feedback TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        graded_at DATETIME NULL,
        UNIQUE KEY uniq_hw_student (homework_id, student_id)
        )
    `);

    // 12. 討論區
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS discussion_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        room_name VARCHAR(100),
        title VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        )
    `);

    // 13. 討論區留言
    await pool.execute(`
    CREATE TABLE IF NOT EXISTS threads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        student_id VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        parent_thread_id INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (room_id) REFERENCES discussion_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_thread_id) REFERENCES threads(id) ON DELETE CASCADE
    )
    `);

    // 14. 新增課程AI聊天
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        student_id INT NOT NULL,
        role ENUM('user', 'assistant') NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
    `);

    // 15. 建立課程AI_Prompts
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS course_ai_prompts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        chat_prompt TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        )
    `)

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS homework_submission_histories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        submission_id INT NOT NULL,
        event_type VARCHAR(32) NOT NULL,
        payload_json LONGTEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submission_id) REFERENCES homework_submissions(id) ON DELETE CASCADE
        )
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS course_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id VARCHAR(50) NOT NULL,
        uploader_id VARCHAR(64),
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    try {
        await pool.execute("ALTER TABLE courses ADD COLUMN description TEXT");
    } catch (e) { /* 欄位已存在就忽略 */ }

    try {
        await pool.execute("ALTER TABLE homework_submissions ADD COLUMN graded_details TEXT");
    } catch (e) { /* 欄位已存在就忽略 */ }

    try {
        await pool.execute("ALTER TABLE courses ADD COLUMN academic_year VARCHAR(20)");
    } catch (e) { /* 欄位已存在就忽略 */ }
    try {
        await pool.execute("ALTER TABLE courses ADD COLUMN academic_year VARCHAR(20)");
    } catch (e) { /* 欄位已存在就忽略 */ }

    //討論區內容
    try {
        await pool.execute("ALTER TABLE discussion_rooms ADD COLUMN content TEXT");
    } catch (e) { /* 欄位已存在就忽略 */ }
    try {
        await pool.execute("ALTER TABLE discussion_rooms ADD COLUMN ai_prompt TEXT;");
    } catch (e) { /* 欄位已存在就忽略 */ }
    try {
        await pool.execute("ALTER TABLE discussion_rooms ADD COLUMN file_path VARCHAR(255) DEFAULT NULL;");
    } catch (e) { /* 欄位已存在就忽略 */ }

    try {
        await pool.execute("ALTER TABLE homework_questions ADD COLUMN ai_prompt TEXT");
    } catch (e) { /* 欄位已存在就忽略 */ }
    try {
        await pool.execute("ALTER TABLE homework_questions ADD COLUMN discussion_prompt TEXT");
    } catch (e) { /* 欄位已存在就忽略 */ }

    try {
        await pool.execute("ALTER TABLE homeworks ADD COLUMN attachments_json TEXT");
    } catch (e) { /* 欄位已存在就忽略 */ }

    try {
        await pool.execute(`
        ALTER TABLE course_ai_prompts
        ADD COLUMN send_announcements BOOLEAN NOT NULL DEFAULT FALSE
        `)
    } catch (e) { /* 欄位已存在就忽略 */ }

    try {
        await pool.execute(`
        ALTER TABLE course_ai_prompts
        ADD COLUMN send_assignments BOOLEAN NOT NULL DEFAULT FALSE
        `)
    } catch (e) { /* 欄位已存在就忽略 */ }
    try {
        await pool.execute(`
        ALTER TABLE course_ai_prompts
        ADD COLUMN send_student_info BOOLEAN NOT NULL DEFAULT FALSE
        `)
    } catch (e) { /* 欄位已存在就忽略 */ }
    try {
        await pool.execute(`
        ALTER TABLE course_ai_prompts
        ADD COLUMN discussion_prompt TEXT NOT NULL
        `)
    } catch (e) { /* 欄位已存在就忽略 */ }
    try {
        await pool.execute(`
        ALTER TABLE course_ai_prompts
        ADD COLUMN grading_prompt TEXT NOT NULL
        `)
    } catch (e) { /* 欄位已存在就忽略 */ }

    console.log("資料庫檢查與初始化完成");
  } catch (error) {
    console.error("資料庫初始化過程中發生錯誤：", error);
  } finally {
    // 執行完畢後關閉連線池並結束 Process
    await pool.end();
    process.exit(0);
  }
};

initDB();