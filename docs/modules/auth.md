# 模組：帳號與登入（Auth）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [notification](notification.md) ・ [shared](shared.md)
>
> 核對日期：2026-10-17。

## 這個模組做什麼

**管理員建立帳號**（單筆，或上傳名單 Excel 批次建立）、登入、忘記密碼（兩套機制）、登入後改密碼、填寫/修改信箱（收[通知](notification.md)用）、上傳頭貼、取得目前使用者資訊。

**系統不開放自行註冊**：註冊頁與 `POST /api/auth/register` 都已移除，所有帳號只能由管理員（`admin`）建立。第一個管理員用 `backend/scripts/seedAdmin.js` 在指令列建立（見下方「Script」）。帳號角色只有 `student` / `teacher` / `admin` 三種；**助教不是帳號角色**，是課程層級的身分（`enrollments.role = 'ta'`），見[學生名冊](student-list.md)與 [overview.md 1.1](../overview.md#11-使用者角色)。

## 前端程式碼

- **`frontend/src/views/Login.vue`**：登入頁
  - `login`：送出帳密，呼叫 `api.post('/api/auth/login')`，成功後把 token 存進 localStorage 並導向首頁（管理員導向 `/admin/accounts`，其餘導向 `/dashboard`）；登入頁已拿掉「註冊」連結
- **`frontend/src/views/admin/AccountManage.vue`**：管理員專用的「帳號管理」頁（路由 `/admin/accounts`，`meta.requiresAdmin`）
  - `submit`：單筆建立帳號（帳號、姓名、身分 學生/教師、email、密碼），呼叫 `POST /api/auth/accounts`
  - `importAccounts`：選好 Excel 並填「初始密碼」後呼叫 `POST /api/auth/accounts/import`（multipart）；`importRows` 把後端回的 `created`/`skipped`/`failed` 合併成逐筆結果表（綠＝建立、灰＝略過、紅＝失敗）
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
  - 信箱表單：填寫/修改信箱，呼叫 `POST /api/auth/email`；更新成功後觸發 `eeclass-profile-updated` 事件，讓 [`App.vue`](shared.md) 重新載入使用者資訊（例如收起頁首的「請填信箱」提示）
- **`frontend/src/utils/auth.js`**：全站共用的 token/角色/強制改密碼旗標存取（讀寫的都是 localStorage）
  - `getAccessToken`、`setAccessToken`：讀寫目前登入的 JWT
  - `parseJwtPayload`：把 JWT 的 payload 解出來（不驗簽章，只供前端 UI 判斷用，不能當作權限依據）
  - `getAccountRole`：帳號本身的身分（`student`/`teacher`/`admin`）；舊 token 裡的 `"ta"` 一律視為 `student`
  - `getRoleFromToken(courseCode?)`：**課程感知**的身分——帳號是 `student` 且在該課是助教時回傳 `"ta"`，其餘回傳帳號身分；不在課程頁面時就是帳號身分。各頁面原本的 `role === 'ta'` 判斷因此不用改
  - `courseRoleFor`、`currentCourseCode`、`setCourseRoles`、`hasCourseRoles`：支撐上一條的輔助函式。「課程代碼 → 我在該課的身分」對照表存在記憶體（不是 localStorage），由 `utils/courseRoles.js` 的 `refreshCourseRoles` 呼叫 `GET /api/courses/user`（讀每筆的 `my_role`）取得
  - `getUsernameFromToken`：從 token payload 取出帳號名稱
  - `setMustChangePassword`、`getMustChangePassword`：讀寫「下次登入要不要強制導去改密碼頁」的旗標

`frontend/src/api/client.js` 的 response 攔截器會把 `GET /api/auth/me` 回應裡的 `role` 換成 `courseRoleFor(role)`（課程頁面裡是「在這門課的身分」），同時把原本的帳號身分另存成 `account_role`。`frontend/src/router/index.js` 的 `router.beforeEach` 也讀取這個模組的 `getRoleFromToken`/`getAccountRole`/`getMustChangePassword`，決定要不要導向 `/change-password` 或 `/login`（細節見 [shared.md](shared.md)）。

## 後端程式碼

### Route — `backend/src/routes/authRoutes.js`（掛載於 `/api/auth`）

- `POST /accounts`（需 JWT + `admin`，單筆建立帳號）
- `POST /accounts/import`（需 JWT + `admin`，`uploadSpreadsheet.single("file")`，Excel 批次建帳號）
- `POST /login`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /change-password`（需 JWT）
- `POST /email`（需 JWT，填寫/修改信箱）
- `POST /avatar`（需 JWT，`uploadAvatar.single("avatar")`）
- `GET /me`（需 JWT）

### Controller — `backend/src/controllers/authController.js`

- `createAccount`：管理員建立單一帳號（呼叫 `createManagedAccount`，傳入 `req.user.role` 做權限檢查）
- `importAccounts`：接收上傳的 Excel（`req.file.buffer`）與 `initialPassword`，呼叫 `importAccounts` 批次建帳號，回傳 `{ title, created, skipped, failed }`
- `login`：驗證帳密並簽發 JWT（呼叫 `login`）
- `me`：回傳目前登入者資料（呼叫 `getUserInfo`，現在含 `email`）
- `forgotPassword`：用重設代碼找回密碼（呼叫 `resetPasswordWithRecoveryCode`）
- `changePassword`：登入後改密碼（呼叫 `changePassword`）
- `updateEmail`：填寫/修改信箱（呼叫 `updateEmail`）
- `uploadAvatar`：上傳頭貼（呼叫 `updateAvatar`）
- `resetPassword`：用 email token 重設密碼（呼叫 `resetPasswordWithToken`；⚠️ 沒有對應的產生 token 入口，見已知問題）

### Service — `backend/src/services/authService.js`

| 函式 | 備註 |
| --- | --- |
| `validateAccountInput`（私有） | 帳號非空且 ≤64、密碼長度 8～128、需填姓名（角色白名單改由 `ROLE_CREATION_MATRIX` 判斷） |
| `ROLE_CREATION_MATRIX`（私有常數） | 誰可以建立哪些身分的帳號：目前只有 `admin` 可建立 `admin`/`teacher`/`student` |
| `createProfileForRole`（私有） | 依身分寫入對應的 `students` / `teachers` / `admins` 表 |
| `validateNewPassword`（私有） | |
| `hashPasswordResetToken`（私有） | Email token 機制用 |
| `getRecoveryCode`（私有） | 讀 `PASSWORD_RECOVERY_CODE` |
| `mapDbError`（私有） | 把 DB 錯誤碼轉成中文訊息 |
| `createManagedAccount` | 管理員建立單一帳號：檢查建立者權限 → 驗證輸入與信箱（可不填，有填就檢查格式與是否已被使用）→ 寫入 `accounts`（`must_change_password` 設 1）+ 對應的資料表 |
| `importAccounts` | 管理員批次建立帳號：用 `parseRosterExcel`（見 [student-list](student-list.md)）解析名單，**所有人用同一組初始密碼**（只 hash 一次）；名單備註欄含「授課/老師/教師/教授」建為 `teacher`，其他（含註記「助教」的人）一律建為 `student`。已存在的帳號略過（`skipped`）、信箱格式錯誤或已被使用的列進 `failed`；每一筆各自一個 transaction，帳號與資料表一起成功或一起回滾 |
| `login` | bcrypt 比對 + 簽發 JWT |
| `getUserInfo` | 給 `GET /me` 用，含 `email`；`admin` 查 `admins` 表 |
| `updateEmail` | 驗證信箱格式、檢查是否已被別的帳號使用，通過才寫入 |
| `resetPasswordWithRecoveryCode` | 重設代碼機制；重設成功後 `must_change_password` 設 **0** |
| `changePassword` | `must_change_password` 為真時可省略 `currentPassword` |
| `updateAvatar` | |
| `resetPasswordWithToken` | Email token 機制；⚠️ 沒有對應的「產生 token」入口，見已知問題 |

### Model — `backend/src/models/authModel.js`

- `createAccount`：寫入 `accounts` 表（可傳入 transaction connection）
- `findAccountByUsernameOrEmail`：登入時查帳號（帳號或 email 都可比對）
- `findAccountByUsername`：依帳號名稱查帳號
- `getRoleByUsername`：查該帳號的角色
- `createStudent`、`createTeacher`、`createAdmin`：各自寫入 `students` / `teachers` / `admins` 表（皆可傳入 transaction connection）
- `countAdmins`：算目前有幾個管理員帳號（`seedAdmin.js` 用來避免重複建立）
- `getStudentById`、`getTeacherById`、`getAdminById`：依角色各自查詳細資料（`GET /me` 用）
- `deletePasswordResetTokensForAccount`：清掉該帳號舊的重設 token
- `insertPasswordResetToken`：寫入新的 email 重設 token（⚠️ 全專案搜尋沒有任何地方呼叫這個函式）
- `findActivePasswordResetByTokenHash`：用 token 的 hash 查尚未過期/使用的重設紀錄
- `markPasswordResetTokenUsed`：把一筆重設 token 標記為已使用
- `updateAccountPasswordById`：寫入新密碼（已 bcrypt hash 過）
- `setMustChangePassword`：設定「下次登入要不要強制改密碼」旗標
- `updateAvatarUrl`：寫入頭貼檔案路徑
- `findOtherAccountByEmail`：查某個 email 是否已被別的帳號使用（建帳號/改信箱時檢查用）
- `updateEmail`：寫入信箱

### Middleware / Utils

| 檔案 | 內容 |
| --- | --- |
| `middlewares/authMiddleware.js` | `authMiddleware`，驗 Bearer JWT，設定 `req.user`；舊 token 的 `role: "ta"` 一律改成 `"student"`（助教改由 `courseRole` 依課程判斷） |
| `middlewares/courseRole.js` | 見下方「課程層級助教」 |
| `middlewares/requireRole.js` | `requireRole(...roles)` |
| `middlewares/upload.js` | `uploadSpreadsheet`：名單匯入用（帳號批次匯入、[學生名冊](student-list.md)同步共用），僅 `.xlsx`、≤5MB，存記憶體不落地 |
| `utils/jwt.js` | `signAccessToken`、`verifyAccessToken` |
| `utils/mailer.js` | `sendPasswordResetEmail`（⚠️ 同上，沒有任何地方呼叫）；`sendNotificationEmails` 現在搬到共用的[通知模組](notification.md)；信件主旨／頁尾的站名已改為「國立中央大學「LMS 計畫」」 |
| `utils/rosterExcel.js` | `parseRosterExcel`：解析名單 Excel（帳號批次匯入與學生名冊同步共用），細節見 [student-list](student-list.md) |

### 課程層級助教 — `backend/src/middlewares/courseRole.js`

助教不再是帳號類型：帳號本身是 `student`，授課老師（或管理員）在某門課的學生名冊把他勾選為助教後，`enrollments.role` 才變成 `'ta'`。同一個帳號可以在 A 課是助教、在 B 課是一般學生。

`courseRole` 提供一組給 `router.param(...)` 用的函式。請求只要帶有課程相關參數，且 `req.user.role === 'student'`，就查該使用者在**這個請求所屬課程**是不是助教，是的話把這個請求的 `req.user.role` 換成 `"ta"`。既有的 `requireRole("teacher", "ta")` 檢查因此完全不用改，但助教權限只在自己帶的課有效。

| 函式 | 參數 → 課程的對應方式 |
| --- | --- |
| `byCode` | 參數本身就是課程代碼（`:courseCode`、`:courseId`） |
| `byHomework` | `:hwId` → `homeworks.course_id`（課程代碼） |
| `bySubmission` | `:submissionId` → `homework_submissions` → `homeworks.course_id` |
| `byDiscussionRoom` | `:id` / `:roomId` → `discussion_rooms.course_id`（課程 id） |
| `byThread` | `:threadId` → `threads.room_id` → `discussion_rooms.course_id` |
| `byAnnouncement` | `:id` → `announcements.course_id` |

掛載位置：`courseRoutes.js`（`courseCode`/`courseId`，涵蓋底下所有巢狀路由）、`homeworkRoutes.js`、`homeworkAiRoutes.js`、`discussionRoutes.js`、`announcementRoutes.js`。

行為變化：
- `homeworkRoutes.js`、`homeworkAiRoutes.js` 的 `studentSide` 從 `requireRole("student", "ta")` 改為 `requireRole("student")`——**助教在自己帶的課是工作人員，不能繳交該課作業、不能用學生端的 AI 自評/解惑**（在別門課仍是學生，可以）。
- 討論區的留言角色（`getThreadsByRoomId`）、AI 回覆的發問者身分（`addThreadAndTriggerAI` 的 `actorRole`）都改成依「該討論區所屬課程」判斷是否為助教。
- 帶不到課程的路由（例如 `/api/notifications`）不會被換成 `ta`，維持 `student`。

### Script — `backend/scripts/seedAdmin.js`

`node scripts/seedAdmin.js <帳號> <姓名> <密碼>`：建立**第一個**管理員（密碼至少 8 字元）。會先跑 `ensureSchema()`；資料庫裡已有任何管理員時拒絕執行（之後請在「帳號管理」頁建立）。建立後 `must_change_password` 設 0，因為密碼是操作者自己指定的。

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| POST | `/api/auth/accounts` | `createAccount` | JWT + (admin) |
| POST | `/api/auth/accounts/import` | `importAccounts` | JWT + (admin) |
| POST | `/api/auth/login` | `login` | Public |
| POST | `/api/auth/forgot-password` | `forgotPassword` | Public |
| POST | `/api/auth/reset-password` | `resetPassword` | Public |
| POST | `/api/auth/change-password` | `changePassword` | JWT |
| POST | `/api/auth/email` | `updateEmail` | JWT |
| POST | `/api/auth/avatar` | `uploadAvatar` | JWT |
| GET | `/api/auth/me` | `me` | JWT |

## 資料庫

用到 `accounts`、`students`、`teachers`、`admins`、`password_reset_tokens` 五張表，欄位定義見 [database.md 3.1](../database.md#31-帳號--使用者)。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| High | JWT 密鑰有寫死的 fallback（`utils/jwt.js` 的 `secret()`），且 `JWT_SECRET` 沒列在 `.env.example` |
| Medium | Email token 忘記密碼機制不完整：`AuthModel.insertPasswordResetToken`、`mailer.sendPasswordResetEmail` 都存在，但沒有任何 API 會呼叫它們產生 token |
| Medium | `login` 的 catch 直接把 `error.message` 回給前端（`authController.js`），實測會洩漏原始 DB 錯誤訊息 |
| Medium | 沒有「管理員停用/刪除帳號」「管理員重設他人密碼」功能；帳號建錯只能直接改資料庫 |
| Low | 批次匯入時所有帳號共用同一組初始密碼（雖然 `must_change_password = 1` 會強制首次登入改密碼），初始密碼要另外安全地通知對方 |
| Low | 舊版 token 若還帶 `role: "ta"`，後端雖會當 `student` 處理，但要等 token 過期或重新登入才會乾淨 |
