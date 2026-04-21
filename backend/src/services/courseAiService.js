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
      const [anns] = await pool.execute("SELECT title, content FROM announcements WHERE course_id = ? ORDER BY created_at DESC LIMIT 5", [course.id]);
      extraInfo += "\n【近期公告】\n" + anns.map(a => `- ${a.title}: ${a.content}`).join("\n");
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