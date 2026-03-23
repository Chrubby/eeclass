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

const normalizeTypes = (typesInput) => {
  if (!Array.isArray(typesInput)) return [];
  return typesInput
    .map((t) => String(t || "").trim().toLowerCase())
    .filter((t) => ["pdf", "word"].includes(t));
};

const getAccountRole = async (username) => {
  const [teacherRows] = await pool.execute(
    "SELECT teacher_id FROM teachers WHERE teacher_id = ? LIMIT 1",
    [username],
  );
  if (teacherRows.length > 0) return "teacher";
  return "student";
};

const ensureHomeworkTables = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS homeworks (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      course_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      deadline DATETIME NOT NULL,
      submission_type VARCHAR(16) NOT NULL,
      allowed_file_types JSON NULL,
      created_by VARCHAR(128) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS homework_submissions (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      homework_id BIGINT NOT NULL,
      student_id VARCHAR(128) NOT NULL,
      answer_text LONGTEXT NULL,
      file_name VARCHAR(255) NULL,
      file_path VARCHAR(255) NULL,
      submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      score VARCHAR(32) NULL,
      feedback TEXT NULL,
      graded_at DATETIME NULL,
      UNIQUE KEY uniq_homework_student (homework_id, student_id)
    )
  `);
};

await ensureHomeworkTables();

app.post("/api/register", async (req, res) => {
  const { username, password, name, role, email } = req.body;

  if (!username || !password || !name || !role || !email) {
    return res.status(400).json({ message: "欄位不完整" });
  }

  let connection;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const accountSql =
      "INSERT INTO accounts (username, password_hash, email) VALUES (?, ?, ?)";
    await connection.execute(accountSql, [username, passwordHash, email]);

    if (role === "student") {
      const studentSql =
        "INSERT INTO students (name, student_id) VALUES (?, ?)";
      await connection.execute(studentSql, [name, username]);
    } else if (role === "teacher") {
      const teacherSql =
        "INSERT INTO teachers (name, teacher_id) VALUES (?, ?)";
      await connection.execute(teacherSql, [name, username]);
    } else {
      await connection.rollback();
      return res.status(400).json({ message: "不支援的身份類型" });
    }

    await connection.commit();
    return res.json({ message: "註冊成功！" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return res
      .status(400)
      .json({ message: `註冊失敗，帳號或信箱可能重複：${error.message}` });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "帳號與密碼不可為空" });
  }

  try {
    const sql = "SELECT * FROM accounts WHERE username = ? OR email = ?";
    const [rows] = await pool.execute(sql, [username, username]);
    const account = rows[0];

    if (!account) {
      return res.status(401).json({ message: "帳號、信箱或密碼錯誤！" });
    }

    const isValidPassword = await bcrypt.compare(
      password,
      account.password_hash,
    );
    if (!isValidPassword) {
      return res.status(401).json({ message: "帳號、信箱或密碼錯誤！" });
    }

    const role = await getAccountRole(account.username);
    return res.json({
      message: "登入成功！",
      username: account.username,
      role,
    });
  } catch (error) {
    return res.status(500).json({ message: `資料庫錯誤：${error.message}` });
  }
});

app.post("/api/courses/:courseId/homework", async (req, res) => {
  const {
    title,
    description,
    deadline,
    submissionType,
    allowedFileTypes,
    teacherId,
  } = req.body;
  const courseId = req.params.courseId;

  if (!teacherId || !title || !deadline || !submissionType) {
    return res.status(400).json({ message: "欄位不完整" });
  }
  if (!["text", "file"].includes(submissionType)) {
    return res.status(400).json({ message: "submissionType 不合法" });
  }
  const normalizedTypes =
    submissionType === "file" ? normalizeTypes(allowedFileTypes) : [];
  if (submissionType === "file" && normalizedTypes.length === 0) {
    return res.status(400).json({ message: "檔案型態至少需選一種(pdf/word)" });
  }

  try {
    const sql = `
      INSERT INTO homeworks
      (course_id, title, description, deadline, submission_type, allowed_file_types, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      courseId,
      title,
      description || null,
      deadline,
      submissionType,
      JSON.stringify(normalizedTypes),
      teacherId,
    ]);
    res.json({ message: "作業發布成功！", homeworkId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: `發布失敗：${error.message}` });
  }
});

app.get("/api/courses/:courseId/homework", async (req, res) => {
  const courseId = req.params.courseId;
  const userId = String(req.query.userId || "");
  const role = String(req.query.role || "student");
  if (!userId) {
    return res.status(400).json({ message: "缺少 userId" });
  }

  try {
    const sql = `
      SELECT
        h.id,
        h.title,
        h.description,
        h.deadline,
        h.submission_type AS submissionType,
        h.allowed_file_types AS allowedFileTypes,
        h.created_at AS createdAt,
        hs.id AS submissionId,
        hs.submitted_at AS submittedAt,
        hs.score,
        hs.feedback,
        hs.graded_at AS gradedAt,
        hs.file_name AS fileName
      FROM homeworks h
      LEFT JOIN homework_submissions hs
        ON hs.homework_id = h.id AND hs.student_id = ?
      WHERE h.course_id = ?
      ORDER BY h.deadline DESC
    `;
    const [rows] = await pool.execute(sql, [userId, courseId]);
    const mapped = rows.map((r) => {

      const allowedTypes = typeof r.allowedFileTypes === 'string' ? JSON.parse(r.allowedFileTypes) : (r.allowedFileTypes || []);
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        deadline: r.deadline,
        submissionType: r.submissionType,
        allowedFileTypes: allowedTypes,
        submissionId: r.submissionId,
        submittedAt: r.submittedAt,
        score: r.score,
        feedback: r.feedback,
        gradedAt: r.gradedAt,
        fileName: r.fileName,
        status:
          role === "teacher"
            ? null
            : r.score
              ? "graded"
              : r.submissionId
                ? "submitted"
                : "pending",
      };
    });
    if (role === "teacher") {
      const [summaryRows] = await pool.execute(
        `
        SELECT
          h.id AS homeworkId,
          COUNT(hs.id) AS submitCount,
          SUM(CASE WHEN hs.score IS NOT NULL THEN 1 ELSE 0 END) AS gradedCount
        FROM homeworks h
        LEFT JOIN homework_submissions hs ON hs.homework_id = h.id
        WHERE h.course_id = ?
        GROUP BY h.id
      `,
        [courseId],
      );
      const summaryMap = new Map(
        summaryRows.map((s) => [Number(s.homeworkId), s]),
      );
      return res.json(
        mapped.map((m) => ({
          ...m,
          submitCount: Number(summaryMap.get(m.id)?.submitCount || 0),
          gradedCount: Number(summaryMap.get(m.id)?.gradedCount || 0),
        })),
      );
    }
    return res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: `讀取失敗：${error.message}` });
  }
});

app.get("/api/homework/:hwId", async (req, res) => {
  const hwId = req.params.hwId;
  try {
    const [rows] = await pool.execute(
      `
      SELECT
        id, course_id AS courseId, title, description, deadline,
        submission_type AS submissionType, allowed_file_types AS allowedFileTypes
      FROM homeworks
      WHERE id = ?
      LIMIT 1
      `,
      [hwId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "找不到作業" });
    }
    const row = rows[0];
    res.json({
      ...row,
      allowedFileTypes: typeof row.allowedFileTypes === 'string' ? JSON.parse(row.allowedFileTypes) : (row.allowedFileTypes || []),
    });
  } catch (error) {
    res.status(500).json({ message: `讀取作業失敗：${error.message}` });
  }
});

app.get("/api/homework/:hwId/submissions", async (req, res) => {
  const hwId = req.params.hwId;
  try {
    const [rows] = await pool.execute(
      `
      SELECT
        id,
        student_id AS studentId,
        submitted_at AS submittedAt,
        score,
        feedback,
        file_name AS fileName,
        file_path AS filePath
      FROM homework_submissions
      WHERE homework_id = ?
      ORDER BY submitted_at DESC
      `,
      [hwId],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: `讀取失敗：${error.message}` });
  }
});

app.get("/api/submissions/:submissionId", async (req, res) => {
  const submissionId = req.params.submissionId;
  try {
    const [rows] = await pool.execute(
      `
      SELECT
        hs.id,
        hs.homework_id AS homeworkId,
        hs.student_id AS studentId,
        hs.answer_text AS answerText,
        hs.file_name AS fileName,
        hs.file_path AS filePath,
        hs.submitted_at AS submittedAt,
        hs.score,
        hs.feedback,
        h.title AS homeworkTitle,
        h.submission_type AS submissionType
      FROM homework_submissions hs
      JOIN homeworks h ON h.id = hs.homework_id
      WHERE hs.id = ?
      LIMIT 1
      `,
      [submissionId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "找不到提交資料" });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: `讀取提交失敗：${error.message}` });
  }
});

app.post("/api/homework/:hwId/submit", upload.single("file"), async (req, res) => {
  const hwId = req.params.hwId;
  const { studentId, answerText } = req.body;
  if (!studentId) {
    return res.status(400).json({ message: "缺少 studentId" });
  }

  try {
    const [homeworkRows] = await pool.execute(
      "SELECT submission_type AS submissionType, allowed_file_types AS allowedFileTypes FROM homeworks WHERE id = ? LIMIT 1",
      [hwId],
    );
    if (homeworkRows.length === 0) {
      return res.status(404).json({ message: "找不到作業" });
    }
    const hw = homeworkRows[0];

    if (hw.submissionType === "text") {
      if (!answerText || !String(answerText).trim()) {
        return res.status(400).json({ message: "文字作答不得為空" });
      }
    } else {
      if (!req.file) {
        return res.status(400).json({ message: "請上傳檔案" });
      }
      const allowed = hw.allowedFileTypes ? JSON.parse(hw.allowedFileTypes) : [];
      const ext = path.extname(req.file.originalname).toLowerCase();
      const isPdf = ext === ".pdf";
      const isWord = ext === ".doc" || ext === ".docx";
      const ok =
        (allowed.includes("pdf") && isPdf) ||
        (allowed.includes("word") && isWord);
      if (!ok) {
        return res.status(400).json({ message: "檔案格式不符合作業要求" });
      }
    }

    const sql = `
      INSERT INTO homework_submissions
      (homework_id, student_id, answer_text, file_name, file_path)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        answer_text = VALUES(answer_text),
        file_name = VALUES(file_name),
        file_path = VALUES(file_path),
        submitted_at = CURRENT_TIMESTAMP
    `;
    await pool.execute(sql, [
      hwId,
      studentId,
      hw.submissionType === "text" ? answerText : null,
      req.file ? req.file.originalname : null,
      req.file ? `/uploads/${req.file.filename}` : null,
    ]);
    res.json({ message: "作業繳交成功！" });
  } catch (error) {
    res.status(500).json({ message: `繳交失敗：${error.message}` });
  }
});

app.post("/api/submissions/:submissionId/grade", async (req, res) => {
  const submissionId = req.params.submissionId;
  const { score, feedback } = req.body;
  if (!score) {
    return res.status(400).json({ message: "分數不得為空" });
  }

  try {
    const sql =
      "UPDATE homework_submissions SET score = ?, feedback = ?, graded_at = CURRENT_TIMESTAMP WHERE id = ?";
    await pool.execute(sql, [score, feedback, submissionId]);
    res.json({ message: "批改儲存成功！" });
  } catch (error) {
    res.status(500).json({ message: `批改失敗：${error.message}` });
  }
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => {
  console.log(`Backend API listening on http://127.0.0.1:${port}`);
});
