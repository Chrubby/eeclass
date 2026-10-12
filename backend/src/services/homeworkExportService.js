import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";
import { HomeworkModel } from "../models/homeworkModel.js";
import { HomeworkService } from "./homeworkService.js";
import { buildStudentPdf, concatPdfs } from "../utils/submissionPdf.js";

const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");

function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeName(value, fallback) {
  const cleaned = String(value || fallback || "file")
    .replace(/[\/:*?"<>|]/g, "_")
    .trim();
  return cleaned || fallback || "file";
}

function absUpload(filePath) {
  const rel = String(filePath || "").replace(/^\/+/, "").replace(/^uploads\//, "");
  return path.join(uploadsDir, rel);
}

function filesOfRow(row, questionCount) {
  const parsed = parseJsonArray(row.filesJson || row.files_json).map((item) =>
    item && item.file_path ? item : null,
  );
  if (!parsed.some(Boolean) && (row.filePath || row.file_path)) {
    parsed[0] = {
      file_name: row.fileName || row.file_name || "附件",
      file_path: row.filePath || row.file_path,
    };
  }
  while (parsed.length < questionCount) parsed.push(null);
  return parsed;
}

function studentOfRow(row, questionCount) {
  const files = filesOfRow(row, questionCount)
    .map((file, index) => {
      if (!file?.file_path) return null;
      return {
        index,
        name: safeName(file.file_name, `第${index + 1}題附件`),
        abs: absUpload(file.file_path),
      };
    })
    .filter(Boolean);
  const studentId = row.studentId || row.student_id;
  return {
    studentId,
    name: row.studentName || "",
    submittedAt: row.submittedAt || row.submitted_at,
    answers: parseJsonArray(row.answerText || row.answer_text).map((item) => String(item ?? "")),
    folder: safeName(`${studentId || "student"}_${row.studentName || ""}`),
    files,
  };
}

export const HomeworkExportService = {
  /** 全班：每位學生一份合併 PDF，加上全班合併成一份的 PDF */
  async build(hwId) {
    const homework = await HomeworkService.getHomeworkDetail(hwId);
    if (!homework) return null;
    const questions = homework.questions || [];
    const rows = await HomeworkModel.getSubmissionsList(hwId);
    const students = [];
    for (const row of rows) {
      const student = studentOfRow(row, questions.length);
      student.pdf = await buildStudentPdf(homework, questions, student);
      students.push(student);
    }
    const allPdf = students.length ? await concatPdfs(students.map((student) => student.pdf)) : null;
    return { homework, students, allPdf };
  },

  /** 單一學生的合併 PDF（批改頁使用） */
  async buildForSubmission(submissionId) {
    const row = await HomeworkModel.getSubmissionDetail(submissionId);
    if (!row) return null;
    const homework = await HomeworkService.getHomeworkDetail(row.homework_id);
    const questions = homework?.questions || [];
    const student = studentOfRow(row, questions.length);
    const pdf = await buildStudentPdf(homework || { title: row.homeworkTitle }, questions, student);
    return { homework, student, pdf };
  },

  streamZip(res, pack, downloadName) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    );
    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on("error", (error) => {
      console.error("[homework-export]", error?.message || error);
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    archive.on("warning", (error) => console.warn("[homework-export]", error?.message || error));
    archive.pipe(res);
    if (pack.allPdf) archive.append(pack.allPdf, { name: "全班合併作答.pdf" });
    for (const student of pack.students) {
      archive.append(student.pdf, { name: `${student.folder}/${student.folder}_合併作答.pdf` });
      for (const file of student.files) {
        if (!fs.existsSync(file.abs)) continue;
        archive.file(file.abs, { name: `${student.folder}/原始檔案/第${file.index + 1}題_${file.name}` });
      }
    }
    archive.finalize();
  },
};
