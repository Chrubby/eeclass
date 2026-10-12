

export const REQUIRED_FIELDS = ["username", "name", "password", "role"];

/** 預設表頭（英文，建議樣板使用） */
export const TEMPLATE_HEADERS = ["username", "name", "password", "role"];

/** 允許的角色值 */
export const ALLOWED_ROLES = new Set(["student", "teacher", "ta"]);

/**
 * 表頭別名 → 標準欄位名
 * key 會轉成小寫、去空白後比對
 */
export const DEFAULT_COLUMN_ALIASES = {
  username: "username",
  account: "username",
  帳號: "username",
  用户名: "username",
  學號: "username",
  工號: "username",

  name: "name",
  姓名: "name",
  名稱: "name",

  password: "password",
  pwd: "password",
  密碼: "password",
  初始密碼: "password",

  role: "role",
  身份: "role",
  角色: "role",
  type: "role",
};

/** 角色值別名 → 標準 role */
export const ROLE_ALIASES = {
  student: "student",
  學生: "student",
  s: "student",

  teacher: "teacher",
  老師: "teacher",
  教師: "teacher",
  老师: "teacher",
  t: "teacher",

  ta: "ta",
  助教: "ta",
  assistant: "ta",
};
