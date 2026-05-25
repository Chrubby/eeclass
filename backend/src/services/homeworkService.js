import { pool } from "../config/db.js";
import { HomeworkModel } from "../models/homeworkModel.js";
import { appendSubmissionHistory } from "../utils/dbHistoryLogger.js";

export const HomeworkService = {
  // 老師發布作業
  async publishHomework(courseId, bodyData, files) {
    const { title, deadline, description, questions } = bodyData;
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const hwId = await HomeworkModel.createHomework(connection, courseId, title, deadline, description);

      const mainFiles = (files || []).filter((f) => f.fieldname === "homework_files" || f.fieldname === "homework_file");
      const attachments = mainFiles.map(file => ({
        file_name: Buffer.from(file.originalname, "latin1").toString("utf8"),
        file_path: `/uploads/${file.filename}`,
      }));

      await HomeworkModel.updateHomeworkAttachments(connection, hwId, JSON.stringify(attachments));

      if (questions) {
        const parsedQuestions = JSON.parse(questions);
        await HomeworkModel.createQuestions(connection, hwId, parsedQuestions);
      }

      await connection.commit();
      return hwId;
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  // 獲取作業列表 (依據身分附加繳交狀態或批改統計)
  async getCourseHomeworks(courseId, role, userId) {
    const homeworks = await HomeworkModel.getHomeworksByCourse(courseId);

    if (role === 'student' && userId) {
      for (let hw of homeworks) {
        const sub = await HomeworkModel.getStudentSubmission(hw.id, userId);
        if (sub && sub.is_submitted) {
          hw.submissionId = sub.id;
          hw.score = sub.score;
          hw.feedback = sub.feedback;
        }
      }
    } else if (role === "teacher" || role === "ta") {
      for (let hw of homeworks) {
        const stats = await HomeworkModel.getHomeworkStats(hw.id);
        hw.submitCount = stats.submitCount || 0;
        hw.gradedCount = stats.gradedCount || 0;
      }
    }
    return homeworks;
  },

  // 獲取單一作業詳情
  async getHomeworkDetail(hwId) {
    const hw = await HomeworkModel.getHomeworkById(hwId);
    if (!hw) return null;

    let attachments = [];
    try {
      if (hw.attachments_json) attachments = JSON.parse(hw.attachments_json);
    } catch {
      attachments = [];
    }
    hw.attachments = Array.isArray(attachments) ? attachments : [];
    hw.attachment_url = hw.attachments[0]?.file_path || null;

    const questions = await HomeworkModel.getQuestionsByHomework(hwId);
    hw.questions = questions.map((q) => ({
      ...q,
      questionOrder: q.question_order,
      answerFormat: q.answer_format,
      hasAttachment: Boolean(q.has_attachment),
      filePath: q.file_path,
      fileName: q.file_name,
      discussionPrompt: q.discussion_prompt || "",
    }));

    return hw;
  },

  // 學生繳交作業
  async submitHomework(hwId, studentId, answerText, file) {
    const homework = await HomeworkModel.getHomeworkById(hwId);
    if (homework && homework.deadline) {
      if (new Date() > new Date(homework.deadline)) {
        throw new Error("已超過繳交截止時間，無法繳交作業");
      }
    }

    const correctFileName = file ? Buffer.from(file.originalname, "latin1").toString("utf8") : null;
    const filePath = file ? `/uploads/${file.filename}` : null;

    // 判斷是否有任何內容可繳交（包含先前已暫存的檔案或答案）
    const existing = await HomeworkModel.getStudentSubmission(hwId, studentId);
    const trimmedAnswerText = typeof answerText === "string" ? answerText.trim() : "";
    let hasNonEmptyText = false;
    if (trimmedAnswerText) {
      try {
        const parsed = JSON.parse(trimmedAnswerText);
        if (Array.isArray(parsed)) {
          hasNonEmptyText = parsed.some((item) => String(item ?? "").trim() !== "");
        } else {
          hasNonEmptyText = String(parsed ?? "").trim() !== "";
        }
      } catch {
        hasNonEmptyText = true;
      }
    }
    const hasExistingFile = Boolean(existing?.file_path);
    if (!file && !hasNonEmptyText && !hasExistingFile) {
      throw new Error("不能繳交空內容");
    }

    const subId = await HomeworkModel.upsertSubmission(hwId, studentId, answerText, correctFileName, filePath);

    await appendSubmissionHistory(subId, "submit", {
      studentId,
      hasFile: Boolean(file) || hasExistingFile,
      fileName: correctFileName || existing?.file_name || null,
      answerText: answerText || "",
    });

    return subId;
  },

  // 老師更新作業
  async updateHomework(hwId, bodyData, files) {
    const { title, deadline, description, questions } = bodyData;
    const existing = await HomeworkModel.getHomeworkById(hwId);
    if (!existing) throw new Error("找不到作業");

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      await HomeworkModel.updateHomeworkById(connection, hwId, {
        title: title ?? existing.title,
        deadline: deadline ?? existing.deadline,
        description: description !== undefined ? description : existing.description,
      });

      const mainFiles = (files || []).filter((f) => f.fieldname === "homework_files" || f.fieldname === "homework_file");
      if (mainFiles.length > 0) {
        const attachments = mainFiles.map((file) => ({
          file_name: Buffer.from(file.originalname, "latin1").toString("utf8"),
          file_path: `/uploads/${file.filename}`,
        }));
        await HomeworkModel.updateHomeworkAttachments(connection, hwId, JSON.stringify(attachments));
      }

      if (questions) {
        const parsedQuestions = JSON.parse(questions);
        await HomeworkModel.deleteQuestionsByHomeworkId(connection, hwId);
        await HomeworkModel.createQuestions(connection, hwId, parsedQuestions);
      }

      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  // 老師刪除作業
  async deleteHomework(hwId) {
    const existing = await HomeworkModel.getHomeworkById(hwId);
    if (!existing) throw new Error("找不到作業");
    await HomeworkModel.deleteSubmissionsByHomeworkId(hwId);
    await HomeworkModel.deleteQuestionsByHomeworkId(null, hwId);
    await HomeworkModel.deleteHomeworkById(hwId);
  },

  // 學生收回作業：保留原本作答與檔案，僅標記為未繳交
  async unsubmitHomework(hwId, studentId) {
    const homework = await HomeworkModel.getHomeworkById(hwId);
    if (homework && homework.deadline) {
      if (new Date() > new Date(homework.deadline)) {
        throw new Error("已超過繳交截止時間，無法收回作業");
      }
    }

    const sub = await HomeworkModel.getStudentSubmission(hwId, studentId);
    if (sub) {
      await appendSubmissionHistory(sub.id, "unsubmit", { studentId });
      await HomeworkModel.markSubmissionUnsubmitted(hwId, studentId);
    }
  },

  // 老師批改作業
  async gradeSubmission(submissionId, score, feedback, gradedDetails) {
    await HomeworkModel.updateGrade(submissionId, score, feedback, gradedDetails);
    await appendSubmissionHistory(submissionId, "teacher_grade", {
      score: score ?? null,
      feedback: feedback ?? null,
      gradedDetails: gradedDetails || null,
    });
  },

  // 取得作業歷程 (含作業基本資料與所有事件)
  async getSubmissionHistory(submissionId) {
    const submission = await HomeworkModel.getSubmissionDetail(submissionId);
    if (!submission) return null;

    const historyRows = await HomeworkModel.getSubmissionHistoryLogs(submissionId);
    const history = historyRows.map((r) => {
      let payload = {};
      try { payload = r.payloadJson ? JSON.parse(r.payloadJson) : {}; } catch {}
      return { id: r.id, eventType: r.eventType, createdAt: r.createdAt, payload };
    });

    return {
      submission,
      finalAiScore: submission.ai_estimated_score,
      history,
    };
  }
};