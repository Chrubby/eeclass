/**
 * eeclass 宿主適配層：把 bulk-account-import 核心接到 AuthService。
 * 抽離模組給其他系統時，此檔可刪除或改寫，核心 modules/bulk-account-import 不必改。
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { AuthService } from "../services/authService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moduleEntry = path.resolve(
  __dirname,
  "../../../modules/bulk-account-import/src/index.js",
);

const bulkImport = await import(pathToFileURL(moduleEntry).href);

function assertImportCode(provided) {
  const expected = String(process.env.BULK_ACCOUNT_IMPORT_CODE || "").trim();
  if (!expected) return;
  if (String(provided || "").trim() !== expected) {
    throw new Error("匯入驗證碼錯誤或未提供");
  }
}

export const BulkAccountImportAdapter = {
  async createFromUpload(fileBuffer, { importCode } = {}) {
    assertImportCode(importCode);

    return bulkImport.bulkCreateFromBuffer(fileBuffer, {
      continueOnError: true,
      concurrency: 1,
      async createAccount(row) {
        await AuthService.register({
          username: row.username,
          name: row.name,
          password: row.password,
          confirmPassword: row.password,
          role: row.role,
        });
      },
    });
  },

  buildTemplateBuffer() {
    return bulkImport.buildTemplateBuffer();
  },
};
