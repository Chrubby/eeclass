import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { PDFDocument as PdfLibDocument } from "pdf-lib";

// 中文字型：可用 PDF_FONT_PATH / PDF_FONT_NAME 指定，否則依序嘗試常見系統字型
const FONT_CANDIDATES = [
  { file: process.env.PDF_FONT_PATH, name: process.env.PDF_FONT_NAME },
  { file: "C:/Windows/Fonts/msjh.ttc", name: "MicrosoftJhengHeiRegular" },
  { file: "C:/Windows/Fonts/kaiu.ttf" },
  { file: "C:/Windows/Fonts/mingliu.ttc", name: "MingLiU" },
  { file: "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", name: "NotoSansCJKtc-Regular" },
  { file: "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc", name: "NotoSansCJKtc-Regular" },
  { file: "/System/Library/Fonts/PingFang.ttc", name: "PingFangTC-Regular" },
];

let cachedFont;
function resolveFont() {
  if (cachedFont !== undefined) return cachedFont;
  cachedFont = null;
  for (const candidate of FONT_CANDIDATES) {
    if (!candidate.file || !fs.existsSync(candidate.file)) continue;
    try {
      const probe = new PDFDocument({ autoFirstPage: false });
      probe.font(candidate.file, candidate.name);
      cachedFont = candidate;
      break;
    } catch {
      /* 這個字型讀不到，換下一個 */
    }
  }
  if (!cachedFont) console.warn("[submission-pdf] 找不到中文字型，PDF 中文可能無法顯示；請設定 PDF_FONT_PATH");
  return cachedFont;
}

function renderTextPdf(draw) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const font = resolveFont();
    if (font) doc.font(font.file, font.name);
    draw(doc);
    doc.end();
  });
}

async function appendPdfBytes(target, bytes) {
  const src = await PdfLibDocument.load(bytes, { ignoreEncryption: true });
  const pages = await target.copyPages(src, src.getPageIndices());
  pages.forEach((page) => target.addPage(page));
}

async function appendImage(target, bytes, ext) {
  const image = ext === ".png" ? await target.embedPng(bytes) : await target.embedJpg(bytes);
  const [pageW, pageH, margin] = [595.28, 841.89, 40];
  const scale = Math.min((pageW - margin * 2) / image.width, (pageH - margin * 2) / image.height, 1);
  const w = image.width * scale;
  const h = image.height * scale;
  const page = target.addPage([pageW, pageH]);
  page.drawImage(image, { x: (pageW - w) / 2, y: pageH - margin - h, width: w, height: h });
}

async function noticePage(target, message) {
  await appendPdfBytes(target, await renderTextPdf((doc) => doc.fontSize(12).fillColor("#b91c1c").text(message)));
}

/** 把一個附件併入 PDF；PDF 直接接頁、圖片轉成一頁，其它格式留說明頁 */
async function appendAttachment(target, file) {
  const ext = path.extname(file.name || file.abs || "").toLowerCase();
  if (!fs.existsSync(file.abs)) {
    await noticePage(target, `附件「${file.name}」檔案不存在，無法合併。`);
    return;
  }
  try {
    const bytes = await fs.promises.readFile(file.abs);
    if (ext === ".pdf") await appendPdfBytes(target, bytes);
    else if ([".png", ".jpg", ".jpeg"].includes(ext)) await appendImage(target, bytes, ext);
    else await noticePage(target, `附件「${file.name}」為 ${ext || "未知"} 格式，無法合併進 PDF，請下載 ZIP 查看原檔。`);
  } catch (error) {
    console.error("[submission-pdf] 合併附件失敗：", file.abs, error?.message || error);
    await noticePage(target, `附件「${file.name}」讀取失敗（檔案可能損毀或加密），請下載原檔查看。`);
  }
}

/**
 * 產生單一學生的合併 PDF：每題的題目、文字作答，緊接著該題上傳的附件內容。
 * student: { name, studentId, submittedAt, answers: string[], files: [{ index, name, abs }] }
 */
export async function buildStudentPdf(homework, questions, student) {
  const target = await PdfLibDocument.create();
  const count = Math.max(questions.length, student.answers.length, 1);

  for (let i = 0; i < count; i += 1) {
    const q = questions[i];
    const text = String(student.answers[i] ?? "").trim();
    const attachments = student.files.filter((file) => file.index === i);
    const bytes = await renderTextPdf((doc) => {
      if (i === 0) {
        doc.fontSize(18).fillColor("#1f2937").text(homework.title || "作業");
        doc.moveDown(0.3).fontSize(12).fillColor("#374151")
          .text(student.groupId
            ? `小組：${student.name || "未命名"}（${student.studentId}）`
            : `學生：${student.name || "未命名"}（${student.studentId}）`);
        if (student.submittedAt) doc.text(`繳交時間：${new Date(student.submittedAt).toLocaleString("zh-TW")}`);
        doc.moveDown();
      }
      doc.fontSize(14).fillColor("#1d4ed8").text(`第 ${i + 1} 題：${q?.title || "（無標題）"}`);
      if (q?.description) doc.moveDown(0.3).fontSize(10).fillColor("#6b7280").text(q.description);
      doc.moveDown(0.5).fontSize(12).fillColor("#111827").text(text || "（無文字作答）");
      if (attachments.length) {
        doc.moveDown(0.5).fontSize(10).fillColor("#047857")
          .text(`附件：${attachments.map((file) => file.name).join("、")}（內容接在本頁之後）`);
      }
    });
    await appendPdfBytes(target, bytes);
    for (const file of attachments) await appendAttachment(target, file);
  }
  return Buffer.from(await target.save());
}

export async function concatPdfs(buffers) {
  const target = await PdfLibDocument.create();
  for (const bytes of buffers) await appendPdfBytes(target, bytes);
  return Buffer.from(await target.save());
}
