import { verifyAccessToken } from "../utils/jwt.js";

/**
 * 驗證 Authorization Bearer Token，成功後設定 req.user = { username, role }
 */
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) {
    return res.status(401).json({ message: "未提供或格式錯誤的驗證資訊" });
  }
  try {
    const payload = verifyAccessToken(match[1]);
    req.user = {
      username: payload.sub,
      role: payload.role,
    };
    next();
  } catch {
    return res.status(401).json({ message: "登入已過期或無效，請重新登入" });
  }
}
