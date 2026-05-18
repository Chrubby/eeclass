import multer from "multer";

const GENERIC = "系統發生異常，請稍後再試";

function isMulterError(err) {
  return err instanceof multer.MulterError;
}

/**
 * Express 錯誤處理：避免將資料庫或內部堆疊訊息回傳給前端
 */
export function errorHandler(err, _req, res, _next) {
  console.error(err);

  if (isMulterError(err)) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "檔案大小超過限制" });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "不允許的檔案欄位或類型" });
    }
    return res.status(400).json({ message: "檔案上傳失敗" });
  }

  if (err?.message === "只允許上傳 PDF 檔案") {
    return res.status(400).json({ message: err.message });
  }

  if (typeof err?.message === "string" && err.message.includes("只允許上傳")) {
    return res.status(400).json({ message: err.message });
  }

  if (typeof err?.message === "string" && err.message.startsWith("不允許的副檔名")) {
    return res.status(400).json({ message: err.message });
  }

  const status = Number(err?.status) || 500;
  if (status >= 500) {
    return res.status(500).json({ message: GENERIC });
  }
  return res.status(status).json({ message: err?.message || GENERIC });
}
