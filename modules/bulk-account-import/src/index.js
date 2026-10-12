/**
 * @eeclass/bulk-account-import
 *
 * 可獨立抽離的批次帳號匯入核心。
 * 宿主系統只需提供 createAccount(row) adapter。
 */

export {
  REQUIRED_FIELDS,
  TEMPLATE_HEADERS,
  ALLOWED_ROLES,
  DEFAULT_COLUMN_ALIASES,
  ROLE_ALIASES,
} from "./columnMap.js";

export { parseAccountWorkbook, mapHeaders, buildTemplateBuffer } from "./parseWorkbook.js";
export { validateAccountRow, validateAccountRows } from "./validateRows.js";
export { bulkCreateAccounts } from "./bulkCreate.js";

import { parseAccountWorkbook } from "./parseWorkbook.js";
import { bulkCreateAccounts } from "./bulkCreate.js";

/**
 * 一站式：Buffer → 解析 → 驗證 → 批次建立
 *
 * @param {Buffer|ArrayBuffer|Uint8Array} buffer
 * @param {import('./bulkCreate.js').BulkCreateOptions & { columnMap?: Record<string, string>, sheetIndex?: number }} options
 */
export async function bulkCreateFromBuffer(buffer, options) {
  const { rows, meta } = parseAccountWorkbook(buffer, {
    columnMap: options.columnMap,
    sheetIndex: options.sheetIndex,
  });
  const outcome = await bulkCreateAccounts(rows, options);
  return { ...outcome, meta };
}
