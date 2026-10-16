import ExcelJS from "exceljs";

const HEADER_ALIASES = {
  name: ["姓名", "name"],
  account: ["帳號", "學號", "account", "username", "student id"],
  email: ["信箱", "電子郵件", "電子信箱", "email", "e-mail"],
};

// header row may sit below a merged title row, so search the top of the sheet
const HEADER_SEARCH_ROWS = 10;
const MAX_DATA_ROWS = 2000;
const MAX_USERNAME_LENGTH = 64;

/** exceljs returns hyperlinks, rich text and formulas as objects; flatten them to plain text */
function cellText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text ?? "").join("").trim();
  if ("text" in value) return cellText(value.text);
  if ("result" in value) return cellText(value.result);
  return "";
}

function matchHeader(text) {
  const normalized = text.toLowerCase();
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) return key;
  }
  return null;
}

function findHeader(worksheet) {
  const lastRow = Math.min(worksheet.rowCount, HEADER_SEARCH_ROWS);
  for (let r = 1; r <= lastRow; r++) {
    const cols = {};
    worksheet.getRow(r).eachCell((cell, col) => {
      const key = matchHeader(cellText(cell.value));
      if (key && !cols[key]) cols[key] = col;
    });
    if (cols.name && (cols.account || cols.email)) return { headerRow: r, cols };
  }
  return null;
}

/** the unlabeled note column marks instructors and TAs; everyone else is a student */
function roleFromNote(note) {
  if (/授課|老師|教師|教授/.test(note)) return "teacher";
  if (/助教/.test(note)) return "ta";
  return "student";
}

/**
 * Parses a course roster sheet with 姓名 / 帳號 / 信箱 columns plus an optional note column.
 * Rows without 帳號 fall back to the email as the username.
 * @returns {Promise<{ title: string, rows: object[], problems: object[] }>}
 */
export async function parseRosterExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new Error("無法讀取 Excel 檔案，請確認檔案為 .xlsx 格式");
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("Excel 檔案中沒有工作表");

  const header = findHeader(worksheet);
  if (!header) {
    throw new Error("找不到標題列：需要「姓名」欄，以及「帳號」或「信箱」欄");
  }
  const { headerRow, cols } = header;
  const title = headerRow > 1 ? cellText(worksheet.getRow(1).getCell(1).value) : "";

  const rows = [];
  const problems = [];
  const firstRowOf = new Map();

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow) return;

    const name = cellText(row.getCell(cols.name).value);
    const account = cols.account ? cellText(row.getCell(cols.account).value) : "";
    const email = cols.email ? cellText(row.getCell(cols.email).value).toLowerCase() : "";

    const noteParts = [];
    row.eachCell((cell, col) => {
      if (col === cols.name || col === cols.account || col === cols.email) return;
      const text = cellText(cell.value);
      if (text) noteParts.push(text);
    });
    const note = noteParts.join(" ");

    if (!name && !account && !email) return;

    const username = account || email;
    if (!name) {
      problems.push({ rowNumber, username, reason: "缺少姓名" });
      return;
    }
    if (!username) {
      problems.push({ rowNumber, name, reason: "缺少帳號與信箱，無法識別此人" });
      return;
    }
    if (username.length > MAX_USERNAME_LENGTH) {
      problems.push({ rowNumber, name, username, reason: "帳號過長" });
      return;
    }
    if (firstRowOf.has(username)) {
      problems.push({ rowNumber, name, username, reason: `與第 ${firstRowOf.get(username)} 列重複` });
      return;
    }
    firstRowOf.set(username, rowNumber);

    rows.push({ rowNumber, name, username, email: email || null, role: roleFromNote(note), note });
  });

  if (rows.length > MAX_DATA_ROWS) {
    throw new Error(`名單超過 ${MAX_DATA_ROWS} 列，請分批匯入`);
  }
  if (rows.length === 0 && problems.length === 0) {
    throw new Error("名單中沒有任何資料列");
  }

  return { title, rows, problems };
}
