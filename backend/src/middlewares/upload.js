import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 處理 ES Module 環境下的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定上傳資料夾的路徑：往上推兩層回到根目錄，然後進入 uploads
// 也就是從 src/middlewares/upload.js 回到 project-root/uploads
const uploadsRoot = path.join(__dirname, "../../uploads");

// 如果 uploads 資料夾不存在，就自動建立一個
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

// 設定 Multer 的儲存引擎與檔名命名規則
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    // 取得副檔名 (例如 .pdf, .docx)
    const ext = path.extname(file.originalname);
    // 檔名：時間戳 + 隨機亂碼，避免檔名重複覆蓋
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  },
});

// 1. 一般檔案上傳 (無特別限制，用於作業、教材上傳)
export const upload = multer({ storage });

// 2. 嚴格限制的 PDF 上傳 (用於討論區)
export const uploadPdf = multer({
  storage: storage, // 沿用上面的儲存設定
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      // 如果不是 PDF，拒絕上傳並拋出錯誤
      cb(new Error("只允許上傳 PDF 檔案"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 限制最大 10MB
});