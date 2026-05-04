import { pool } from "../config/db.js";
import { OpenAiHelper } from "../utils/openaiHelper.js";
import { CourseAiModel } from "../models/courseAiModel.js";
import { HomeworkModel } from "../models/homeworkModel.js";
import { PdfHelper } from "../utils/pdfHelper.js";

export const HomeworkAiService = {
  parseHomeworkAttachments(hw) {
    try {
      const parsed = hw?.attachments_json ? JSON.parse(hw.attachments_json) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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
        const text = await PdfHelper.extractText(filePath, 10);
        if (text?.trim()) {
          blocks.push(`檔名：${fileName}\n內容摘錄：\n${text}`);
        } else {
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
    const questions = await HomeworkModel.getQuestionsByHomework(homeworkId);
    const idx = questions.findIndex(q => q.id === Number(questionId));
    if (idx < 0) throw new Error("找不到子題");

    const q = questions[idx];
    const hw = await HomeworkModel.getHomeworkById(homeworkId);
    const prompts = await CourseAiModel.getPromptsByCourseId(hw.course_id);
    const attachmentContext = await this.buildHomeworkAttachmentContext(hw);
    const maxScores = this.perQuestionMaxScores(questions.length);
    const maxForThis = maxScores[idx];

    const sub = await HomeworkModel.getSubmissionDetail(submissionId);
    let parsedAnswers = [];
    try { if (sub.answer_text) parsedAnswers = JSON.parse(sub.answer_text); } catch { }

    let studentBlock = `[文字作答] ${parsedAnswers[idx] || "（未作答）"}`;
    if (q.answer_format === "file") {
      const fileName = sub.file_name || "無";
      studentBlock = `[檔案繳交] 檔名：${fileName}`;
      if (this.isPdfSubmission(sub)) {
        const pdfText = await PdfHelper.extractText(sub.file_path);
        if (pdfText?.trim()) {
          studentBlock += `\n[PDF 內容摘錄]\n${pdfText}`;
        } else {
          studentBlock += `\n[PDF 內容摘錄] （無法擷取內容或檔案為空）`;
        }
      } else {
        studentBlock += `\n[檔案內容] （目前僅支援 PDF 內容解析）`;
      }
    }

    const system = `你是協助大學教師預評分的助手。輸出必須為單一 JSON。此題滿分為 ${maxForThis} 分。\n` +
      `JSON 鍵名：suggested_score, reason。\n課程評分提示：${prompts.grading_prompt}`;

    const userContent = [
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

    const raw = await OpenAiHelper.chat([
      { role: "system", content: system },
      { role: "user", content: userContent }
    ], { jsonMode: true });
    console.log("========== 【AI 原始回覆】 ==========");
    console.log(raw);
    const parsed = JSON.parse(raw);
    return {
      suggested_score: Math.min(maxForThis, Math.max(0, Number(parsed.suggested_score) || 0)),
      reason: parsed.reason,
      question_order: q.questionOrder
    };
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
    const questions = await HomeworkModel.getQuestionsByHomework(hwId);
    const q = questions.find(item => item.id === Number(questionId));
    const hw = await HomeworkModel.getHomeworkById(hwId);
    const prompts = await CourseAiModel.getPromptsByCourseId(hw.course_id);
    const attachmentContext = await this.buildHomeworkAttachmentContext(hw);

    const systemSafety = "你是大學 AI 助教。禁止透露評分標準。使用蘇格拉底式提問引導。";
    const systemContext = [
      `題目說明：${q.description}`,
      `教師內部準則：${q.discussion_prompt || q.ai_prompt}`,
      `課程討論提示：${prompts.discussion_prompt}`,
      attachmentContext
    ].filter(Boolean).join("\n");

    console.log("解惑 AI 確認");
    console.log(attachmentContext || "沒有讀取到任何附件內容");

    return await OpenAiHelper.chat([
      { role: "system", content: systemSafety },
      { role: "system", content: systemContext },
      ...messages.slice(-16)
    ]);
  }
};
