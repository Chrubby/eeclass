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

/** 帳號本身的身分（student / teacher / admin）。舊 token 的 "ta" 視為學生。 */
export function getAccountRole() {
  const role = parseJwtPayload(getAccessToken())?.role || "student";
  return role === "ta" ? "student" : role;
}

// 助教是課程層級的身分：帳號是學生，只有在自己帶的課才是 "ta"。
// 這份對照表（課程代碼 → 我在該課的身分）由 utils/courseRoles.js 向後端取得。
let courseRoles = null;

export function setCourseRoles(roles) {
  courseRoles = roles;
}

export function hasCourseRoles() {
  return courseRoles !== null;
}

export function currentCourseCode() {
  const match = /^\/course\/([^/]+)/.exec(window.location.pathname);
  return match ? decodeURIComponent(match[1]) : "";
}

/** 把帳號身分換成「在這門課」的身分；不在課程頁面時就是帳號身分 */
export function courseRoleFor(accountRole, courseCode = currentCourseCode()) {
  if (accountRole === "student" && courseCode && courseRoles?.[courseCode] === "ta") return "ta";
  return accountRole;
}

/** 目前頁面（或指定課程）適用的身分，各頁面用它判斷要顯示老師端還是學生端 */
export function getRoleFromToken(courseCode) {
  return courseRoleFor(getAccountRole(), courseCode);
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
