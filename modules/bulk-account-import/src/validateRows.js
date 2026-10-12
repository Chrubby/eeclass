import { ALLOWED_ROLES, ROLE_ALIASES } from "./columnMap.js";

/**
 * @typedef {Object} AccountRow
 * @property {string} username
 * @property {string} name
 * @property {string} password
 * @property {string} role
 * @property {number} [rowNumber] 
 */

/**
 * @param {Partial<AccountRow>} raw
 * @param {number} rowNumber
 * @returns {{ ok: true, row: AccountRow } | { ok: false, error: string, rowNumber: number }}
 */
export function validateAccountRow(raw, rowNumber) {
  const username = String(raw?.username ?? "").trim();
  const name = String(raw?.name ?? "").trim();
  const password = String(raw?.password ?? "");
  let role = String(raw?.role ?? "").trim().toLowerCase();

  if (ROLE_ALIASES[role]) {
    role = ROLE_ALIASES[role];
  } else if (ROLE_ALIASES[String(raw?.role ?? "").trim()]) {
    role = ROLE_ALIASES[String(raw.role).trim()];
  }

  if (!username) {
    return { ok: false, error: "帳號不可為空", rowNumber };
  }
  if (username.length > 64) {
    return { ok: false, error: "帳號過長（最多 64 字元）", rowNumber };
  }
  if (!name) {
    return { ok: false, error: "姓名不可為空", rowNumber };
  }
  if (!password || password.length < 8) {
    return { ok: false, error: "密碼長度至少 8 個字元", rowNumber };
  }
  if (password.length > 128) {
    return { ok: false, error: "密碼過長", rowNumber };
  }
  if (!ALLOWED_ROLES.has(role)) {
    return {
      ok: false,
      error: `身份不合法（可用：student / teacher / ta，或 學生 / 老師 / 助教）`,
      rowNumber,
    };
  }

  return {
    ok: true,
    row: { username, name, password, role, rowNumber },
  };
}

/**
 * @param {Array<Partial<AccountRow>>} rows
 */
export function validateAccountRows(rows) {
  const valid = [];
  const invalid = [];
  const seen = new Set();

  for (const raw of rows) {
    const rowNumber = raw.rowNumber ?? 0;
    const result = validateAccountRow(raw, rowNumber);
    if (!result.ok) {
      invalid.push(result);
      continue;
    }
    const key = result.row.username.toLowerCase();
    if (seen.has(key)) {
      invalid.push({
        ok: false,
        error: `檔案內帳號重複：${result.row.username}`,
        rowNumber,
      });
      continue;
    }
    seen.add(key);
    valid.push(result.row);
  }

  return { valid, invalid };
}
