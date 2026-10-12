import { validateAccountRows } from "./validateRows.js";

/**
 * @typedef {import('./validateRows.js').AccountRow} AccountRow
 *
 * @typedef {Object} CreateAccountAdapter
 * @property {(row: AccountRow) => Promise<void>} createAccount
 *
 * @typedef {Object} BulkCreateOptions
 * @property {CreateAccountAdapter['createAccount']} createAccount
 * @property {(info: { index: number, total: number, row: AccountRow, ok: boolean, error?: string }) => void} [onProgress]
 * @property {boolean} [continueOnError=true]
 * @property {number} [concurrency=1]
 */

/**
 * 對已解析／驗證過的列執行批次建立
 * @param {Array<Partial<AccountRow>>} rawRows
 * @param {BulkCreateOptions} options
 */
export async function bulkCreateAccounts(rawRows, options) {
  if (typeof options?.createAccount !== "function") {
    throw new Error("必須提供 createAccount adapter");
  }

  const continueOnError = options.continueOnError !== false;
  const concurrency = Math.max(1, Math.min(options.concurrency || 1, 5));
  const { valid, invalid } = validateAccountRows(rawRows);

  /** @type {Array<{rowNumber:number, username?:string, ok:boolean, error?:string}>} */
  const results = invalid.map((item) => ({
    rowNumber: item.rowNumber,
    ok: false,
    error: item.error,
  }));

  let created = 0;
  let failed = invalid.length;

  async function processOne(row, index) {
    try {
      await options.createAccount(row);
      created += 1;
      const item = { rowNumber: row.rowNumber, username: row.username, ok: true };
      results.push(item);
      options.onProgress?.({
        index,
        total: valid.length,
        row,
        ok: true,
      });
    } catch (err) {
      failed += 1;
      const message = err?.message || "建立失敗";
      results.push({
        rowNumber: row.rowNumber,
        username: row.username,
        ok: false,
        error: message,
      });
      options.onProgress?.({
        index,
        total: valid.length,
        row,
        ok: false,
        error: message,
      });
      if (!continueOnError) {
        throw err;
      }
    }
  }

  if (concurrency === 1) {
    for (let i = 0; i < valid.length; i++) {
      await processOne(valid[i], i);
    }
  } else {
    let cursor = 0;
    async function worker() {
      while (cursor < valid.length) {
        const i = cursor++;
        await processOne(valid[i], i);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }

  results.sort((a, b) => (a.rowNumber || 0) - (b.rowNumber || 0));

  return {
    summary: {
      total: rawRows.length,
      valid: valid.length,
      created,
      failed,
    },
    results,
  };
}
