import { pool } from "../config/db.js";
import { HomeworkModel } from "../models/homeworkModel.js";
import { appendSubmissionHistory } from "../utils/dbHistoryLogger.js";
import { NotificationService, previewText } from "./notificationService.js";

function deadlineIsInFuture(value) {
  if (value == null || value === "") return false;
  const date = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

function decodeUploadName(file) {
  return Buffer.from(file.originalname, "latin1").toString("utf8");
}

function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storedFilesFromSubmission(existing, questionCount) {
  const parsed = parseJsonArray(existing?.files_json);
  const files = parsed.map((item) => (item && item.file_path ? item : null));
  if (!files.some(Boolean) && existing?.file_path) {
    files[0] = { file_name: existing.file_name || "附件", file_path: existing.file_path };
  }
  while (files.length < questionCount) files.push(null);
  return files.slice(0, Math.max(questionCount, files.length));
}

export const HomeworkService = {
  // 老師發布作業
  async publishHomework(courseId, bodyData, files, actorUsername = null) {
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

      try {
        const courseCode = String(courseId);
        await NotificationService.notifyByCourseCode({
          courseCode,
          type: "homework",
          refId: hwId,
          headline: `新作業：${title}`,
          message: previewText(description),
          excludeUsername: actorUsername,
          linkPath: `/course/${courseCode}/homework/${hwId}`,
        });
      } catch (notifyError) {
        console.error("[notify] 作業通知失敗", notifyError?.message || notifyError);
      }

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
  async submitHomework(hwId, studentId, answerText, files = [], removeFileIndexes = []) {
    const homework = await HomeworkModel.getHomeworkById(hwId);
    if (homework && homework.deadline) {
      if (new Date() > new Date(homework.deadline)) {
        throw new Error("已超過繳交截止時間，無法繳交作業");
      }
    }

    const questions = await HomeworkModel.getQuestionsByHomework(hwId);
    const existing = await HomeworkModel.getStudentSubmission(hwId, studentId);
    const storedFiles = storedFilesFromSubmission(existing, questions.length);
    const removeSet = new Set(
      (Array.isArray(removeFileIndexes) ? removeFileIndexes : [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0),
    );
    for (const index of removeSet) {
      if (index < storedFiles.length) storedFiles[index] = null;
    }

    for (const file of files || []) {
      const match = /^qfile_(\d+)$/.exec(file.fieldname || "");
      const index = match ? Number(match[1]) : storedFiles.findIndex((item) => !item);
      const target = index >= 0 ? index : storedFiles.length;
      storedFiles[target] = {
        file_name: decodeUploadName(file),
        file_path: `/uploads/${file.filename}`,
      };
    }

    const trimmedAnswerText = typeof answerText === "string" ? answerText.trim() : "";
    let hasNonEmptyText = false;
    if (trimmedAnswerText) {
      const parsed = parseJsonArray(trimmedAnswerText);
      hasNonEmptyText = parsed.length
        ? parsed.some((item) => String(item ?? "").trim() !== "")
        : trimmedAnswerText.length > 0;
    }
    const hasFile = storedFiles.some(Boolean);
    if (!hasNonEmptyText && !hasFile) {
      throw new Error("不能繳交空內容");
    }

    const firstFile = storedFiles.find(Boolean) || null;
    const subId = await HomeworkModel.saveSubmissionPayload(
      hwId,
      studentId,
      answerText,
      JSON.stringify(storedFiles),
      firstFile?.file_name || null,
      firstFile?.file_path || null,
    );

    await appendSubmissionHistory(subId, "submit", {
      studentId,
      hasFile,
      fileName: firstFile?.file_name || null,
      answerText: answerText || "",
      answers: parseJsonArray(answerText),
      files: storedFiles,
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

      const nextDeadline = deadline ?? existing.deadline;
      await HomeworkModel.updateHomeworkById(connection, hwId, {
        title: title ?? existing.title,
        deadline: nextDeadline,
        description: description !== undefined ? description : existing.description,
        resetGradeNotice: deadlineIsInFuture(nextDeadline),
      });

      const mainFiles = (files || []).filter((f) => f.fieldname === "homework_files" || f.fieldname === "homework_file");
      const previous = parseJsonArray(existing.attachments_json);
      const keepRaw = bodyData.keepAttachments;
      let kept = previous;
      if (keepRaw != null && keepRaw !== "") {
        const keepPaths = new Set(parseJsonArray(keepRaw).map((item) => String(item)));
        kept = previous.filter((item) => keepPaths.has(String(item?.file_path || "")));
      }
      if (mainFiles.length > 0 || (keepRaw != null && keepRaw !== "")) {
        const added = mainFiles.map((file) => ({
          file_name: decodeUploadName(file),
          file_path: `/uploads/${file.filename}`,
        }));
        await HomeworkModel.updateHomeworkAttachments(connection, hwId, JSON.stringify([...kept, ...added]));
      }

      if (questions) {
        const parsedQuestions = JSON.parse(questions);
        await HomeworkModel.syncQuestions(connection, hwId, parsedQuestions);
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
    await pool.execute(
      "DELETE FROM notifications WHERE type = 'homework_grade' AND ref_id = ?",
      [String(hwId)],
    );
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