import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

import { DOMMatrix } from "canvas";

import authRoutes from "./src/routes/authRoutes.js";
import courseRoutes from "./src/routes/courseRoutes.js";
import announcementRoutes from "./src/routes/announcementRoutes.js";
import discussionRoutes from "./src/routes/discussionRoutes.js";
import homeworkRoutes from "./src/routes/homeworkRoutes.js";

globalThis.DOMMatrix = DOMMatrix;

dotenv.config();

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const AI_CHAT_MAX_MESSAGES = 16;

// async function openAiChat(messages, options = {}) {
//   const key = process.env.OPENAI_API_KEY;
//   if (!key) {
//     const err = new Error("OPENAI_API_KEY 未設定");
//     err.statusCode = 503;
//     throw err;
//   }
//   const body = {
//     model: OPENAI_MODEL,
//     messages,
//   };
//   if (options.jsonMode) {
//     body.response_format = { type: "json_object" };
//   }
//   const res = await fetch(OPENAI_API_URL, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${key}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(body),
//   });
//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) {
//     const err = new Error(data.error?.message || data.message || `OpenAI 請求失敗 (${res.status})`);
//     err.statusCode = 502;
//     throw err;
//   }
//   return data.choices?.[0]?.message?.content || "";
// }

async function getCoursePromptsByCourseId(courseId) {
  if (!courseId) return { discussion_prompt: "", grading_prompt: "" };
  const [rows] = await pool.execute(
    "SELECT chat_prompt, discussion_prompt, grading_prompt FROM course_ai_prompts WHERE course_id = ? ORDER BY updated_at DESC LIMIT 1",
    [courseId]
  );
  const row = rows[0] || {};
  return {
    discussion_prompt: (row.discussion_prompt || row.chat_prompt || "").trim(),
    grading_prompt: (row.grading_prompt || row.chat_prompt || "").trim(),
  };
}

// async function appendSubmissionHistory(submissionId, eventType, payloadObj) {
//   if (!submissionId) return;
//   await pool.execute(
//     "INSERT INTO homework_submission_histories (submission_id, event_type, payload_json) VALUES (?, ?, ?)",
//     [submissionId, eventType, JSON.stringify(payloadObj || {})]
//   );
// }

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

// const uploadDir = path.join(__dirname, "uploads");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir);
// }

// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, uploadsRoot),
//   filename: (_req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
//   },
// });
// const upload = multer({ storage });

// const uploadPdf = multer({
//   storage: storage, // 沿用上面的 storage
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === "application/pdf") {
//       cb(null, true);
//     } else {
//       // 如果不是 PDF，拒絕上傳
//       cb(new Error("只允許上傳 PDF 檔案"), false);
//     }
//   },
//   limits: { fileSize: 10 * 1024 * 1024 }, // 限制 10MB
// });

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/discussions", discussionRoutes);
app.use("/api", homeworkRoutes);

// // 取得課程討論區列表
// app.get("/api/courses/:courseCode/discussions", async (req, res) => {
//   const { courseCode } = req.params;
//   try {
//     const [courseRows] = await pool.execute("SELECT id FROM courses WHERE course_code = ?", [courseCode]);

//     if (courseRows.length === 0) {
//       return res.status(404).json({ message: "找不到課程" });
//     }
//     const courseId = courseRows[0].id;

//     const [rows] = await pool.execute(
//       `SELECT id, title, created_at as date, '教授' as author
//        FROM discussion_rooms
//        WHERE course_id = ?
//        ORDER BY created_at DESC`,
//       [courseId]
//     );

//     res.json(rows);
//   } catch (error) {
//     console.error("資料庫查詢失敗:", error.message);
//     res.status(500).json({ message: "讀取討論區失敗", error: error.message });
//   }
// });

// // 新增討論主題
// app.post("/api/discussions/create", uploadPdf.single("file"), async (req, res) => {
//   const { course_code, title, content, ai_prompt } = req.body; // 接收 content
//   const file = req.file; //取出檔案
//   if (!course_code || !title) return res.status(400).json({ message: "缺少必要參數" });

//   try {
//     const [courseRows] = await pool.execute("SELECT id FROM courses WHERE course_code = ?", [course_code]);
//     if (courseRows.length === 0) throw new Error("找不到課程");
//     const courseId = courseRows[0].id;

//     const filePath = file ? `uploads/${file.filename}` : null;

//     await pool.execute(
//       "INSERT INTO discussion_rooms (course_id, title, content, ai_prompt, file_path) VALUES (?, ?, ?, ?, ?)",
//       [courseId, title, content || "", ai_prompt || "", filePath]
//     );
//     res.json({ message: "討論區建立成功" });
//   } catch (error) {
//     res.status(500).json({ message: "建立失敗: " + error.message });
//   }
// });

// //刪除討論區
// app.delete('/api/discussions/:id', async (req, res) => {
//   const { id } = req.params

//   try {
//     await pool.execute(
//       'DELETE FROM discussion_rooms WHERE id = ?',
//       [id]
//     )

//     res.json({ message: '刪除成功' })
//   } catch (err) {
//     console.error(err)
//     res.status(500).json({ error: '刪除失敗' })
//   }
// })

// // 取得特定討論區的主題內容與所有留言
// app.get("/api/discussions/:roomId/threads", async (req, res) => {
//   const { roomId } = req.params;
//   try {
//     const [room] = await pool.execute(
//       "SELECT title, content, file_path FROM discussion_rooms WHERE id = ?", [roomId]
//     );

//     const [threads] = await pool.execute(`
//       SELECT t.*,
//              IFNULL(a.role, 'ai') as role,
//              CASE WHEN t.student_id = 'AI' THEN 'AI 助教'
//                   WHEN a.role = 'teacher' THEN (SELECT name FROM teachers WHERE teacher_id = a.username LIMIT 1)
//                   ELSE (SELECT name FROM students WHERE student_id = a.username LIMIT 1)
//              END as author_name
//       FROM threads t
//       LEFT JOIN accounts a ON t.student_id != 'AI' AND t.student_id = a.id
//       WHERE t.room_id = ?
//       ORDER BY t.created_at ASC
//     `, [roomId]);

//     res.json({ room: room[0], threads });
//   } catch (error) {
//     res.status(500).json({ message: "讀取內容失敗" });
//   }
// });

// // 新增留言
// app.post("/api/discussions/:roomId/threads", async (req, res) => {
//   const { roomId } = req.params;
//   const { user_id, content, parent_thread_id } = req.body;

//   if (!content) return res.status(400).json({ message: "內容不能為空" });

//   try {

//     const [acc] = await pool.execute("SELECT id, role FROM accounts WHERE username = ?", [user_id]);
//     if (acc.length === 0) return res.status(404).json({ message: "找不到使用者" });

//     const [insertResult] = await pool.execute(
//       "INSERT INTO threads (room_id, student_id, content, parent_thread_id) VALUES (?, ?, ?, ?)",
//       [roomId, acc[0].id, content, parent_thread_id || null]
//     );

//     const [roomRows] = await pool.execute(
//       "SELECT title, content, ai_prompt, file_path FROM discussion_rooms WHERE id = ?",
//       [roomId]
//     );
//     const roomInfo = roomRows[0];
//     const aiPrompt = roomRows[0]?.ai_prompt;

//     if (aiPrompt) {
//       let currentUserRoleStr = "學生";
//       if (acc[0].role === "teacher") currentUserRoleStr = "老師";
//       else if (acc[0].role === "ta") currentUserRoleStr = "助教";

//       //讀取並解析 PDF 內容
//       let pdfText = "";
//       if (roomInfo.file_path) {
//         try {
//           const fullPath = path.resolve(roomInfo.file_path);
//           if (fs.existsSync(fullPath)) {

//             const dataBuffer = new Uint8Array(fs.readFileSync(fullPath));

//             // 載入 PDF 文件
//             const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
//             const pdfDocument = await loadingTask.promise;

//             const maxPages = Math.min(pdfDocument.numPages, 20);

//             // 逐頁取出文字
//             for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
//               const page = await pdfDocument.getPage(pageNum);
//               const textContent = await page.getTextContent();

//               // 將該頁的所有文字片段組合起來
//               const pageText = textContent.items.map(item => item.str).join(" ");
//               pdfText += pageText + "\n";
//             }

//             pdfText = pdfText.substring(0, 50000);
//           }
//         } catch (pdfErr) {
//           console.error("PDF 解析失敗 (pdfjs-dist):", pdfErr.message);
//           // 就算解析失敗，程式依然會繼續執行，只是沒有附件內容
//         }
//       }

//       // 放入最新留言
//       let threadChain = [{
//         role: currentUserRoleStr,
//         content: content
//       }];

//       // 往上追溯所有的父留言
//       let currentParentId = parent_thread_id;
//       while (currentParentId) {
//         const [parentRows] = await pool.execute(
//           `SELECT t.parent_thread_id, t.content, t.student_id, a.role as acc_role
//            FROM threads t
//            LEFT JOIN accounts a ON t.student_id != 'AI' AND t.student_id = a.id
//            WHERE t.id = ?`,
//           [currentParentId]
//         );

//         if (parentRows.length === 0) break;
//         const pRow = parentRows[0];

//         // 轉換父留言的身分
//         let pRoleStr = "學生";
//         if (pRow.student_id === "AI") pRoleStr = "AI";
//         else if (pRow.acc_role === "teacher") pRoleStr = "老師";
//         else if (pRow.acc_role === "ta") pRoleStr = "助教";

//         // 將父留言推入陣列
//         threadChain.push({
//           role: pRoleStr,
//           content: pRow.content
//         });

//         // 將指標移到上一層的 parent_thread_id 繼續找
//         currentParentId = pRow.parent_thread_id;
//       }

//       // 反轉陣列
//       threadChain.reverse();

//       let formattedConversation = "";
//       threadChain.forEach((msg, index) => {
//         formattedConversation += `(${msg.role}): ${msg.content}\n`;
//       });

//       // 最終要傳給 AI 的完整內容
//       let contextString = `主題:${roomInfo.title}\n內容:${roomInfo.content || ''}\n`;
//       if (pdfText) {
//         contextString += `\n【附件PDF內容】:\n${pdfText}\n`;
//       }

//       const finalUserPrompt = `{\n${contextString}\n【歷史討論紀錄】:\n${formattedConversation}}`;

//       // 呼叫 OpenAI API
//       const messages = [
//         { role: "system", content: aiPrompt },
//         { role: "user", content: finalUserPrompt }
//       ];

//       const response = await fetch("https://api.openai.com/v1/chat/completions", {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           model: "gpt-4o-mini",
//           messages
//         })
//       });

//       const data = await response.json();
//       const aiReply = data.choices?.[0]?.message?.content;

//       if (aiReply) {
//         // 存 AI 回覆
//         const aiParentId = insertResult.insertId;

//         await pool.execute(
//           "INSERT INTO threads (room_id, student_id, content, parent_thread_id) VALUES (?, ?, ?, ?)",
//           [roomId, "AI", aiReply, aiParentId] // AI 回覆指向原留言
//         );
//       }
//     }

//     res.json({ message: "發表成功" });
//   } catch (error) {
//     console.error("發表留言失敗:", error.message);
//     res.status(500).json({ message: "伺服器錯誤" });
//   }
// });

// // 老師發布作業（附件統一在作業主表 attachments_json；子題不再掛檔）
// app.post("/api/courses/:courseId/homework", upload.any(), async (req, res) => {
//   const courseId = req.params.courseId;
//   const { title, deadline, description, questions } = req.body;
//   let connection;
//   try {
//     connection = await pool.getConnection();
//     await connection.beginTransaction();

//     const [hwResult] = await connection.execute(
//       "INSERT INTO homeworks (course_id, title, deadline, description, attachments_json) VALUES (?, ?, ?, ?, ?)",
//       [courseId, title, deadline, description || '', "[]"]
//     );
//     const hwId = hwResult.insertId;

//     const mainFiles = (req.files || []).filter((f) => f.fieldname === "homework_files" || f.fieldname === "homework_file");
//     const attachments = [];
//     for (const file of mainFiles) {
//       const correctFileName = Buffer.from(file.originalname, "latin1").toString("utf8");
//       attachments.push({
//         file_name: correctFileName,
//         file_path: `/uploads/${file.filename}`,
//       });
//     }
//     await connection.execute("UPDATE homeworks SET attachments_json = ? WHERE id = ?", [
//       JSON.stringify(attachments),
//       hwId,
//     ]);

//     if (questions) {
//       const parsedQuestions = JSON.parse(questions);
//       for (let i = 0; i < parsedQuestions.length; i++) {
//         const q = parsedQuestions[i];
//         await connection.execute(
//           `INSERT INTO homework_questions
//           (homework_id, question_order, title, description, answer_format, has_attachment, file_name, file_path, ai_prompt, discussion_prompt)
//           VALUES (?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?)`,
//           [
//             hwId,
//             i + 1,
//             q.title,
//             q.description || "",
//             q.answerFormat,
//             q.aiPrompt || q.ai_prompt || q.gradingPrompt || "",
//             q.discussionPrompt || q.discussion_prompt || "",
//           ]
//         );
//       }
//     }
//     await connection.commit();
//     res.json({ message: "作業發布成功！" });
//   } catch (error) {
//     if (connection) await connection.rollback();
//     res.status(500).json({ message: "發布失敗: " + error.message });
//   } finally {
//     if (connection) connection.release();
//   }
// });

// // 獲取課程作業列表
// app.get("/api/courses/:courseId/homework", async (req, res) => {
//   const { courseId } = req.params;
//   const { userId, role } = req.query;
//   try {
//     const [homeworks] = await pool.execute(
//       "SELECT id, title, deadline, description FROM homeworks WHERE course_id = ? ORDER BY id DESC",
//       [courseId]
//     );
//     if (role === 'student' && userId) {
//       for (let hw of homeworks) {
//         const [subs] = await pool.execute(
//           "SELECT id as submissionId, score, feedback FROM homework_submissions WHERE homework_id = ? AND student_id = ?",
//           [hw.id, userId]
//         );

//         if (subs.length > 0) {
//           hw.submissionId = subs[0].submissionId;
//           hw.score = subs[0].score;
//           hw.feedback = subs[0].feedback;
//         }
//       }
//     }

//     else if (role === 'teacher') {
//       for (let hw of homeworks) {
//         const [subStats] = await pool.execute(
//           `SELECT
//              COUNT(*) as submitCount,
//              SUM(CASE WHEN score IS NOT NULL THEN 1 ELSE 0 END) as gradedCount
//            FROM homework_submissions
//            WHERE homework_id = ?`,
//           [hw.id]
//         );
//         hw.submitCount = subStats[0].submitCount || 0;
//         hw.gradedCount = subStats[0].gradedCount || 0;
//       }
//     }
//     res.json(homeworks);
//   } catch (error) {
//     res.status(500).json({ message: "讀取列表失敗" });
//   }
// });

// // 獲取單一作業詳情
// app.get("/api/homework/:hwId", async (req, res) => {
//   const { hwId } = req.params;
//   try {
//     const [hws] = await pool.execute("SELECT * FROM homeworks WHERE id = ?", [hwId]);
//     if (hws.length === 0) return res.status(404).json({ message: "找不到作業" });
//     const hw = hws[0];
//     let attachments = [];
//     try {
//       if (hw.attachments_json) attachments = JSON.parse(hw.attachments_json);
//     } catch {
//       attachments = [];
//     }
//     hw.attachments = Array.isArray(attachments) ? attachments : [];
//     hw.attachment_url = hw.attachments[0]?.file_path || null;

//     const [qs] = await pool.execute(
//       "SELECT * FROM homework_questions WHERE homework_id = ? ORDER BY question_order",
//       [hwId]
//     );
//     hw.questions = qs.map((q) => ({
//       ...q,
//       questionOrder: q.question_order,
//       answerFormat: q.answer_format,
//       hasAttachment: Boolean(q.has_attachment),
//       filePath: q.file_path,
//       fileName: q.file_name,
//       discussionPrompt: q.discussion_prompt || "",
//     }));
//     res.json(hw);
//   } catch (error) {
//     res.status(500).json({ message: "讀取作業失敗" });
//   }
// });

// // 學生繳交作業
// app.post("/api/homework/:hwId/submit", upload.single("file"), async (req, res) => {
//   const { hwId } = req.params;
//   const { studentId, answerText } = req.body;
//   try {
//     const correctFileName = req.file ? Buffer.from(req.file.originalname, 'latin1').toString('utf8') : null;
//     const sql = `
//       INSERT INTO homework_submissions (homework_id, student_id, answer_text, file_name, file_path)
//       VALUES (?, ?, ?, ?, ?)
//       ON DUPLICATE KEY UPDATE
//         answer_text = VALUES(answer_text), file_name = VALUES(file_name),
//         file_path = VALUES(file_path), submitted_at = CURRENT_TIMESTAMP
//     `;
//     await pool.execute(sql, [
//       hwId, studentId, answerText || null,
//       req.file ? correctFileName : null,
//       req.file ? `/uploads/${req.file.filename}` : null
//     ]);
//     const [rows] = await pool.execute(
//       "SELECT id FROM homework_submissions WHERE homework_id = ? AND student_id = ?",
//       [hwId, studentId]
//     );
//     await appendSubmissionHistory(rows[0]?.id, "submit", {
//       studentId,
//       hasFile: Boolean(req.file),
//       fileName: correctFileName,
//       answerText: answerText || "",
//     });
//     res.json({ message: "作業繳交成功！" });
//   } catch (error) {
//     res.status(500).json({ message: "繳交失敗: " + error.message });
//   }
// });

// // 學生讀取自己的繳交紀錄
// app.get("/api/homework/:hwId/my-submission", async (req, res) => {
//   const { hwId } = req.params;
//   const { studentId } = req.query;
//   try {
//     const [rows] = await pool.execute(
//       "SELECT id, answer_text, file_name, file_path, score, feedback, graded_details, ai_estimated_score, ai_estimated_reason, ai_estimated_at FROM homework_submissions WHERE homework_id = ? AND student_id = ?",
//       [hwId, studentId]
//     );
//     if (rows.length === 0) return res.json(null); // 代表還沒繳交過
//     res.json(rows[0]);
//   } catch (error) {
//     res.status(500).json({ message: "讀取繳交紀錄失敗" });
//   }
// });

// // 學生收回作業
// app.delete("/api/homework/:hwId/submit", async (req, res) => {
//   const { hwId } = req.params;
//   const { studentId } = req.body;
//   try {
//     const [rows] = await pool.execute(
//       "SELECT id FROM homework_submissions WHERE homework_id = ? AND student_id = ?",
//       [hwId, studentId]
//     );
//     const subId = rows[0]?.id || null;
//     await appendSubmissionHistory(subId, "unsubmit", { studentId });
//     await pool.execute("DELETE FROM homework_submissions WHERE homework_id = ? AND student_id = ?", [hwId, studentId]);
//     res.json({ message: "作業已收回" });
//   } catch (error) {
//     res.status(500).json({ message: "收回失敗" });
//   }
// });

// // 老師讀取繳交清單
// app.get("/api/homework/:hwId/submissions", async (req, res) => {
//   const { hwId } = req.params;
//   try {
//     const [rows] = await pool.execute(
//       "SELECT id, student_id as studentId, submitted_at as submittedAt, score, feedback, ai_estimated_score as aiEstimatedScore, ai_estimated_at as aiEstimatedAt FROM homework_submissions WHERE homework_id = ?",
//       [hwId]
//     );
//     res.json(rows);
//   } catch (error) {
//     res.status(500).json({ message: "讀取清單失敗" });
//   }
// });

// // 老師讀取單一學生的提交內容
// app.get("/api/submissions/:submissionId", async (req, res) => {
//   const { submissionId } = req.params;
//   try {
//     const [rows] = await pool.execute(
//       `SELECT hs.*, hs.student_id as studentId, hs.submitted_at as submittedAt, hs.answer_text as answerText,
//               h.title as homeworkTitle
//        FROM homework_submissions hs
//        JOIN homeworks h ON h.id = hs.homework_id
//        WHERE hs.id = ?`,
//       [submissionId]
//     );
//     if (rows.length === 0) return res.status(404).json({ message: "找不到資料" });
//     res.json(rows[0]);
//   } catch (error) {
//     res.status(500).json({ message: "讀取失敗" });
//   }
// });

// // 老師批改評分
// app.post("/api/submissions/:submissionId/grade", async (req, res) => {
//   const { submissionId } = req.params;
//   const { score, feedback, gradedDetails } = req.body;
//   try {
//     await pool.execute(
//       "UPDATE homework_submissions SET score = ?, feedback = ?, graded_details = ?, graded_at = CURRENT_TIMESTAMP WHERE id = ?",
//       [
//         score ?? null,
//         feedback ?? null,
//         gradedDetails ? JSON.stringify(gradedDetails) : null,
//         submissionId
//       ]
//     );
//     await appendSubmissionHistory(submissionId, "teacher_grade", {
//       score: score ?? null,
//       feedback: feedback ?? null,
//       gradedDetails: gradedDetails || null,
//     });
//     res.json({ message: "批改完成！" });
//   } catch (error) {
//     console.error("詳細錯誤：", error);
//     res.status(500).json({ message: "評分失敗" });
//   }
// });

// app.get("/api/submissions/:submissionId/history", async (req, res) => {
//   const { submissionId } = req.params;
//   try {
//     const [subRows] = await pool.execute(
//       "SELECT id, homework_id, student_id as studentId, score, feedback, ai_estimated_score as aiEstimatedScore, ai_estimated_reason as aiEstimatedReason, ai_estimated_at as aiEstimatedAt, submitted_at as submittedAt, graded_at as gradedAt FROM homework_submissions WHERE id = ?",
//       [submissionId]
//     );
//     if (subRows.length === 0) return res.status(404).json({ message: "找不到繳交紀錄" });

//     const [historyRows] = await pool.execute(
//       "SELECT id, event_type as eventType, payload_json as payloadJson, created_at as createdAt FROM homework_submission_histories WHERE submission_id = ? ORDER BY created_at ASC",
//       [submissionId]
//     );
//     const history = historyRows.map((r) => {
//       let payload = {};
//       try { payload = r.payloadJson ? JSON.parse(r.payloadJson) : {}; } catch {}
//       return { id: r.id, eventType: r.eventType, createdAt: r.createdAt, payload };
//     });

//     return res.json({
//       submission: subRows[0],
//       finalAiScore: subRows[0].aiEstimatedScore,
//       history,
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "讀取歷程失敗" });
//   }
// });

// 儲存聊天紀錄
app.post("/api/ai-chat", async (req, res) => {
  const { course_code, student_code, role, message } = req.body;

  try {
    const [courseRows] = await pool.execute(
      "SELECT id FROM courses WHERE course_code = ?",
      [course_code]
    );

    if (courseRows.length === 0) {
      return res.status(404).json({ message: "找不到課程" });
    }

    const course_id = courseRows[0].id;

    const [studentRows] = await pool.execute(
      "SELECT id FROM students WHERE student_id = ?",
      [student_code]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: "找不到學生" });
    }

    const student_id = studentRows[0].id;

    await pool.execute(
      `INSERT INTO ai_chat_messages
       (course_id, student_id, role, message)
       VALUES (?, ?, ?, ?)`,
      [course_id, student_id, role, message]
    );

    res.json({ message: "聊天紀錄已儲存" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "寫入失敗" });
  }
});

// 回傳聊天紀錄
app.get("/api/ai-chat/by-code/:courseCode/:studentCode", async (req, res) => {
  const { courseCode, studentCode } = req.params;

  try {
    // 1️⃣ 找 course_id
    const [courseRows] = await pool.execute(
      "SELECT id FROM courses WHERE course_code = ?",
      [courseCode]
    );

    if (courseRows.length === 0) {
      return res.status(404).json({ message: "找不到課程" });
    }

    const course_id = courseRows[0].id;

    const [studentRows] = await pool.execute(
      "SELECT id FROM students WHERE student_id = ?",
      [studentCode]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: "找不到學生" });
    }

    const student_id = studentRows[0].id;

    const [chatRows] = await pool.execute(
      `SELECT * FROM ai_chat_messages
       WHERE course_id = ? AND student_id = ?
       ORDER BY created_at ASC`,
      [course_id, student_id]
    );

    res.json({
      course_id,
      student_id,
      chats: chatRows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取聊天紀錄失敗" });
  }
});

// 詢問AI
app.post("/api/ai/ask", async (req, res) => {
  const { course_code, student_code, message } = req.body;

  if (!course_code || !student_code || !message) {
    return res.status(400).json({
      message: "缺少必要參數",
      errorStep: "param_check"
    });
  }

  let course, student, history, systemPrompt, reply;

  try {
    const [courseRows] = await pool.execute(
      `SELECT id, course_name FROM courses WHERE course_code = ?`,
      [course_code]
    );

    if (!courseRows.length) {
      return res.status(400).json({
        message: "找不到課程",
        errorStep: "query_course"
      });
    }

    course = courseRows[0];

    const [studentRows] = await pool.execute(
      `SELECT id, name, student_id FROM students WHERE student_id = ?`,
      [student_code]
    );

    if (!studentRows.length) {
      return res.status(400).json({
        message: "找不到學生",
        errorStep: "query_student"
      });
    }

    student = studentRows[0];
    const [promptRows] = await pool.execute(
      `
      SELECT
        chat_prompt,
        send_announcements,
        send_assignments,
        send_student_info
      FROM course_ai_prompts
      WHERE course_id = ?
      LIMIT 1
      `,
      [course.id]
    );

    const promptData = promptRows[0] || {};

    systemPrompt =
      promptData.chat_prompt ||
      "你是一位大學課程助教，請用繁體中文回答，並使用 '\\n' 來換行，保持訊息條列與換行，不要用 HTML 標籤。";

    const sendAnnouncements = !!promptData.send_announcements;
    const sendAssignments = !!promptData.send_assignments;
    const sendStudentInfo = !!promptData.send_student_info;

    const [historyRows] = await pool.execute(
      `
      SELECT role, message
      FROM ai_chat_messages
      WHERE course_id = ? AND student_id = ?
      ORDER BY created_at ASC
      LIMIT 10
      `,
      [course.id, student.id]
    );

    history = historyRows.map(r => ({
      role: r.role,
      content: r.message
    }));

    let extraInfo = "";

    if (sendAnnouncements) {
      const [rows] = await pool.execute(
        `
        SELECT title, content, created_at
        FROM announcements
        WHERE course_id = ?
        ORDER BY created_at DESC
        LIMIT 5
        `,
        [course.id]
      );

      if (rows.length) {
        extraInfo += `\n【近期公告】\n`;
        rows.forEach((a, i) => {
          extraInfo += `${i + 1}. ${a.title}\n${a.content || ""}\n`;
        });
      }
    }

    if (sendAssignments) {
      const [rows] = await pool.execute(
        `
        SELECT id, title, description, deadline
        FROM homeworks
        WHERE course_id = ?
        ORDER BY deadline ASC
        LIMIT 5
        `,
        [course_code]
      );

      if (rows.length) {
        extraInfo += `\n【近期作業】\n`;

        for (const hw of rows) {
          extraInfo += `\n作業：${hw.title}\n`;
          extraInfo += `截止：${hw.deadline || "未設定"}\n`;
          extraInfo += `說明：${hw.description || "無"}\n`;

          const [qs] = await pool.execute(
            `
            SELECT question_order, title, description, answer_format
            FROM homework_questions
            WHERE homework_id = ?
            ORDER BY question_order ASC
            `,
            [hw.id]
          );

          for (const q of qs) {
            extraInfo += `
    題目${q.question_order}：
    標題：${q.title}
    內容：${q.description}
    格式：${q.answer_format}
    `;
          }
        }
      }
    }

    if (sendStudentInfo) {
      const [submitted] = await pool.execute(
        `
        SELECT h.title
        FROM homework_submissions s
        JOIN homeworks h ON h.id = s.homework_id
        WHERE s.student_id = ?
        `,
        [student_code]
      );

      const [missing] = await pool.execute(
        `
        SELECT h.id, h.title, h.deadline
        FROM homeworks h
        WHERE h.course_id = ?
        AND h.id NOT IN (
          SELECT homework_id
          FROM homework_submissions
          WHERE student_id = ?
        )
        `,
        [course_code, student_code]
      );

      extraInfo += `
    【學生資訊】
    姓名：${student.name}
    學號：${student.student_id}

    已交作業：
    `;

      submitted.forEach(r => {
        extraInfo += `- ${r.title}\n`;
      });

      extraInfo += `\n未交作業：\n`;

      missing.forEach(r => {
        extraInfo += `- ${r.title}（截止 ${r.deadline || "未設定"}）\n`;
      });
    }

    await pool.execute(
      `
      INSERT INTO ai_chat_messages (course_id, student_id, role, message)
      VALUES (?, ?, 'user', ?)
      `,
      [course.id, student.id, message]
    );

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "system",
              content: "請務必遵守：使用繁體中文、條列式、用 \\n 換行"
            },
            ...(extraInfo
              ? [{
                  role: "system",
                  content: `以下是可參考課程資料：\n${extraInfo}`
                }]
              : []),
            ...history,
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const text = await response.text();

      return res.status(500).json({
        message: "OpenAI API 回覆失敗",
        errorStep: "openai_api",
        errorMessage: text
      });
    }

    const data = await response.json();
    reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({
        message: "OpenAI 回覆內容為空",
        errorStep: "openai_parse"
      });
    }

    await pool.execute(
      `
      INSERT INTO ai_chat_messages (course_id, student_id, role, message)
      VALUES (?, ?, 'assistant', ?)
      `,
      [course.id, student.id, reply]
    );

    res.json({ reply });

  } catch (err) {
    console.error("AI /ask 錯誤:", err);

    res.status(500).json({
      message: "AI 回覆失敗",
      errorStep: "catch_all",
      errorMessage: err.message
    });
  }
});

// AI作業提醒
app.post("/api/ai/remind-homework", async (req, res) => {
  const { course_code, student_code } = req.body;
  const courseCodeTrimmed = course_code?.trim();
  const studentCodeTrimmed = student_code?.trim();

  if (!courseCodeTrimmed || !studentCodeTrimmed)
    return res.status(400).json({ message: "缺少必要參數" });

  try {

    const [homeworks] = await pool.execute(
      `SELECT h.id, h.title, h.deadline
       FROM homeworks h
       WHERE h.course_id = ? AND h.deadline >= NOW()
       ORDER BY h.deadline ASC`,
      [course_code]
    );

    if (homeworks.length === 0)
      return res.json({ reply: "👍 目前沒有任何尚未截止的作業！" });

    const hwIds = homeworks.map(hw => hw.id);
    const [submitted] = await pool.execute(
      `SELECT homework_id FROM homework_submissions
      WHERE student_id = ? AND homework_id IN (${hwIds.map(() => '?').join(',')})`,
      [student_code, ...hwIds]
    );

    const submittedIds = submitted.map(s => s.homework_id);

    const pending = homeworks.filter(hw => !submittedIds.includes(hw.id));

    if (pending.length === 0)
      return res.json({ reply: "👍 你已完成所有尚未截止的作業，辛苦了！" });

    const hwListText = pending
      .map(hw => `• ${hw.title}，截止日期：${hw.deadline.toISOString().split("T")[0]}`)
      .join("\n");

    const userPrompt = `
      你是一位大學課程助教。
      提醒學生下列尚未繳交的作業：
      ${hwListText}
      請簡短、不用太正式
      請使用 Markdown 格式，每個作業換行顯示。
      `;

    // 7️⃣ 呼叫 OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "你是一位大學課程助教，用繁體中文回答。" },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI API Error:", text);
      return res.status(500).json({ message: "OpenAI 回覆失敗", error: text });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply)
      return res.status(500).json({ message: "OpenAI 回覆內容為空" });

    res.json({ reply });

  } catch (err) {
    console.error("remind-homework 錯誤:", err);
    res.status(500).json({ message: "系統錯誤", error: err.message });
  }
});

// 獲得課程AI_Prompt
app.post("/api/ai/get_prompt", async (req, res) => {
  const { course_code } = req.body;

  if (!course_code) {
    return res.status(400).json({
      message: "缺少 course_code",
      errorStep: "param_check"
    });
  }

  try {
    // 1️⃣ course_code → course_id
    const [courseRows] = await pool.execute(
      `SELECT id FROM courses WHERE course_code = ?`,
      [course_code]
    );

    if (!courseRows.length) {
      return res.status(400).json({
        message: "找不到課程",
        errorStep: "course_not_found"
      });
    }

    const courseId = courseRows[0].id;

    // 2️⃣ 取得 prompt（連同三個 bool 一起拿）
    const [promptRows] = await pool.execute(
      `
      SELECT
        id,
        chat_prompt,
        send_announcements,
        send_assignments,
        send_student_info,
        updated_at
      FROM course_ai_prompts
      WHERE course_id = ?
      ORDER BY updated_at DESC
      `,
      [courseId]
    );

    return res.json({
      course_id: courseId,
      prompts: promptRows
    });

  } catch (err) {
    console.error("get_prompt error:", err);

    return res.status(500).json({
      message: "取得 prompt 失敗",
      errorStep: "catch_all",
      errorMessage: err.message
    });
  }
});

// 更新課程chat_AI_Prompt
app.post("/api/ai/prompt/update", async (req, res) => {
  const { course_code, chat_prompt, discussion_prompt, grading_prompt, role } = req.body;

  // 1️⃣ 權限檢查（一定要是 teacher）
  if (role !== "teacher") {
    return res.status(403).json({
      message: "沒有權限修改 prompt",
      errorStep: "permission_denied"
    });
  }

  if (!course_code) {
    return res.status(400).json({
      message: "缺少必要參數",
      errorStep: "param_check"
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 2️⃣ course_code → course_id
    const [courseRows] = await connection.execute(
      `SELECT id FROM courses WHERE course_code = ?`,
      [course_code]
    );

    if (!courseRows.length) {
      return res.status(400).json({
        message: "找不到課程",
        errorStep: "course_not_found"
      });
    }

    const courseId = courseRows[0].id;

    // 3️⃣ 檢查是否已有 prompt
    const [promptRows] = await connection.execute(
      `SELECT id FROM course_ai_prompts WHERE course_id = ?`,
      [courseId]
    );

    const nextDiscussion = (discussion_prompt ?? chat_prompt ?? "").trim();
    const nextGrading = (grading_prompt ?? chat_prompt ?? "").trim();
    if (!nextDiscussion || !nextGrading) {
      return res.status(400).json({ message: "discussion_prompt 與 grading_prompt 皆不可空白" });
    }

    if (promptRows.length > 0) {
      // ✔ 更新
      await connection.execute(
        `UPDATE course_ai_prompts
         SET chat_prompt = ?, discussion_prompt = ?, grading_prompt = ?
         WHERE course_id = ?`,
        [nextDiscussion, nextDiscussion, nextGrading, courseId]
      );
    } else {
      // ✔ 新增
      await connection.execute(
        `INSERT INTO course_ai_prompts (course_id, chat_prompt, discussion_prompt, grading_prompt)
         VALUES (?, ?, ?, ?)`,
        [courseId, nextDiscussion, nextDiscussion, nextGrading]
      );
    }

    await connection.commit();

    return res.json({
      message: "Prompt 更新成功",
      course_id: courseId
    });

  } catch (err) {
    if (connection) await connection.rollback();

    console.error("prompt update error:", err);

    return res.status(500).json({
      message: "更新 prompt 失敗",
      errorStep: "catch_all",
      errorMessage: err.message
    });

  } finally {
    if (connection) connection.release();
  }
});

/** 依繳交與題目 ai_prompt 產生預評分 JSON（供 /api/ai/grade 與批次使用） */
async function runAiGrade(submissionId, homeworkId) {
  const [subRows] = await pool.execute(
    "SELECT * FROM homework_submissions WHERE id = ? AND homework_id = ?",
    [submissionId, homeworkId]
  );
  if (subRows.length === 0) {
    const err = new Error("找不到繳交紀錄");
    err.statusCode = 404;
    throw err;
  }
  const sub = subRows[0];
  const [hwRows] = await pool.execute("SELECT course_id FROM homeworks WHERE id = ?", [homeworkId]);
  const prompts = await getCoursePromptsByCourseId(hwRows[0]?.course_id);

  const [qRows] = await pool.execute(
    "SELECT id, question_order, title, description, answer_format, ai_prompt FROM homework_questions WHERE homework_id = ? ORDER BY question_order",
    [homeworkId]
  );

  let parsedAnswers = [];
  try {
    if (sub.answer_text) parsedAnswers = JSON.parse(sub.answer_text);
  } catch {
    parsedAnswers = [];
  }

  const parts = qRows.map((q, idx) => {
    const ans = parsedAnswers[idx];
    const textPart =
      q.answer_format === "file"
        ? `[檔案繳交] 檔名：${sub.file_name || "無"}，路徑：${sub.file_path || "無"}（無法讀取檔案二進位內容，請依題意與檔名推測）`
        : `[文字作答] ${ans != null && ans !== "" ? String(ans) : "（未作答或無法解析）"}`;
    return (
      `第 ${idx + 1} 題 (id=${q.id}) 標題：${q.title}\n` +
      `題目說明：${q.description || "無"}\n` +
      `教師 AI 評分準則（僅供你評分參考）：\n${(q.ai_prompt || "").trim() || "（未設定）"}\n` +
      `學生作答：\n${textPart}\n`
    );
  });

  const system =
    "你是協助大學教師預評分的助手，請用繁體中文思考，但輸出必須為單一 JSON 物件（不要 markdown）。\n" +
    "輸出鍵名必須為：suggested_score（0–100 的數字）、reason（簡短理由）、feedback（給教師參考的綜合回饋，可含對學生的建議口吻）。\n" +
    "請綜合所有子題與教師準則給出一個整體 suggested_score。\n" +
    `課程評分系統提示（grading_prompt）：${prompts.grading_prompt || "（未設定）"}`;

  const userContent = `作業繳交整合資料：\n\n${parts.join("\n---\n")}`;

  const raw = await openAiChat(
    [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    { jsonMode: true }
  );

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const err = new Error("AI 回傳非有效 JSON");
    err.statusCode = 502;
    err.raw = raw;
    throw err;
  }

  const suggested = Number(parsed.suggested_score);
  if (!Number.isFinite(suggested)) {
    const err = new Error("AI 未提供有效 suggested_score");
    err.statusCode = 502;
    err.raw = parsed;
    throw err;
  }

  return {
    suggested_score: Math.min(100, Math.max(0, suggested)),
    reason: parsed.reason || "",
    feedback: parsed.feedback || "",
  };
}

/** 子題滿分：100 分依子題數分配，餘數由前幾題各 +1，總和必為 100 */
function perQuestionMaxScores(n) {
  if (!n || n < 1) return [100];
  const base = Math.floor(100 / n);
  const rem = 100 - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

/** 單一子題 AI 預評分（suggested_score 為該題配分區間內之分數） */
async function runAiGradeQuestion(submissionId, homeworkId, questionId) {
  const [qRows] = await pool.execute(
    "SELECT id, question_order, title, description, answer_format, ai_prompt FROM homework_questions WHERE homework_id = ? ORDER BY question_order",
    [homeworkId]
  );
  const idx = qRows.findIndex((q) => Number(q.id) === Number(questionId));
  if (idx < 0) {
    const err = new Error("找不到子題");
    err.statusCode = 404;
    throw err;
  }
  const q = qRows[idx];
  const [hwRows] = await pool.execute("SELECT course_id FROM homeworks WHERE id = ?", [homeworkId]);
  const prompts = await getCoursePromptsByCourseId(hwRows[0]?.course_id);
  const maxScores = perQuestionMaxScores(qRows.length);
  const maxForThis = maxScores[idx];

  const [subRows] = await pool.execute(
    "SELECT * FROM homework_submissions WHERE id = ? AND homework_id = ?",
    [submissionId, homeworkId]
  );
  if (subRows.length === 0) {
    const err = new Error("找不到繳交紀錄");
    err.statusCode = 404;
    throw err;
  }
  const sub = subRows[0];

  let parsedAnswers = [];
  try {
    if (sub.answer_text) parsedAnswers = JSON.parse(sub.answer_text);
  } catch {
    parsedAnswers = [];
  }
  const ans = parsedAnswers[idx];
  const studentBlock =
    q.answer_format === "file"
      ? `[檔案繳交] 檔名：${sub.file_name || "無"}（整份作業單檔；無法讀取二進位內容）`
      : `[文字作答] ${ans != null && ans !== "" ? String(ans) : "（未作答）"}`;

  const system =
    "你是協助大學教師預評分的助手。請用繁體中文思考，但輸出必須為單一 JSON 物件（不要 markdown）。\n" +
    `此題滿分為 ${maxForThis} 分。輸出鍵名必須為：suggested_score（0 到此滿分之數字，可為小數但建議為整數）、reason（評分理由）。\n` +
    "除上述兩鍵外不要加入其他欄位。\n" +
    `課程評分系統提示（grading_prompt）：${prompts.grading_prompt || "（未設定）"}`;

  const userContent =
    `題目標題：${q.title}\n題目說明：${q.description || "無"}\n` +
    `教師 AI 評分準則：\n${(q.ai_prompt || "").trim() || "（未設定）"}\n\n` +
    `學生作答：\n${studentBlock}`;

  const raw = await openAiChat(
    [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    { jsonMode: true }
  );

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const err = new Error("AI 回傳非有效 JSON");
    err.statusCode = 502;
    err.raw = raw;
    throw err;
  }
  const suggested = Number(parsed.suggested_score);
  if (!Number.isFinite(suggested)) {
    const err = new Error("AI 未提供有效 suggested_score");
    err.statusCode = 502;
    err.raw = parsed;
    throw err;
  }
  const clamped = Math.min(maxForThis, Math.max(0, suggested));
  return {
    suggested_score: clamped,
    max_score: maxForThis,
    reason: parsed.reason || "",
    question_order: q.question_order,
  };
}

async function runAiGradeAllQuestions(submissionId, homeworkId) {
  const [qRows] = await pool.execute(
    "SELECT id, title FROM homework_questions WHERE homework_id = ? ORDER BY question_order",
    [homeworkId]
  );
  const perQuestion = [];
  let sum = 0;
  for (const row of qRows) {
    try {
      const one = await runAiGradeQuestion(submissionId, homeworkId, row.id);

      perQuestion.push({ questionId: row.id, title: row.title, ...one });
      sum += one.suggested_score;
    } catch (e) {
      perQuestion.push({ questionId: row.id, title: row.title, error: e.message || "失敗" });
    }
  }

  const detailedReason = perQuestion
    .map(p => `【${p.title}】\n${p.reason || p.error}`)
    .join('\n\n');

  return {
    suggested_score: Math.round(sum * 100) / 100,
    reason: detailedReason,
    feedback: JSON.stringify(perQuestion),
    perQuestion,
  };
}

// 學生與 AI 助教對話
app.post("/api/ai/chat", async (req, res) => {
  const { question_id: questionId, homework_id: homeworkId, messages } = req.body;
  if (!questionId || !homeworkId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: "缺少 question_id、homework_id 或 messages" });
  }

  try {
    const [qRows] = await pool.execute(
      "SELECT id, homework_id, title, description, ai_prompt, discussion_prompt FROM homework_questions WHERE id = ? AND homework_id = ?",
      [questionId, homeworkId]
    );
    if (qRows.length === 0) {
      return res.status(404).json({ message: "找不到子題或與作業不符" });
    }
    const q = qRows[0];
    const [hwRows] = await pool.execute("SELECT course_id FROM homeworks WHERE id = ?", [homeworkId]);
    const prompts = await getCoursePromptsByCourseId(hwRows[0]?.course_id);
    const teacherPrompt = (q.discussion_prompt || q.ai_prompt || "").trim() || "（老師未設定此題 AI 解惑準則，請以一般助教方式引導。）";

    const trimmed = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-AI_CHAT_MAX_MESSAGES);

    const systemSafety =
      "你是大學課程的 AI 助教，請用繁體中文回覆。\n" +
      "嚴格禁止：向學生透露評分標準、配分、預估分數、老師的評分細則或任何內部 rubric；不要複述或逐字引用下列「教師內部準則」內容。\n" +
      "你可以：用蘇格拉底式提問、概念提示、常見錯誤方向、學習策略，引導學生自己思考；不要直接給出可當作標準答案的完整解答。\n" +
      "若學生追問分數或標準，請禮貌說明由授課教師評定，你僅能提供學習上的提示。";

    const systemContext =
      `以下是「第 ${q.title}」題的題目說明（可引用給學生看）：\n${q.description || "（無）"}\n\n` +
      `以下是課程討論系統提示（discussion_prompt）：\n${prompts.discussion_prompt || "（未設定）"}\n\n` +
      "以下是教師提供的「內部 AI 評分準則」（僅供你內心參考，不得對學生揭露）：\n" +
      teacherPrompt;

    const openAiMessages = [
      { role: "system", content: systemSafety },
      { role: "system", content: systemContext },
      ...trimmed,
    ];

    const reply = await openAiChat(openAiMessages);
    return res.json({ reply });
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({ message: err.message || "AI 對話失敗" });
  }
});

// 老師端：整份作業 AI 預評分（整體 0–100，舊版相容）
app.post("/api/ai/grade", async (req, res) => {
  const { submissionId, homeworkId } = req.body;
  if (!submissionId || !homeworkId) {
    return res.status(400).json({ message: "缺少 submissionId 或 homeworkId" });
  }

  try {
    const out = await runAiGrade(submissionId, homeworkId);
    await pool.execute(
      "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [out.suggested_score, out.reason || "", submissionId]
    );
    await appendSubmissionHistory(submissionId, "ai_suggestion", {
      mode: "overall",
      suggested_score: out.suggested_score,
      reason: out.reason || "",
      feedback: out.feedback || "",
    });
    return res.json(out);
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({ message: err.message || "AI 評分失敗", raw: err.raw });
  }
});

// 老師端：單一子題 AI 預評分
app.post("/api/ai/grade-question", async (req, res) => {
  const { submissionId, homeworkId, questionId } = req.body;
  if (!submissionId || !homeworkId || !questionId) {
    return res.status(400).json({ message: "缺少 submissionId、homeworkId 或 questionId" });
  }
  try {
    const out = await runAiGradeQuestion(submissionId, homeworkId, questionId);
    await pool.execute(
      "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [out.suggested_score, out.reason || "", submissionId]
    );
    await appendSubmissionHistory(submissionId, "ai_suggestion", {
      mode: "question",
      questionId,
      suggested_score: out.suggested_score,
      max_score: out.max_score,
      reason: out.reason || "",
    });
    return res.json(out);
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({ message: err.message || "AI 評分失敗", raw: err.raw });
  }
});

// 老師端：一鍵全班 AI 預評分（僅回傳建議，不寫入資料庫）
app.post("/api/homework/:hwId/ai-grade-batch", async (req, res) => {
  const { hwId } = req.params;
  try {
    const [subRows] = await pool.execute(
      "SELECT id, student_id as studentId FROM homework_submissions WHERE homework_id = ?",
      [hwId]
    );
    const results = [];
    for (const row of subRows) {
      try {
        const out = await runAiGradeAllQuestions(row.id, Number(hwId));
        await pool.execute(
          "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [out.suggested_score, out.reason || "", row.id]
        );
        await appendSubmissionHistory(row.id, "ai_suggestion", {
          mode: "batch",
          suggested_score: out.suggested_score,
          reason: out.reason || "",
          perQuestion: out.perQuestion || [],
        });
        results.push({
          submissionId: row.id,
          studentId: row.studentId,
          suggested_score: out.suggested_score,
          reason: out.reason,
          feedback: out.feedback,
          perQuestion: out.perQuestion,
        });
      } catch (e) {
        results.push({
          submissionId: row.id,
          studentId: row.studentId,
          error: e.message || "失敗",
        });
      }
    }

    return res.json({ results });
  } catch (err) {
    return res.status(500).json({ message: err.message || "批次預評分失敗" });
  }
});

// 學生端：自行觸發 AI 預估評分（寫回 submission 並記錄歷程）
app.post("/api/homework/:hwId/self-estimate", async (req, res) => {
  const { hwId } = req.params;
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ message: "缺少 studentId" });
  try {
    const [rows] = await pool.execute(
      "SELECT id FROM homework_submissions WHERE homework_id = ? AND student_id = ?",
      [hwId, studentId]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "尚未找到你的繳交紀錄，請先送出作業" });
    }
    const submissionId = rows[0].id;
    const out = await runAiGradeAllQuestions(submissionId, Number(hwId));
    await pool.execute(
      "UPDATE homework_submissions SET ai_estimated_score = ?, ai_estimated_reason = ?, ai_estimated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [out.suggested_score, out.reason || "", submissionId]
    );
    await appendSubmissionHistory(submissionId, "student_self_estimate", {
      studentId,
      suggested_score: out.suggested_score,
      reason: out.reason || "",
      perQuestion: out.perQuestion || [],
    });
    return res.json({
      submissionId,
      suggested_score: out.suggested_score,
      reason: out.reason || "",
      perQuestion: out.perQuestion || [],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "AI 預估評分失敗" });
  }
});

// app.get("/api/courses/:courseId/materials", async (req, res) => {
//   const { courseId } = req.params;
//   try {
//     const [rows] = await pool.execute(
//       "SELECT id, course_id as courseId, uploader_id as uploaderId, file_name as fileName, file_path as filePath, created_at as createdAt FROM course_materials WHERE course_id = ? ORDER BY created_at DESC",
//       [courseId]
//     );
//     return res.json({ materials: rows });
//   } catch (error) {
//     return res.status(500).json({ message: "讀取教材失敗" });
//   }
// });

// app.post("/api/courses/:courseId/materials", upload.single("file"), async (req, res) => {
//   const { courseId } = req.params;
//   const { uploaderId } = req.body;
//   if (!req.file) return res.status(400).json({ message: "請選擇檔案" });
//   try {
//     const fileName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
//     const filePath = `/uploads/${req.file.filename}`;
//     await pool.execute(
//       "INSERT INTO course_materials (course_id, uploader_id, file_name, file_path) VALUES (?, ?, ?, ?)",
//       [courseId, uploaderId || null, fileName, filePath]
//     );
//     return res.json({ message: "教材上傳成功", material: { fileName, filePath } });
//   } catch (error) {
//     return res.status(500).json({ message: "教材上傳失敗" });
//   }
// });

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running at http://127.0.0.1:${port}`));
