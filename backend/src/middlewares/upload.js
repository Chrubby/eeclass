import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsRoot = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

/** 教學情境常用副檔名（小寫），阻擋可執行檔與腳本 */
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".zip",
]);

const MAX_GENERAL_FILE_BYTES = 50 * 1024 * 1024;

function generalFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`不允許的副檔名，僅允許：${[...ALLOWED_EXTENSIONS].sort().join("、")}`));
  }
  cb(null, true);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  },
});

// 一般檔案上傳（作業、教材等）：大小與副檔名限制
export const upload = multer({
  storage,
  limits: { fileSize: MAX_GENERAL_FILE_BYTES },
  fileFilter: generalFileFilter,
});

const avatarsDir = path.join(uploadsRoot, "avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const AVATAR_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

export const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!AVATAR_EXTENSIONS.has(ext)) {
      return cb(new Error("頭貼僅支援 png、jpg、jpeg、gif、webp"));
    }
    cb(null, true);
  },
});

// 討論區：維持僅 PDF、較小上限
export const uploadPdf = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("只允許上傳 PDF 檔案"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});
