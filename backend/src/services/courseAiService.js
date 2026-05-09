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

    if (promptData.send_grades) {
      const [grades] = await pool.execute(
        `
        SELECT
          h.id,
          h.title,
          h.deadline,
    
          s.answer_text,
          s.score,
          s.feedback,
          s.submitted_at,
          s.graded_at
    
        FROM homeworks h
    
        LEFT JOIN homework_submissions s
          ON s.homework_id = h.id
          AND s.student_id = ?
    
        WHERE h.course_id = ?
    
        ORDER BY h.deadline ASC
        `,
        [student.student_id, course.id]
      );
    
      extraInfo += `
【學生作業成績分析】
      
`;
    
      if (grades.length === 0) {
        extraInfo += "目前沒有作業資料。\n";
      }
    
      for (const g of grades) {
  
        const [statRows] = await pool.execute(
          `
          SELECT 
            AVG(score) AS avg_score,
            COUNT(*) AS total_submitted,
            COUNT(score) AS graded_count,
    
            MAX(score) AS max_score,
            MIN(score) AS min_score
    
          FROM homework_submissions
          WHERE homework_id = ?
            AND score IS NOT NULL
          `,
          [g.id]
        );
    
        const stats = statRows[0] || {};
  
        const status = g.submitted_at ? "已繳交" : "未繳交";
    
        extraInfo += `
作業：${g.title}
截止：${g.deadline || "未設定"}
狀態：${status}
        
📊 個人成績：
- 分數：${g.score || "未評分"}
- 評語：${g.feedback || "無"}
- 繳交時間：${g.submitted_at || "未繳交"}
        
📊 班級統計：
- 平均分數：${stats.avg_score ? Number(stats.avg_score).toFixed(2) : "無資料"}
- 最高分：${stats.max_score ?? "無資料"}
- 最低分：${stats.min_score ?? "無資料"}
- 繳交人數：${stats.total_submitted || 0}
- 已評分數：${stats.graded_count || 0}
        
--------------------------
`;
    
      }
    }

    console.log(extraInfo)

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
    try {
  
      const [hws] = await pool.execute(`
        SELECT
          h.id,
          h.title,
          h.deadline
        FROM homeworks h
  
        JOIN courses c
          ON c.course_code = h.course_id
  
        LEFT JOIN homework_submissions s
          ON s.homework_id = h.id
          AND s.student_id = ?
  
        WHERE c.course_code = ?
          AND h.deadline >= NOW()
          AND s.id IS NULL
  
        ORDER BY h.deadline ASC
      `, [studentCode, courseCode]);

  
      if (hws.length === 0) {
        return "👍 目前沒有未繳的作業！";
      }
  
      const hwListText = hws.map(h => {
        return `• ${h.title}（截止：${new Date(h.deadline).toLocaleString("zh-TW")}）`;
      }).join("\n");
  
      return await OpenAiHelper.chat([
        {
          role: "system",
          content: "你是一位親切的助教，請用繁體中文提醒學生尚未繳交的作業。"
        },
        {
          role: "user",
          content: `以下是學生尚未繳交的作業：\n${hwListText}`
        }
      ]);
  
    } catch (error) {
      console.error("remindHomework 錯誤：", error);
      return "❌ 作業提醒產生失敗";
    }
  }
};