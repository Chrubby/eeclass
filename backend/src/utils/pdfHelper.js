import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// 需要全域掛載 DOMMatrix 供 pdfjs 於 Node 環境使用
import { DOMMatrix } from "canvas";
globalThis.DOMMatrix = DOMMatrix;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");

export const PdfHelper = {
  resolveFilePath(filePath) {
    if (!filePath) return null;

    const cleanPath = filePath.replace(/^[/\\]+/, "");
    // 資料庫存的是 "/uploads/xxx"；Windows 上 path.isAbsolute 會把它當成 C:\uploads，需先排除
    if (/^uploads[/\\]/.test(cleanPath)) {
      return path.join(projectRoot, cleanPath);
    }

    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    return path.join(projectRoot, cleanPath);
  },

    async extractText(filePath, maxPages = 20) {
    if (!filePath) return "";

    let pdfText = "";
    try {
      const fullPath = this.resolveFilePath(filePath);

      if (fs.existsSync(fullPath)) {

        const dataBuffer = new Uint8Array(fs.readFileSync(fullPath));
        const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
        const pdfDocument = await loadingTask.promise;
        const pagesToRead = Math.min(pdfDocument.numPages, maxPages);

        for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(" ");
          pdfText += pageText + "\n";
        }

        return pdfText.substring(0, 50000);
      } else {
      }
    } catch (err) {

      console.error("[pdfHelper] 底層解析 PDF 發生錯誤：", err);
      console.error("失敗的檔案路徑是：", filePath);

      return "";}
    return pdfText;
  }
};
