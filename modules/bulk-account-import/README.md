# Bulk Account Import（可抽離模組）

## 所在位置

```
eeclass/modules/bulk-account-import/
├── package.json              # 獨立套件名稱 @eeclass/bulk-account-import
├── README.md                 # 本說明
├── src/
│   ├── index.js              # 對外 API 入口
│   ├── columnMap.js          # 表頭／角色別名（與業務無關）
│   ├── parseWorkbook.js      # Excel/CSV → 列資料
│   ├── validateRows.js       # 欄位驗證、檔內去重
│   └── bulkCreate.js         # 批次呼叫 adapter
└── client/
    └── bulkImportUi.js       # 純 JS UI（給靜態頁或其他前端重用）
```

**宿主系統（本專案）接線點**（薄適配層，抽離時可整段刪除或改寫）：

| 檔案 | 用途 |
|------|------|
| `backend/src/modules/bulkAccountImportAdapter.js` | 把列資料接到 `AuthService.register` |
| `backend/src/controllers/authController.js` | `bulkRegister` / `bulkRegisterTemplate` |
| `backend/src/routes/authRoutes.js` | `POST /api/auth/bulk-register`、`GET .../template` |
| `backend/src/middlewares/upload.js` | `uploadBulkAccountFile`（記憶體上傳） |
| `frontend/src/views/Register.vue` | 註冊頁「Excel 批次建立」區塊 |

---

## 運作原理

```
┌─────────────┐     multipart/form-data      ┌──────────────────────┐
│  註冊頁 UI  │  ─────────────────────────►  │  Express 薄適配層    │
│ (Vue/純JS)  │     file + importCode        │  authRoutes /        │
└─────────────┘                              │  AuthController      │
                                             └──────────┬───────────┘
                                                        │ Buffer
                                                        ▼
                                             ┌──────────────────────┐
                                             │  @eeclass/           │
                                             │  bulk-account-import │
                                             │                      │
                                             │  1. parseWorkbook    │
                                             │  2. validateRows     │
                                             │  3. bulkCreate       │
                                             │     └─ createAccount │◄── adapter
                                             └──────────────────────┘
                                                        │
                                                        ▼
                                             ┌──────────────────────┐
                                             │  AuthService.register│
                                             │  （或其它系統的 API）│
                                             └──────────────────────┘
```

1. **解析**：`xlsx` 讀取 `.xlsx` / `.xls` / `.csv`，第一列為表頭，支援中英文別名（帳號／姓名／密碼／身份）。
2. **驗證**：密碼 ≥ 8、角色合法、檔內帳號不重複；無效列記入 `results`，不中斷整批。
3. **建立**：核心**不直接寫 DB**，只呼叫宿主注入的 `createAccount(row)`。本專案 adapter 轉呼叫既有 `AuthService.register`（含 bcrypt、學生／老師表）。
4. **安全**：若環境變數 `BULK_ACCOUNT_IMPORT_CODE` 有設定，請求必須帶相同 `importCode`；未設定則與目前開放註冊行為一致（正式環境建議一定要設）。

---

## Excel 欄位

| 標準欄位 | 可用別名 | 說明 |
|----------|----------|------|
| `username` | 帳號、學號、工號、account | 必填 |
| `name` | 姓名、名稱 | 必填 |
| `password` | 密碼、初始密碼 | 必填，≥ 8 字元 |
| `role` | 身份、角色 | `student` / `teacher` / `ta` 或 學生／老師／助教 |

下載樣板：`GET /api/auth/bulk-register/template`

---

## 接到其他系統

```js
import { bulkCreateFromBuffer } from "@eeclass/bulk-account-import";
// 或相對路徑：../../modules/bulk-account-import/src/index.js

const outcome = await bulkCreateFromBuffer(fileBuffer, {
  async createAccount(row) {
    // 改成呼叫你的系統，例如：
    // await OtherSystem.users.create(row);
    await myRegisterApi(row);
  },
  continueOnError: true,
  concurrency: 1,
});
```

前端可重用 `client/bulkImportUi.js` 的 `createBulkImportPanel`，只改 `apiBaseUrl` / `importPath`。

抽離步驟建議：
1. 複製整個 `modules/bulk-account-import` 資料夾（或發佈成 npm 私有包）。
2. 在新系統寫一個新的 `createAccount` adapter。
3. 刪除本專案的 `bulkAccountImportAdapter.js` 與 auth 路由接線即可。

---

## 環境變數

```env
# 建議正式環境務必設定
BULK_ACCOUNT_IMPORT_CODE=your-secret-code
```

---

## 本機安裝

在 `modules/bulk-account-import` 與 `backend` 安裝依賴（後端透過相對路徑引用模組，模組需有自己的 `node_modules/xlsx`）：

```bash
cd modules/bulk-account-import && npm install
cd ../../backend && npm install
```
