import * as XLSX from "xlsx";
import { DEFAULT_COLUMN_ALIASES, REQUIRED_FIELDS } from "./columnMap.js";

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/**
 * 將表頭列對應到標準欄位名
 * @param {string[]} headers
 * @param {Record<string, string>} [aliases]
 */
export function mapHeaders(headers, aliases = DEFAULT_COLUMN_ALIASES) {
  /** @type {Record<string, number>} field -> column index */
  const fieldIndex = {};
  const aliasLookup = {};
  for (const [alias, field] of Object.entries(aliases)) {
    aliasLookup[normalizeHeader(alias)] = field;
  }

  headers.forEach((h, i) => {
    const key = normalizeHeader(h);
    const field = aliasLookup[key] || aliasLookup[String(h ?? "").trim()];
    if (field && fieldIndex[field] === undefined) {
      fieldIndex[field] = i;
    }
  });

  const missing = REQUIRED_FIELDS.filter((f) => fieldIndex[f] === undefined);
  return { fieldIndex, missing };
}

function cellToString(value) {
  if (value == null) return "";
  if (typeof value === "number") {
    // 學號常被 Excel 當成數字，避免科學記號
    return Number.isInteger(value) ? String(value) : String(value);
  }
  return String(value).trim();
}

/**
 * 從 Buffer 解析 .xlsx / .xls / .csv
 * @param {Buffer|ArrayBuffer|Uint8Array} buffer
 * @param {{ columnMap?: Record<string, string>, sheetIndex?: number }} [options]
 * @returns {{ rows: Array<{username:string,name:string,password:string,role:string,rowNumber:number}>, meta: object }}
 */
export function parseAccountWorkbook(buffer, options = {}) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetIndex = options.sheetIndex ?? 0;
  const sheetName = workbook.SheetNames[sheetIndex];
  if (!sheetName) {
    throw new Error("Excel 檔案沒有工作表");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (!matrix.length) {
    throw new Error("檔案內容為空");
  }

  const headers = (matrix[0] || []).map((h) => cellToString(h));
  const { fieldIndex, missing } = mapHeaders(headers, options.columnMap || DEFAULT_COLUMN_ALIASES);
  if (missing.length) {
    throw new Error(
      `缺少必要欄位：${missing.join("、")}。請使用樣板表頭 username / name / password / role（或中文：帳號 / 姓名 / 密碼 / 身份）`,
    );
  }

  const rows = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || [];
    const isEmpty = line.every((c) => cellToString(c) === "");
    if (isEmpty) continue;

    rows.push({
      username: cellToString(line[fieldIndex.username]),
      name: cellToString(line[fieldIndex.name]),
      password: cellToString(line[fieldIndex.password]),
      role: cellToString(line[fieldIndex.role]),
      rowNumber: i + 1,
    });
  }

  if (!rows.length) {
    throw new Error("沒有可匯入的資料列（請確認表頭下方有資料）");
  }

  return {
    rows,
    meta: {
      sheetName,
      headerRow: headers,
      totalDataRows: rows.length,
    },
  };
}

/**
 * 產生空白樣板（xlsx buffer）
 * @param {Array<Array<string|number>>} [sampleRows]
 */
export function buildTemplateBuffer(sampleRows) {
  const data = [
    ["username", "name", "password", "role"],
    ...(sampleRows || [
      ["b11000001", "王小明", "ChangeMe1", "student"],
      ["t001", "李老師", "ChangeMe1", "teacher"],
      ["ta001", "陳助教", "ChangeMe1", "ta"],
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "accounts");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
