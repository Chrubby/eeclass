import { pool } from "../config/db.js";
import { OpenAiHelper } from "../utils/openaiHelper.js";
import { CourseAiModel } from "../models/courseAiModel.js";

export const CourseAiService = {
  async askAssistant(courseCode, studentCode, userMessage) {
    const [courseRows] = await pool.execute("SELECT id, course_name FROM courses WHERE course_code = ?", [courseCode]);
    const [studentRows] = await pool.execute("SELECT id, name, student_id FROM students WHERE student_id = ?", [studentCode]);
    if (!courseRows.length || !studentRows.length) throw new Error("找不到課程或學生");

    const course = courseRows[0];
    const student = studentRows[0];
    const promptData = await CourseAiModel.getPromptsByCourseId(course.id);
    const history = await CourseAiModel.getChatHistory(course.id, student.id);
    let extraInfo = "";
    if (promptData.send_announcements) {
      console.log(1)
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

    if (promptData.send_assignments) {
      console.log(2)
      const [rows] = await pool.execute(
        `
        SELECT id, title, description, deadline
        FROM homeworks
        WHERE course_id = ?
        ORDER BY deadline ASC
        LIMIT 5
        `,
        [course.id]
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

    if (promptData.send_student_info) {
      console.log(3);
    
      const [submitted] = await pool.execute(
        `
        SELECT h.title
        FROM homework_submissions s
        JOIN homeworks h ON h.id = s.homework_id
        WHERE s.student_id = ?
        `,
        [student.id]
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
        [course.id, student.id]
      );
    
      extraInfo += `
    【學生資訊】
    姓名：${student.name}
    學號：${student.student_id}
    
    已交作業：
    `;
    
      if (submitted.length === 0) {
        extraInfo += "- 無\n";
      } else {
        submitted.forEach(r => {
          extraInfo += `- ${r.title}\n`;
        });
      }
    
      extraInfo += `\n未交作業：
    `;
    
      if (missing.length === 0) {
        extraInfo += "- 無\n";
      } else {
        missing.forEach(r => {
          extraInfo += `- ${r.title}（截止 ${r.deadline || "未設定"}）\n`;
        });
      }
    }

    await CourseAiModel.saveMessage(course.id, student.id, 'user', userMessage);
    const reply = await OpenAiHelper.chat([
      { role: "system", content: promptData.chat_prompt || "你是一位大學課程助教。" },
      { role: "system", content: `輔助資料：${extraInfo}` },
      ...history.map(h => ({ role: h.role, content: h.message })),
      { role: "user", content: userMessage }
    ]);

    await CourseAiModel.saveMessage(course.id, student.id, 'assistant', reply);
    return reply;
  },

  async remindHomework(courseCode, studentCode) {
    const [hws] = await pool.execute(
      "SELECT h.title, h.deadline FROM homeworks h JOIN courses c ON c.id = h.course_id WHERE c.course_code = ? AND h.deadline >= NOW()",
      [courseCode]
    );
    if (hws.length === 0) return "👍 目前沒有待交作業！";

    const hwListText = hws.map(h => `• ${h.title} (截止: ${new Date(h.deadline).toLocaleString()})`).join("\n");
    return await OpenAiHelper.chat([
      { role: "system", content: "你是一位親切的助教，請用繁體中文提醒學生未交作業。" },
      { role: "user", content: `未交作業清單：\n${hwListText}` }
    ]);
  }
};