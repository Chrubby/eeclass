import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}
app.use("/uploads", express.static(uploadsRoot));

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Evan+921003", // 換回你原本的密碼
  database: process.env.DB_NAME || "classroom_data",
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  },
});
const upload = multer({ storage });

const initDB = async () => {
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

  try {
    await pool.execute("ALTER TABLE courses ADD COLUMN description TEXT");
  } catch (e) { /* 欄位已存在就忽略 */ }

  try {
    await pool.execute("ALTER TABLE courses ADD COLUMN academic_year VARCHAR(20)");
  } catch (e) { /* 欄位已存在就忽略 */ }
  try {
    await pool.execute("ALTER TABLE courses ADD COLUMN academic_year VARCHAR(20)");
  } catch (e) { /* 欄位已存在就忽略 */ }

  console.log("資料庫檢查與初始化完成");
};
await initDB();


// 註冊功能
app.post("/api/register", async (req, res) => {
  const { username, password, name, role, email } = req.body;
  if (!username || !password || !name || !role || !email) {
    return res.status(400).json({ message: "欄位不完整" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.execute(
      "INSERT INTO accounts (username, password_hash, email, role) VALUES (?, ?, ?, ?)",
      [username, passwordHash, email, role]
    );

    // TA
    if (role === "student" || role === "ta") {
      await pool.execute("INSERT INTO students (name, student_id) VALUES (?, ?)", [name, username]);
    } else if (role === "teacher") {
      await pool.execute("INSERT INTO teachers (name, teacher_id) VALUES (?, ?)", [name, username]);
    }
    res.json({ message: "註冊成功！" });
  } catch (error) {
    res.status(400).json({ message: `註冊失敗，帳號或信箱可能重複：${error.message}` });
  }
});

// 登入功能
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body; // 這裡的 username 可能是信箱或帳號
  try {
    // 支援信箱或帳號登入 (對齊 app.py)
    const [rows] = await pool.execute(
      "SELECT * FROM accounts WHERE username = ? OR email = ?",
      [username, username]
    );
    const account = rows[0];

    if (account && await bcrypt.compare(password, account.password_hash)) {
      res.json({
        message: "登入成功！",
        username: account.username,
        role: account.role
      });
    } else {
      res.status(401).json({ message: "帳號、信箱或密碼錯誤！" });
    }
  } catch (error) {
    res.status(500).json({ message: `資料庫錯誤：${error.message}` });
  }
});

// 取得使用者身分與基本資料
app.get("/api/user_inf", async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ message: "缺少user_id" });

  try {
    const [roleRows] = await pool.execute("SELECT role FROM accounts WHERE username = ?", [userId]);
    if (roleRows.length === 0) return res.status(404).json({ message: "找不到使用者" });

    const role = roleRows[0].role;
    let userRows;
    if (role === "student" || role === "ta") {
      [userRows] = await pool.execute("SELECT * FROM students WHERE student_id = ?", [userId]);
    } else {
      [userRows] = await pool.execute("SELECT * FROM teachers WHERE teacher_id = ?", [userId]);
    }

    return res.json({ role, user: userRows[0] || null });
  } catch (error) {
    return res.status(500).json({ message: "讀取使用者資料失敗" });
  }
});

// 搜尋課程
app.get("/api/courses", async (req, res) => {
  const courseCode = req.query.code;
  const courseName = req.query.name;

  if (!courseCode && !courseName) return res.status(404).json({ message: "找不到課程" });

  try {
    let courseRows;
    if (courseCode) {
      [courseRows] = await pool.execute(
        `SELECT c.* FROM courses c WHERE c.course_code = ? ORDER BY c.created_at DESC LIMIT 1`,
        [courseCode]
      );
    } else {
      [courseRows] = await pool.execute(
        `SELECT c.* FROM courses c WHERE c.course_name LIKE ? ORDER BY c.created_at DESC LIMIT 1`,
        [`%${courseName}%`]
      );
    }

    if (courseRows.length === 0) return res.status(404).json({ message: "找不到課程" });

    const course = courseRows[0];
    const [teacherRows] = await pool.execute(
      `SELECT t.id, t.name, t.teacher_id FROM teachers t
       JOIN teacher_courses tc ON t.id = tc.teacher_id
       WHERE tc.course_id = ?`,
      [course.id]
    );

    course.teachers = teacherRows;
    return res.json(course);
  } catch (error) {
    return res.status(500).json({ message: "課程查詢失敗" });
  }
});

// 學生選課
app.post("/api/enroll", async (req, res) => {
  const { student_id: studentIdentifier, course_code: courseCode } = req.body;
  if (!studentIdentifier || !courseCode) return res.status(400).json({ message: "缺少參數" });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [studentRows] = await connection.execute("SELECT id FROM students WHERE student_id = ?", [studentIdentifier]);
    if (studentRows.length === 0) throw new Error("找不到學生");
    const studentId = studentRows[0].id;

    const [courseRows] = await connection.execute("SELECT id FROM courses WHERE course_code = ?", [courseCode]);
    if (courseRows.length === 0) throw new Error("找不到課程");
    const courseId = courseRows[0].id;

    const [existRows] = await connection.execute("SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?", [studentId, courseId]);
    if (existRows.length > 0) throw new Error("已經選過此課程");

    await connection.execute("INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)", [studentId, courseId]);
    await connection.commit();
    return res.json({ message: "選課成功！" });
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(error.message.includes("已經選過") ? 400 : 404).json({ message: error.message || "選課失敗" });
  } finally {
    if (connection) connection.release();
  }
});

// 取得使用者課程列表
app.get("/api/user_courses", async (req, res) => {
  const { user_id: userId, role } = req.query;
  if (!userId || !role) return res.status(400).json({ message: "缺少 user_id 或 role" });

  try {
    let userRows;
    if (role === "student" || role === "ta") {
      [userRows] = await pool.execute("SELECT id FROM students WHERE student_id = ?", [userId]);
    } else if (role === "teacher") {
      [userRows] = await pool.execute("SELECT id FROM teachers WHERE teacher_id = ?", [userId]);
    } else {
      return res.status(400).json({ message: "role 無效" });
    }

    if (userRows.length === 0) return res.status(404).json({ message: `找不到 ${role}` });
    const userDbId = userRows[0].id;

    let courses;
    if (role === "student" || role === "ta") {
      [courses] = await pool.execute(
        `SELECT c.* FROM courses c JOIN enrollments e ON c.id = e.course_id WHERE e.student_id = ?`,
        [userDbId]
      );
    } else {
      [courses] = await pool.execute(
        `SELECT c.* FROM courses c JOIN teacher_courses tc ON c.id = tc.course_id WHERE tc.teacher_id = ?`,
        [userDbId]
      );
    }

    for (const course of courses) {
      const [teacherRows] = await pool.execute(
        `SELECT t.id, t.name, t.teacher_id FROM teachers t JOIN teacher_courses tc ON t.id = tc.teacher_id WHERE tc.course_id = ?`,
        [course.id]
      );
      course.teachers = teacherRows;
    }

    return res.json(courses);
  } catch (error) {
    return res.status(500).json({ message: "讀取課程失敗" });
  }
});

// 老師建立課程
app.post("/api/create_course", async (req, res) => {
  const { teacher_id: teacherAccount, course_name: courseName, course_code: courseCode, description, academic_year: academicYear } = req.body;
  if (!teacherAccount || !courseName || !courseCode || !academicYear) return res.status(400).json({ message: "缺少必要欄位" });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existRows] = await connection.execute("SELECT id FROM courses WHERE course_code = ?", [courseCode]);
    if (existRows.length > 0) throw new Error("課程代碼已存在");

    const [courseResult] = await connection.execute(
      `INSERT INTO courses (course_name, course_code, description, academic_year) VALUES (?, ?, ?, ?)`,
      [courseName, courseCode, description || "", academicYear]
    );
    const courseId = courseResult.insertId;

    const [teacherRows] = await connection.execute("SELECT id FROM teachers WHERE teacher_id = ?", [teacherAccount]);
    if (teacherRows.length === 0) throw new Error("找不到該老師");

    await connection.execute("INSERT INTO teacher_courses (teacher_id, course_id) VALUES (?, ?)", [teacherRows[0].id, courseId]);
    await connection.commit();
    return res.json({ message: "課程建立成功", course_id: courseId });
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(400).json({ message: error.message || "課程建立失敗" });
  } finally {
    if (connection) connection.release();
  }
});

// 取得課程公告
app.get("/api/announcements", async (req, res) => {
  const { course_code: courseCode, student_id: studentIdentifier } = req.query;
  if (!courseCode) return res.status(400).json({ message: "缺少 course_code" });

  try {
    const [courseRows] = await pool.execute("SELECT id FROM courses WHERE course_code = ?", [courseCode]);
    if (courseRows.length === 0) return res.status(404).json({ message: "找不到課程" });
    const courseId = courseRows[0].id;

    let studentDbId = null;
    if (studentIdentifier) {
      const [studentRows] = await pool.execute("SELECT id FROM students WHERE student_id = ?", [studentIdentifier]);
      if (studentRows.length > 0) studentDbId = studentRows[0].id;
    }

    let announcementRows;
    if (studentDbId) {
      [announcementRows] = await pool.execute(
        `SELECT a.id, a.title, a.content, a.is_pinned, a.created_at, t.name AS teacher_name,
                CASE WHEN ar.id IS NULL THEN FALSE ELSE TRUE END AS is_read
         FROM announcements a
         LEFT JOIN teachers t ON a.teacher_id = t.id
         LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.student_id = ?
         WHERE a.course_id = ?
         ORDER BY a.is_pinned DESC, a.created_at DESC`,
        [studentDbId, courseId]
      );
    } else {
      [announcementRows] = await pool.execute(
        `SELECT a.id, a.title, a.content, a.is_pinned, a.created_at, t.name AS teacher_name, TRUE AS is_read
         FROM announcements a
         LEFT JOIN teachers t ON a.teacher_id = t.id
         WHERE a.course_id = ?
         ORDER BY a.is_pinned DESC, a.created_at DESC`,
        [courseId]
      );
    }

    const announcements = announcementRows.map((item) => ({ ...item, isNew: !item.is_read }));
    return res.json({ course_code: courseCode, course_id: courseId, student_id: studentDbId, announcements });
  } catch (error) {
    return res.status(500).json({ message: "讀取公告失敗" });
  }
});

// 記錄公告已讀
app.post("/api/announcements/read", async (req, res) => {
  const { student_id: studentIdentifier, announcement_id: announcementId } = req.body;
  if (!studentIdentifier || !announcementId) return res.status(400).json({ message: "缺少必要參數" });

  try {
    const [studentRows] = await pool.execute("SELECT id FROM students WHERE student_id = ?", [studentIdentifier]);
    if (studentRows.length === 0) return res.status(404).json({ message: "找不到學生" });

    await pool.execute(
      "INSERT IGNORE INTO announcement_reads (student_id, announcement_id) VALUES (?, ?)",
      [studentRows[0].id, announcementId]
    );
    return res.json({ message: "已記錄已讀" });
  } catch (error) {
    return res.status(500).json({ message: "紀錄已讀失敗" });
  }
});

// 老師新增公告
app.post("/api/announcements/create", async (req, res) => {
  const { course_code: courseCode, teacher_id: teacherAccount, title, content, is_pinned: isPinned = false } = req.body;
  if (!courseCode || !teacherAccount || !title) return res.status(400).json({ message: "缺少必要參數" });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [courseRows] = await connection.execute("SELECT id FROM courses WHERE course_code = ?", [courseCode]);
    if (courseRows.length === 0) throw new Error("找不到課程");

    const [teacherRows] = await connection.execute("SELECT id FROM teachers WHERE teacher_id = ?", [teacherAccount]);
    if (teacherRows.length === 0) throw new Error("找不到老師");

    await connection.execute(
      `INSERT INTO announcements (course_id, teacher_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?)`,
      [courseRows[0].id, teacherRows[0].id, title, content || "", Boolean(isPinned)]
    );

    await connection.commit();
    return res.json({ message: "公告新增成功" });
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(400).json({ message: error.message || "公告新增失敗" });
  } finally {
    if (connection) connection.release();
  }
});


// 老師發布作業
app.post("/api/courses/:courseId/homework", upload.any(), async (req, res) => {
  const courseId = req.params.courseId;
  const { title, deadline, description, questions } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [hwResult] = await connection.execute(
      "INSERT INTO homeworks (course_id, title, deadline, description) VALUES (?, ?, ?, ?)",
      [courseId, title, deadline, description || '']
    );
    const hwId = hwResult.insertId;

    if (questions) {
          const parsedQuestions = JSON.parse(questions);
          for (let i = 0; i < parsedQuestions.length; i++) {
            const q = parsedQuestions[i];
            const fileKey = `file_${i}`;
            const file = req.files ? req.files.find(f => f.fieldname === fileKey) : null;

            const correctFileName = file ? Buffer.from(file.originalname, 'latin1').toString('utf8') : null;

            await connection.execute(
              `INSERT INTO homework_questions
              (homework_id, question_order, title, description, answer_format, has_attachment, file_name, file_path)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [hwId, i + 1, q.title, q.description || '', q.answerFormat, q.hasAttachment ? 1 : 0, correctFileName, file ? `/uploads/${file.filename}` : null]
            );
          }
        }
    await connection.commit();
    res.json({ message: "作業發布成功！" });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "發布失敗: " + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// 獲取課程作業列表
app.get("/api/courses/:courseId/homework", async (req, res) => {
  const { courseId } = req.params;
  const { userId, role } = req.query;
  try {
    const [homeworks] = await pool.execute(
      "SELECT id, title, deadline, description FROM homeworks WHERE course_id = ? ORDER BY id DESC",
      [courseId]
    );
    if (role === 'student' && userId) {
      for (let hw of homeworks) {
        const [subs] = await pool.execute(
          "SELECT id as submissionId, score, feedback FROM homework_submissions WHERE homework_id = ? AND student_id = ?",
          [hw.id, userId]
        );

        if (subs.length > 0) {
          hw.submissionId = subs[0].submissionId;
          hw.score = subs[0].score;
          hw.feedback = subs[0].feedback;
        }
      }
    }

    else if (role === 'teacher') {
      for (let hw of homeworks) {
        const [subStats] = await pool.execute(
          `SELECT
             COUNT(*) as submitCount,
             SUM(CASE WHEN score IS NOT NULL THEN 1 ELSE 0 END) as gradedCount
           FROM homework_submissions
           WHERE homework_id = ?`,
          [hw.id]
        );
        hw.submitCount = subStats[0].submitCount || 0;
        hw.gradedCount = subStats[0].gradedCount || 0;
      }
    }
    res.json(homeworks);
  } catch (error) {
    res.status(500).json({ message: "讀取列表失敗" });
  }
});

// 獲取單一作業詳情
app.get("/api/homework/:hwId", async (req, res) => {
  const { hwId } = req.params;
  try {
    const [hws] = await pool.execute("SELECT * FROM homeworks WHERE id = ?", [hwId]);
    if (hws.length === 0) return res.status(404).json({ message: "找不到作業" });
    const hw = hws[0];
    const [qs] = await pool.execute(
      "SELECT *, question_order as questionOrder, answer_format as answerFormat FROM homework_questions WHERE homework_id = ? ORDER BY question_order",
      [hwId]
    );
    hw.questions = qs;
    res.json(hw);
  } catch (error) {
    res.status(500).json({ message: "讀取作業失敗" });
  }
});

// 學生繳交作業
app.post("/api/homework/:hwId/submit", upload.single("file"), async (req, res) => {
  const { hwId } = req.params;
  const { studentId, answerText } = req.body;
  try {
    const correctFileName = req.file ? Buffer.from(req.file.originalname, 'latin1').toString('utf8') : null;
    const sql = `
      INSERT INTO homework_submissions (homework_id, student_id, answer_text, file_name, file_path)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        answer_text = VALUES(answer_text), file_name = VALUES(file_name),
        file_path = VALUES(file_path), submitted_at = CURRENT_TIMESTAMP
    `;
    await pool.execute(sql, [
      hwId, studentId, answerText || null,
      req.file ? req.file.originalname : null,
      req.file ? `/uploads/${req.file.filename}` : null
    ]);
    res.json({ message: "作業繳交成功！" });
  } catch (error) {
    res.status(500).json({ message: "繳交失敗: " + error.message });
  }
});

// 學生讀取自己的繳交紀錄
app.get("/api/homework/:hwId/my-submission", async (req, res) => {
  const { hwId } = req.params;
  const { studentId } = req.query;
  try {
    const [rows] = await pool.execute(
      "SELECT answer_text, file_name, file_path, score, feedback FROM homework_submissions WHERE homework_id = ? AND student_id = ?",
      [hwId, studentId]
    );
    if (rows.length === 0) return res.json(null); // 代表還沒繳交過
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "讀取繳交紀錄失敗" });
  }
});

// 學生收回作業
app.delete("/api/homework/:hwId/submit", async (req, res) => {
  const { hwId } = req.params;
  const { studentId } = req.body;
  try {
    await pool.execute("DELETE FROM homework_submissions WHERE homework_id = ? AND student_id = ?", [hwId, studentId]);
    res.json({ message: "作業已收回" });
  } catch (error) {
    res.status(500).json({ message: "收回失敗" });
  }
});

// 老師讀取繳交清單
app.get("/api/homework/:hwId/submissions", async (req, res) => {
  const { hwId } = req.params;
  try {
    const [rows] = await pool.execute(
      "SELECT id, student_id as studentId, submitted_at as submittedAt, score, feedback FROM homework_submissions WHERE homework_id = ?",
      [hwId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "讀取清單失敗" });
  }
});

// 老師讀取單一學生的提交內容
app.get("/api/submissions/:submissionId", async (req, res) => {
  const { submissionId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT hs.*, hs.student_id as studentId, hs.submitted_at as submittedAt, hs.answer_text as answerText,
              h.title as homeworkTitle
       FROM homework_submissions hs
       JOIN homeworks h ON h.id = hs.homework_id
       WHERE hs.id = ?`,
      [submissionId]
    );
    if (rows.length === 0) return res.status(404).json({ message: "找不到資料" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "讀取失敗" });
  }
});

// 老師批改評分
app.post("/api/submissions/:submissionId/grade", async (req, res) => {
  const { submissionId } = req.params;
  const { score, feedback } = req.body;
  try {
    await pool.execute(
      "UPDATE homework_submissions SET score = ?, feedback = ?, graded_at = CURRENT_TIMESTAMP WHERE id = ?",
      [score, feedback, submissionId]
    );
    res.json({ message: "批改完成！" });
  } catch (error) {
    res.status(500).json({ message: "評分失敗" });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running at http://127.0.0.1:${port}`));
