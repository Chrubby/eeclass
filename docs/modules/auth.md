# 模組：帳號與登入（Auth）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [shared](shared.md)
>
> 核對日期：2026-09-29。

## 這個模組做什麼

註冊、登入、忘記密碼（兩套機制）、登入後改密碼、上傳頭貼、取得目前使用者資訊。角色（`student`/`teacher`/`ta`）也是在這裡決定的。

## 前端程式碼

- **`frontend/src/views/Login.vue`**：登入頁
  - `login`：送出帳密，呼叫 `api.post('/api/auth/login')`，成功後把 token 存進 localStorage 並導向首頁
- **`frontend/src/views/Register.vue`**：註冊頁
  - `register`：呼叫 `api.post('/api/auth/register')` 建立新帳號
- **`frontend/src/views/ForgotPassword.vue`**：忘記密碼頁（重設代碼機制）
  - `submit`：`api.post('/api/auth/forgot-password')`，用教師提供的重設代碼重設密碼
- **`frontend/src/views/ResetPassword.vue`**：忘記密碼頁（email token 機制）
  - `submit`：`api.post('/api/auth/reset-password')`，用 email 連結 token 重設密碼（⚠️ 後端沒有產生 token 的流程，見下方已知問題）
- **`frontend/src/views/ChangePassword.vue`**：首次登入 / 被強制改密碼時顯示的頁面
  - `submit`：呼叫 `api.post('/api/auth/change-password')` 送出新密碼
- **`frontend/src/views/Profile.vue`**：個人資料頁
  - `loadProfile`：載入頁面時呼叫 `GET /api/auth/me` 取得目前使用者資料
  - `onAvatarChange`：選好圖檔後呼叫 `POST /api/auth/avatar` 上傳頭貼
  - `changePassword`：呼叫 `POST /api/auth/change-password` 改密碼
- **`frontend/src/utils/auth.js`**：全站共用的 token/角色/強制改密碼旗標存取（讀寫的都是 localStorage）
  - `getAccessToken`、`setAccessToken`：讀寫目前登入的 JWT
  - `parseJwtPayload`：把 JWT 的 payload 解出來（不驗簽章，只供前端 UI 判斷用，不能當作權限依據）
  - `getRoleFromToken`、`getUsernameFromToken`：從 token payload 取出角色/帳號名稱
  - `setMustChangePassword`、`getMustChangePassword`：讀寫「下次登入要不要強制導去改密碼頁」的旗標

`frontend/src/router/index.js` 的 `router.beforeEach` 也讀取這個模組的 `getRoleFromToken`/`getMustChangePassword`，決定要不要導向 `/change-password` 或 `/login`（細節見 [shared.md](shared.md)）。

## 後端程式碼

### Route — `backend/src/routes/authRoutes.js`（掛載於 `/api/auth`）

- `POST /register`
- `POST /login`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /change-password`（需 JWT）
- `POST /avatar`（需 JWT，`uploadAvatar.single("avatar")`）
- `GET /me`（需 JWT）

### Controller — `backend/src/controllers/authController.js`

- `register`：建立帳號（呼叫 Service 的 `register`）
- `login`：驗證帳密並簽發 JWT（呼叫 `login`）
- `me`：回傳目前登入者資料（呼叫 `getUserInfo`）
- `forgotPassword`：用重設代碼找回密碼（呼叫 `resetPasswordWithRecoveryCode`）
- `changePassword`：登入後改密碼（呼叫 `changePassword`）
- `uploadAvatar`：上傳頭貼（呼叫 `updateAvatar`）
- `resetPassword`：用 email token 重設密碼（呼叫 `resetPasswordWithToken`；⚠️ 沒有對應的產生 token 入口，見已知問題）

### Service — `backend/src/services/authService.js`

| 函式 | 備註 |
| --- | --- |
| `validateRegisterInput`（私有） | 密碼長度 8～128、角色白名單 |
| `validateNewPassword`（私有） | |
| `hashPasswordResetToken`（私有） | Email token 機制用 |
| `getRecoveryCode`（私有） | 讀 `PASSWORD_RECOVERY_CODE` |
| `mapDbError`（私有） | 把 DB 錯誤碼轉成中文訊息 |
| `register` | 註冊，`must_change_password` 設 1 |
| `login` | bcrypt 比對 + 簽發 JWT |
| `getUserInfo` | 給 `GET /me` 用 |
| `resetPasswordWithRecoveryCode` | 重設代碼機制；重設成功後 `must_change_password` 設 **0** |
| `changePassword` | `must_change_password` 為真時可省略 `currentPassword` |
| `updateAvatar` | |
| `resetPasswordWithToken` | Email token 機制；⚠️ 沒有對應的「產生 token」入口，見已知問題 |

### Model — `backend/src/models/authModel.js`

- `createAccount`：寫入 `accounts` 表
- `findAccountByUsernameOrEmail`：登入時查帳號（帳號或 email 都可比對）
- `findAccountByUsername`：依帳號名稱查帳號
- `getRoleByUsername`：查該帳號的角色
- `createStudent`：寫入 `students` 表（`ta` 角色也會呼叫這個，見 [overview.md 1.2](../overview.md#12-使用者角色)）
- `createTeacher`：寫入 `teachers` 表
- `getStudentById`、`getTeacherById`：依角色各自查詳細資料（`GET /me` 用）
- `deletePasswordResetTokensForAccount`：清掉該帳號舊的重設 token
- `insertPasswordResetToken`：寫入新的 email 重設 token（⚠️ 全專案搜尋沒有任何地方呼叫這個函式）
- `findActivePasswordResetByTokenHash`：用 token 的 hash 查尚未過期/使用的重設紀錄
- `markPasswordResetTokenUsed`：把一筆重設 token 標記為已使用
- `updateAccountPasswordById`：寫入新密碼（已 bcrypt hash 過）
- `setMustChangePassword`：設定「下次登入要不要強制改密碼」旗標
- `updateAvatarUrl`：寫入頭貼檔案路徑

### Middleware / Utils

| 檔案 | 內容 |
| --- | --- |
| `middlewares/authMiddleware.js` | `authMiddleware`，驗 Bearer JWT，設定 `req.user` |
| `middlewares/requireRole.js` | `requireRole(...roles)` |
| `utils/jwt.js` | `signAccessToken`、`verifyAccessToken` |
| `utils/mailer.js` | `sendPasswordResetEmail`（⚠️ 同上，沒有任何地方呼叫） |

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | `register` | Public |
| POST | `/api/auth/login` | `login` | Public |
| POST | `/api/auth/forgot-password` | `forgotPassword` | Public |
| POST | `/api/auth/reset-password` | `resetPassword` | Public |
| POST | `/api/auth/change-password` | `changePassword` | JWT |
| POST | `/api/auth/avatar` | `uploadAvatar` | JWT |
| GET | `/api/auth/me` | `me` | JWT |

## 資料庫

用到 `accounts`、`students`、`teachers`、`password_reset_tokens` 四張表，欄位定義見 [database.md 3.1](../database.md#31-帳號--使用者)。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| High | JWT 密鑰有寫死的 fallback（`utils/jwt.js` 的 `secret()`），且 `JWT_SECRET` 沒列在 `.env.example` |
| Medium | Email token 忘記密碼機制不完整：`AuthModel.insertPasswordResetToken`、`mailer.sendPasswordResetEmail` 都存在，但沒有任何 API 會呼叫它們產生 token |
| Medium | `login` 的 catch 直接把 `error.message` 回給前端（`authController.js`），實測會洩漏原始 DB 錯誤訊息 |
| Low | `ta` 註冊時被寫進 `students` 表（`authModel.js` 的 `createStudent`），沒有獨立語意 |
