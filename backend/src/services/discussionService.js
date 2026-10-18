import { DiscussionModel } from "../models/discussionModel.js";
import { CourseModel } from "../models/courseModel.js";
import { AuthModel } from "../models/authModel.js";
import { PdfHelper } from "../utils/pdfHelper.js";
import { NotificationService, previewText } from "./notificationService.js";

export const DiscussionService = {
  async getCourseDiscussions(courseCode) {
    const course = await CourseModel.findCourseByCode(courseCode);
    if (!course) throw new Error("找不到課程");
    return DiscussionModel.getRoomsByCourseId(course.id);
  },

  async createDiscussion(courseCode, title, content, aiPrompt, file, actorUsername = null) {
    const course = await CourseModel.findCourseByCode(courseCode);
    if (!course) throw new Error("找不到課程");

    const filePath = file ? `uploads/${file.filename}` : null;
    const roomId = await DiscussionModel.createRoom(course.id, title, content, aiPrompt, filePath, actorUsername);

    try {
      await NotificationService.notifyByCourseCode({
        courseCode,
        type: "discussion",
        refId: roomId,
        headline: `新討論：${title}`,
        message: previewText(content),
        excludeUsername: actorUsername,
        linkPath: `/course/${courseCode}/discussion/${roomId}`,
      });
    } catch (notifyError) {
      console.error("[notify] 討論主題通知失敗", notifyError?.message || notifyError);
    }
  },

  async updateDiscussion(roomId, { title, content, aiPrompt, file, clearFile }) {
    const room = await DiscussionModel.getRoomById(roomId);
    if (!room) throw new Error("找不到討論區");
    const filePath = file ? `uploads/${file.filename}` : null;
    await DiscussionModel.updateRoom(roomId, {
      title,
      content,
      aiPrompt,
      filePath,
      clearFile: clearFile === true || clearFile === "1" || clearFile === "true",
    });
  },

  async updateThread(threadId, username, role, content) {
    const thread = await DiscussionModel.getThreadById(threadId);
    if (!thread) throw new Error("找不到留言");
    if (thread.student_id === "AI") throw new Error("無法修改 AI 留言");
    const isStaff = role === "teacher" || role === "ta";
    const isOwner = Boolean(thread.author_username) && thread.author_username === username;
    if (!isStaff && !isOwner) throw new Error("權限不足");
    if (!String(content || "").trim()) throw new Error("內容不能為空");
    await DiscussionModel.updateThreadContent(threadId, content);
  },

  async deleteThread(threadId, username, role) {
    const thread = await DiscussionModel.getThreadById(threadId);
    if (!thread) throw new Error("找不到留言");
    if (thread.student_id === "AI" && role !== "teacher" && role !== "ta") {
      throw new Error("權限不足");
    }
    const isStaff = role === "teacher" || role === "ta";
    const isOwner = Boolean(thread.author_username) && thread.author_username === username;
    if (!isStaff && !isOwner) throw new Error("權限不足");
    await DiscussionModel.deleteThread(threadId);
  },

  async deleteDiscussion(roomId) {
    await DiscussionModel.deleteRoom(roomId);
  },

  async getRoomAndThreads(roomId) {
    const room = await DiscussionModel.getRoomById(roomId);
    if (!room) throw new Error("找不到討論區");
    const threads = await DiscussionModel.getThreadsByRoomId(roomId);
    return { room, threads };
  },

  async addThreadAndTriggerAI(roomId, userId, content, parentThreadId, requestAi = false, actorRole = null) {
    const user = await AuthModel.findAccountByUsernameOrEmail(userId);
    if (!user) throw new Error("找不到使用者");

    // 1. 寫入使用者留言
    const newThreadId = await DiscussionModel.createThread(roomId, user.id, content, parentThreadId);

    const roomInfo = await DiscussionModel.getRoomById(roomId);
    if (roomInfo?.course_code) {
      try {
        await NotificationService.notifyByCourseCode({
          courseCode: roomInfo.course_code,
          type: "discussion_post",
          refId: roomId,
          headline: `討論區新留言：${roomInfo.title}`,
          message: previewText(content),
          excludeUsername: userId,
          linkPath: `/course/${roomInfo.course_code}/discussion/${roomId}`,
        });
      } catch (notifyError) {
        console.error("[notify] 討論留言通知失敗", notifyError?.message || notifyError);
      }
    }
    // 沒要求 AI 回覆或沒有設定 AI，結束處理（通知已在上方送出）
    if (!requestAi || !roomInfo?.ai_prompt?.trim()) return;

    // 2. 處理 AI 邏輯
    const posterRole = actorRole || user.role;
    let currentUserRoleStr = posterRole === "teacher" ? "老師" : posterRole === "ta" ? "助教" : "學生";
    const pdfText = await PdfHelper.extractText(roomInfo.file_path);

    // 3. 追溯對話歷史
    let threadChain = [{ role: currentUserRoleStr, content }];
    let currentParentId = parentThreadId;

    while (currentParentId) {
      const pRow = await DiscussionModel.getParentThreadInfo(currentParentId);
      if (!pRow) break;

      let pRoleStr = pRow.student_id === "AI" ? "AI" : pRow.acc_role === "teacher" ? "老師" : pRow.acc_role === "ta" ? "助教" : "學生";
      threadChain.push({ role: pRoleStr, content: pRow.content });
      currentParentId = pRow.parent_thread_id;
    }
    threadChain.reverse(); // 將歷史順序轉正

    let formattedConversation = threadChain.map(msg => `(${msg.role}): ${msg.content}`).join('\n');
    let contextString = `主題:${roomInfo.title}\n內容:${roomInfo.content || ''}\n`;
    if (pdfText) contextString += `\n【附件PDF內容】:\n${pdfText}\n`;
    const finalUserPrompt = `{\n${contextString}\n【歷史討論紀錄】:\n${formattedConversation}}`;

    // 4. 呼叫 OpenAI
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: roomInfo.ai_prompt },
            { role: "user", content: finalUserPrompt }
          ]
        })
      });
      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content;

      // 5. 寫入 AI 回覆
      if (aiReply) {
        await DiscussionModel.createThread(roomId, "AI", aiReply, newThreadId);
      }
    } catch (error) {
      console.error("AI 回覆產生失敗:", error);
      // 就算 AI 失敗，使用者的留言也已經成功存入了，不應該 throw error 阻斷 API
    }
  }
};
