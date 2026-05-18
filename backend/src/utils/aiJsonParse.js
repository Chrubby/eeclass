/**
 * 移除 OpenAI 回傳中常見的 Markdown code fence（例如 ```json ... ```）
 */
export function stripMarkdownJsonFence(text) {
  let s = String(text ?? "").trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  if (fenced) return fenced[1].trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return s.trim();
}

/**
 * 嘗試將字串解析為 JSON 物件（先 strip fence）
 */
export function tryParseJsonObject(text) {
  const cleaned = stripMarkdownJsonFence(text);
  return JSON.parse(cleaned);
}
