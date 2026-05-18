const TOKEN_KEY = "accessToken";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAccessToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** 解碼 JWT payload（僅供前端顯示路由／UI，權限以後端驗證為準） */
export function parseJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getRoleFromToken() {
  const payload = parseJwtPayload(getAccessToken());
  return payload?.role || "student";
}

export function getUsernameFromToken() {
  const payload = parseJwtPayload(getAccessToken());
  return payload?.sub || "";
}

const MUST_CHANGE_KEY = "mustChangePassword";

export function setMustChangePassword(required) {
  if (required) localStorage.setItem(MUST_CHANGE_KEY, "1");
  else localStorage.removeItem(MUST_CHANGE_KEY);
}

export function getMustChangePassword() {
  return localStorage.getItem(MUST_CHANGE_KEY) === "1";
}
