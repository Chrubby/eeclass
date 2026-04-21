import { pool } from "../config/db.js";
import { OpenAiHelper } from "../utils/openaiHelper.js";
import { CourseAiModel } from "../models/courseAiModel.js";
import { HomeworkModel } from "../models/homeworkModel.js";

export const HomeworkAiService = {
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
    const maxScores = this.perQuestionMaxScores(questions.length);
    const maxForThis = maxScores[idx];

    const sub = await HomeworkModel.getSubmissionDetail(submissionId);
    let parsedAnswers = [];
    try { if (sub.answer_text) parsedAnswers = JSON.parse(sub.answer_text); } catch { }

    const studentBlock = q.answerFormat === "file" 
      ? `[檔案繳交] 檔名：${sub.file_name || "無"}` 
      : `[文字作答] ${parsedAnswers[idx] || "（未作答）"}`;

    const system = `你是協助大學教師預評分的助手。輸出必須為單一 JSON。此題滿分為 ${maxForThis} 分。\n` +
      `JSON 鍵名：suggested_score, reason。\n課程評分提示：${prompts.grading_prompt}`;

    const userContent = `題目：${q.title}\n說明：${q.description}\n教師準則：${q.ai_prompt}\n學生作答：${studentBlock}`;

    const raw = await OpenAiHelper.chat([
      { role: "system", content: system },
      { role: "user", content: userContent }
    ], { jsonMode: true });

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

    const systemSafety = "你是大學 AI 助教。禁止透露評分標準。使用蘇格拉底式提問引導。";
    const systemContext = `題目說明：${q.description}\n教師內部準則：${q.discussion_prompt || q.ai_prompt}\n課程討論提示：${prompts.discussion_prompt}`;

    return await OpenAiHelper.chat([
      { role: "system", content: systemSafety },
      { role: "system", content: systemContext },
      ...messages.slice(-16)
    ]);
  }
};