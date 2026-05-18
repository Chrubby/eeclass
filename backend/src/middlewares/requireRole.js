/**
 * 限制僅特定角色可存取（須先經 authMiddleware 設定 req.user）
 * @param {...string} allowedRoles 允許的 accounts.role 值，例如 "teacher"、"ta"、"student"
 */
export function requireRole(...allowedRoles) {
  const allowed = new Set(allowedRoles);
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ message: "未登入" });
    }
    if (!allowed.has(req.user.role)) {
      return res.status(403).json({ message: "權限不足" });
    }
    next();
  };
}
