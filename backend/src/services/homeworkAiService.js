import { pool } from "../config/db.js";
import { OpenAiHelper } from "../utils/openaiHelper.js";
import { CourseAiModel } from "../models/courseAiModel.js";
import { HomeworkModel } from "../models/homeworkModel.js";
import { PdfHelper } from "../utils/pdfHelper.js";
import { tryParseJsonObject } from "../utils/aiJsonParse.js";

export const HomeworkAiService = {
  parseHomeworkAttachments(hw) {
    try {
      const parsed = hw?.attachments_json ? JSON.parse(hw.attachments_json) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async promptsForCourse(courseCode) {
    const byCode = await CourseAiModel.getPromptsByCourseCode(courseCode);
    if (byCode) {
      return {
        discussion_prompt: (byCode.discussion_prompt || byCode.chat_prompt || "").trim(),
        grading_prompt: (byCode.grading_prompt || byCode.chat_prompt || "").trim(),
      };
    }
    return CourseAiModel.getPromptsByCourseId(courseCode);
  },

  // 每次呼叫都從資料庫重新讀題目與 prompt，老師修改後立即生效
  async loadQuestionContext(homeworkId, questionId) {
    const hw = await HomeworkModel.getHomeworkById(homeworkId);
    if (!hw) throw new Error("找不到作業");
    const questions = await HomeworkModel.getQuestionsByHomework(homeworkId);
    const idx = questions.findIndex((q) => q.id === Number(questionId));
    if (idx < 0) throw new Error("找不到子題，作業可能已被修改，請重新整理頁面");
    return { hw, questions, idx, q: questions[idx] };
  },

  homeworkInfo(hw) {
    return [`作業名稱：${hw.title || ""}`, hw.description ? `作業說明：${hw.description}` : ""]
      .filter(Boolean)
      .join("\n");
  },

  questionFile(submission, index) {
    let files = [];
    try {
      const raw = submission?.files_json || submission?.filesJson;
      const parsed = raw ? JSON.parse(raw) : [];
      files = Array.isArray(parsed) ? parsed : [];
    } catch {
      files = [];
    }
    if (files[index]?.file_path) return files[index];
    if (index === 0 && submission?.file_path) {
      return { file_name: submission.file_name, file_path: submission.file_path };
    }
    return null;
  },

  isPdfFile(fileNameOrPath = "") {
    return /\.pdf$/i.test(fileNameOrPath);
  },

  isPdfSubmission(submission) {
    const fileName = submission?.file_name || "";
    const filePath = submission?.file_path || "";
    return this.isPdfFile(fileName) || this.isPdfFile(filePath);
  },

  async buildHomeworkAttachmentContext(hw) {
    const attachments = this.parseHomeworkAttachments(hw);
    if (!attachments.length) return "";

    const blocks = [];
    for (const file of attachments.slice(0, 5)) {
      const fileName = file?.file_name || "未命名檔案";
      const filePath = file?.file_path || "";
     if (this.isPdfFile(fileName) || this.isPdfFile(filePath)) {
        try {
          const text = await PdfHelper.extractText(filePath, 10);
          if (text?.trim()) {
            blocks.push(`檔名：${fileName}\n內容摘錄：\n${text}`);
          } else {
            blocks.push(`檔名：${fileName}\n內容摘錄：無法擷取內容或檔案為空`);
          }
        } catch (error) {
          console.error("讀取老師附件 PDF 失敗：", error);
          console.error("當時嘗試讀取的路徑是：", filePath);
          blocks.push(`檔名：${fileName}\n內容摘錄：無法擷取內容或檔案為空`);
        }
      } else {
        blocks.push(`檔名：${fileName}\n內容摘錄：目前僅支援 PDF 內容解析`);
      }
    }

    return blocks.length ? `【老師作業附件背景知識】\n${blocks.join("\n\n")}` : "";
  },

  perQuestionMaxScores(n) {
    if (!n || n < 1) return [100];
    const base = Math.floor(100 / n);
    const rem = 100 - base * n;
    return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
  },

  async runAiGradeQuestion(submissionId, homeworkId, questionId) {
    const { hw, questions, idx, q } = await this.loadQuestionContext(homeworkId, questionId);
    const prompts = await this.promptsForCourse(hw.course_id);
    const attachmentContext = await this.buildHomeworkAttachmentContext(hw);
    const maxScores = this.perQuestionMaxScores(questions.length);
    const maxForThis = maxScores[idx];

    const sub = await HomeworkModel.getSubmissionDetail(submissionId);
    if (!sub) throw new Error("找不到繳交紀錄");
    let parsedAnswers = [];
    try { if (sub.answer_text) parsedAnswers = JSON.parse(sub.answer_text); } catch { }

    let studentBlock = `[文字作答] ${parsedAnswers[idx] || "（未作答）"}`;
    if (q.answer_format === "file") {
      const questionFile = this.questionFile(sub, idx);
      const fileName = questionFile?.file_name || "無";
      studentBlock = `[檔案繳交] 檔名：${fileName}`;
      if (questionFile && (this.isPdfFile(questionFile.file_name) || this.isPdfFile(questionFile.file_path))) {
        try {
          const pdfText = await PdfHelper.extractText(questionFile.file_path);
          if (pdfText?.trim()) {
            studentBlock += `\n[PDF 內容摘錄]\n${pdfText}`;
          } else {
            studentBlock += `\n[PDF 內容摘錄] （無法擷取內容或檔案為空）`;
          }
        } catch (error) {
          console.error("讀取學生作業 PDF 失敗：", error);
          console.error("當時嘗試讀取的路徑是：", sub.file_path);
          studentBlock += `\n[PDF 內容摘錄] （無法擷取內容或檔案為空）`;
        }
      } else {
        studentBlock += `\n[檔案內容] （目前僅支援 PDF 內容解析）`;
      }
    }

    const system = `你是協助大學教師預評分的助手。輸出必須為單一 JSON。此題滿分為 ${maxForThis} 分。\n` +
      `JSON 鍵名：suggested_score（數字）, reason（給老師看的評分理由）, feedback（可直接給學生的評語）。\n` +
      `請嚴格依照「教師準則」評分。\n課程評分提示：${prompts.grading_prompt}`;

    const userContent = [
      this.homeworkInfo(hw),
      `題目：${q.title}`,
      `說明：${q.description}`,
      `教師準則：${q.ai_prompt}`,
      attachmentContext,
      `學生作答：${studentBlock}`
    ].filter(Boolean).join("\n");

    console.log("========== 【系統設定】 ==========");
    console.log(system);
    console.log("========== 【AI 讀到的題目、附件與學生作答】 ==========");
    console.log(userContent);

    const maxAttempts = 3;
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const raw = await OpenAiHelper.chat(
        [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        { jsonMode: true },
      );
      console.log("========== 【AI 原始回覆】 ==========");
      console.log(raw);
      try {
        const parsed = tryParseJsonObject(raw);
        return {
          suggested_score: Math.min(maxForThis, Math.max(0, Number(parsed.suggested_score) || 0)),
          reason: parsed.reason || "",
          feedback: parsed.feedback || "",
          max_score: maxForThis,
          question_order: q.question_order,
        };
      } catch (e) {
        lastError = e;
        console.warn(`[HomeworkAi] JSON 解析失敗，重試 ${attempt + 1}/${maxAttempts}:`, e.message);
      }
    }
    throw lastError || new Error("無法解析 AI 回傳之 JSON");
  },

  async runAiGradeAllQuestions(submissionId, homeworkId) {
    const questions = await HomeworkModel.getQuestionsByHomework(homeworkId);
    const perQuestion = [];
    let sum = 0;
    for (const q of questions) {
      try {
        const one = await this.runAiGradeQuestion(submissionId, homeworkId, q.id);
        perQuestion.push({ questionId: q.id, title: q.title, ...one });
        sum += one.suggested_score;
      } catch (e) {
        perQuestion.push({ questionId: q.id, title: q.title, error: e.message });
      }
    }
    return {
      suggested_score: Math.round(sum * 100) / 100,
      reason: perQuestion.map(p => `【${p.title}】\n${p.reason || p.error}`).join('\n\n'),
      perQuestion
    };
  },

  async chatWithTutor(hwId, questionId, messages) {
    const { hw, q } = await this.loadQuestionContext(hwId, questionId);
    const prompts = await this.promptsForCourse(hw.course_id);
    const attachmentContext = await this.buildHomeworkAttachmentContext(hw);
    const history = (Array.isArray(messages) ? messages : [])
      .filter((m) => ["user", "assistant"].includes(m?.role) && typeof m.content === "string");

    const systemSafety = "你是大學 AI 助教。禁止透露評分標準。使用蘇格拉底式提問引導。請依照下方老師最新的指示回覆學生。";
    const systemContext = [
      this.homeworkInfo(hw),
      `目前討論的子題：${q.title}`,
      `題目說明：${q.description}`,
      `教師指示：${q.discussion_prompt || q.ai_prompt}`,
      `課程討論提示：${prompts.discussion_prompt}`,
      attachmentContext
    ].filter(Boolean).join("\n");

    console.log("解惑 AI 確認");
    console.log(attachmentContext || "沒有讀取到任何附件內容");

    return await OpenAiHelper.chat([
      { role: "system", content: systemSafety },
      { role: "system", content: systemContext },
      ...history.slice(-16)
    ]);
  }
};
