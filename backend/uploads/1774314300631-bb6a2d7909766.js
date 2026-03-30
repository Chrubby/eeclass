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
  password: process.env.DB_PASSWORD || "",
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

// 自動初始化資料庫表格
const initDB = async () => {
  // 作業主表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS homeworks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id VARCHAR(50),
      title VARCHAR(255),
      description TEXT,
      deadline DATETIME
    )
  `);

  // 題目明細表 (支援一個作業多個題目)
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

  // 學生繳交紀錄表
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
      "INSERT INTO accounts (username, password_hash, email) VALUES (?, ?, ?)",
      [username, passwordHash, email]
    );

    if (role === "student") {
      await pool.execute("INSERT INTO students (name, student_id) VALUES (?, ?)", [name, username]);
    } else {
      await pool.execute("INSERT INTO teachers (name, teacher_id) VALUES (?, ?)", [name, username]);
    }
    res.json({ message: "註冊成功！" });
  } catch (error) {
    res.status(400).json({ message: "註冊失敗，帳號可能重複" });
  }
});

// 登入功能
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.execute("SELECT * FROM accounts WHERE username = ?", [username]);
    const account = rows[0];
    if (account && await bcrypt.compare(password, account.password_hash)) {
      const [t] = await pool.execute("SELECT * FROM teachers WHERE teacher_id = ?", [username]);
      const role = t.length > 0 ? "teacher" : "student";
      res.json({ message: "登入成功！", username: account.username, role });
    } else {
      res.status(401).json({ message: "帳號或密碼錯誤" });
    }
  } catch (error) {
    res.status(500).json({ message: "登入失敗" });
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

        await connection.execute(
          `INSERT INTO homework_questions
           (homework_id, question_order, title, description, answer_format, has_attachment, file_name, file_path)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [hwId, i + 1, q.title, q.description || '', q.answerFormat, q.hasAttachment ? 1 : 0, file ? file.originalname : null, file ? `/uploads/${file.filename}` : null]
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
