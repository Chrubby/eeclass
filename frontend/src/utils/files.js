import api from "@/api/client.js";

/**
 * 取得後端靜態檔案（/uploads/...）的可用 URL：
 * - 在 VITE_API_BASE_URL 有設定時補上完整 host，避免遠端部署時 / 被導向前端 host
 * - 自動處理路徑前是否有斜線
 */
export function getFileUrl(filePath) {
  if (!filePath) return "";
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${base}${normalized}`;
}

/**
 * 從後端下載檔案並觸發瀏覽器存檔：
 * - 使用 axios（帶 JWT、走相同 baseURL）取得 blob
 * - 透過 a[download] 強制下載，避免瀏覽器以 inline 方式預覽
 */
export async function downloadFile(filePath, fileName) {
  if (!filePath) return;
  const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
  const res = await api.get(normalized, { responseType: "blob" });

  const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName || extractFileName(normalized);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** 在新分頁開啟檔案（PDF 預覽用），自動補上完整網域 */
export function openFileInNewTab(filePath) {
  const url = getFileUrl(filePath);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function extractFileName(filePath) {
  const segments = String(filePath).split("/");
  return segments[segments.length - 1] || "download";
}
