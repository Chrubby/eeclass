# 模組：共用基礎設施（Shared / Infrastructure）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [group](group.md) ・ [student-list](student-list.md) ・ [notification](notification.md)
>
> 核對日期：2026-10-17。這裡收錄不屬於任何單一業務模組、但幾乎每個模組都會用到的程式碼——路由掛載總表、認證中介層以外的共用 middleware、前端 App 外框與路由守衛、API client、檔案處理工具。

## 後端

### `backend/server.js`（進入點）

- `app.use(cors())`、`app.use(express.json())`
- `app.use("/uploads", express.static(uploadsRoot))` ⚠️ 掛在所有驗證 middleware 之前，完全公開
- `app.use("/api/auth", authRoutes)`（含批次匯入帳號，見 [auth](auth.md)）
- `app.use("/api/courses", authMiddleware, courseRoutes)`（內含 announcement/discussion/homework/material/course-ai/aiquiz/[group](group.md)/[student-list](student-list.md) 的子路由）
- `announcementRoutes`、`discussionRoutes`、`homeworkRoutes`、`homeworkAiRoutes`、`notificationRoutes`（見 [notification](notification.md)）的掛載
- `app.use(errorHandler)`
- 讀 `PORT`、啟動前呼叫 `ensureSchema()`、呼叫 [notification](notification.md) 模組的 `startHomeworkDeadlineNotifier()` 啟動作業截止通知的背景排程

### 共用 Middleware / Utils

| 檔案 | 內容 |
| --- | --- |
| `middlewares/upload.js` | `upload`（一般檔案，≤50MB，副檔名白名單）、`uploadAvatar`（頭貼，≤2MB）、`uploadPdf`（討論區/AI 測驗，≤10MB，僅 PDF）、`uploadSpreadsheet`（[auth](auth.md) 帳號批次匯入與[學生名冊](student-list.md)同步共用，≤5MB，僅 `.xlsx`，存記憶體） |
| `middlewares/courseRole.js` | `courseRole`：依請求所屬課程把該課助教的 `req.user.role` 換成 `ta`，見 [auth 模組](auth.md#課程層級助教--backendsrcmiddlewarescourserolejs) |
| `middlewares/errorHandler.js` | `errorHandler`，統一過濾內部錯誤訊息（multer 錯誤轉 400，其餘 5xx 回通用訊息） |
| `utils/ensureSchema.js` | `MIGRATIONS` 陣列（啟動時補欄位清單）、`ensureSchema()` |
| `config/db.js` | `pool`（mysql2 連線池，`connectionLimit: 10`） |

`authMiddleware`/`requireRole`/`jwt.js` 屬於 [auth 模組](auth.md)，不在此重複。

## 前端

### `frontend/src/router/index.js`

- `createRouter`：建立 vue-router 實例，整個 SPA 共用這一個 router
- `{ path: "/", name: "MainPage", component: MainPage }`：根路徑現在是獨立的首頁元件 `views/MainPage.vue`（不需登入就能看），不再直接 redirect 到 `/login`
- 登入/忘記密碼/重設密碼路由：掛載對應的頁面元件（註冊頁已移除，帳號只能由管理員建立）
- `/admin/accounts`、`/admin/courses`：管理員專用頁（`meta.requiresAdmin`），見 [auth](auth.md)、[course](course.md)
- `router.beforeEach`：現在是 async 守衛，依序處理：① 有 token 且 `mustChangePassword` → 導向 `/change-password`；② 沒 token 且不是公開頁面 → `/login`（`/` 也算公開）；③ 帳號是 `student` 且要進課程頁、而「我在各課的身分」對照表還沒載入或換了另一門課 → 先呼叫 `refreshCourseRoles()`；④ 管理員進 `/dashboard` 轉到 `/admin/accounts`、進課程頁一律轉到學生名冊；⑤ `meta.requiresTeacher`、`meta.requiresAdmin`、`meta.allowRoles` 不符 → alert 並攔截（細節見 [overview.md 11.5](../overview.md#115-前端目錄與登入狀態處理)）

課程內頁（`/course/:id/...`）的巢狀路由定義在同一個檔案裡，但實際頁面歸屬見各模組文件（含新增的 `studentlist`、`group` 兩個子路由，分別對應 [student-list](student-list.md)、[group](group.md)）。

### `frontend/src/views/MainPage.vue`：根路徑 `/` 的首頁（未登入也看得到）

- `checkLoginStatus`：檢查目前有沒有登入，決定要顯示「進入課程」還是「登入」按鈕（註冊入口已移除）
- `enterCourse`：已登入時點擊導向 `/dashboard`
- `logout`：未登入狀態下清掉殘留的 token/使用者資料

### `frontend/src/App.vue`：整個 SPA 的根元件（側欄、頁首、路由出口都在這）

- `logout`：登出，呼叫 `localStorage.clear()` 清空 token/使用者資訊，導回 `/`
- `loadUser`：App 啟動/切換路由時載入目前使用者資訊，呼叫 [auth 模組](auth.md)的 `GET /api/auth/me`，同步 `mustChangePassword`/`email`
- `getcurrentCourse`：在課程頁時依網址裡的課程代碼查課程名稱（`GET /api/courses/search`）；結果透過 `provide('currentCourse')` 給 `Course.vue` 顯示課名，頁首橫幅與麵包屑顯示課程名稱而非代碼
- `provide('refreshCourseInfo')`：讓[學生名冊](student-list.md)匯入／勾選助教後，重新載入側欄的教師/助教資訊
- `loadCourseStaff`：在課程頁時查該課程的教師/助教聯絡資訊，呼叫 [course 模組](course.md)的 `GET /api/courses/:code/contacts`，顯示在側欄並附 `mailto:` 連結
- `showEmailPrompt`：使用者資料載入完成但信箱是空的，就在頁首顯示「請填寫信箱」提示（導去 `/profile`）
- `onProfileUpdated`：監聽 [auth 模組](auth.md) Profile 頁更新信箱後觸發的 `eeclass-profile-updated` 事件，重新載入使用者資訊
- `<router-view />`：渲染目前路由對應的頁面元件
- `<NotificationBell />`：登入後（student/ta/teacher）掛載在頁首，見 [notification](notification.md)

側欄選單與頁首會員選單也定義在這個檔案的 template 裡，新增了「學生名冊」（[student-list](student-list.md)，僅 admin/teacher/ta 可見）與「小組專區」（[group](group.md)）兩個連結。管理員（`user.role === 'admin'`）的頁首連結是【帳號管理】【所有課程】（取代【我的課程】），課程側欄只有「學生名冊」。網站名稱已改為「國立中央大學「LMS 計畫」」（頁首橫幅、`frontend/index.html` 的 `<title>`、系統信件都同步）。

### `frontend/src/api/client.js`（唯一的 axios instance）

- `const api = axios.create({ baseURL: VITE_API_BASE_URL })`：建立這個共用的 axios instance
- request 攔截器：每個請求送出前自動帶上 `Authorization: Bearer <token>`
- response 攔截器（成功時）：`GET /api/auth/me` 的 `role` 換成 `courseRoleFor(role)`（在課程頁面是「在這門課的身分」），原帳號身分另存 `account_role`——各頁面原有的 `role === 'ta'` 判斷不用改
- response 攔截器：收到 401 時清空 `accessToken`/`user` 並導回 `/login`
- `export default api`：匯出給所有模組的前端程式碼呼叫 API 用

**所有模組的前端 API 呼叫都經過這個檔案**，不應該另外建立 axios instance。

### `frontend/src/utils/files.js`

- `getFileUrl`：把相對路徑補上 `VITE_API_BASE_URL` 前綴，組成可以直接打開的完整網址
- `downloadFile`：帶 JWT 用 axios 把檔案拿成 blob 再觸發瀏覽器下載（[material](material.md)、[homework](homework.md) 用，因為 `/uploads` 其實不需要登入也能存取，見下方已知問題）
- `openFileInNewTab`：不經過 axios，直接組完整 URL 開新分頁顯示檔案（[discussion](discussion.md) 的 PDF 預覽用）

### 未使用的鷹架殘留

`frontend/src/components/HelloWorld.vue`、`TheWelcome.vue`、`WelcomeItem.vue`、`icons/*`、`frontend/src/assets/logo.svg`——`create-vue` 預設模板，沒有任何頁面引用，可整批刪除。

## 已知問題（本模組）

| 優先度 | 問題 | 位置 |
| --- | --- | --- |
| High | `/uploads` 完全公開，不需登入即可下載所有上傳檔案 | `server.js` |
| Medium | `cors()` 無設定，允許任意來源 | `server.js` |
| Medium | 沒有 rate limit（登入、忘記密碼可被暴力嘗試）、沒有 helmet 等安全標頭 | — |
| Low | `homeworkRoutes.js` 內又 `router.use(authMiddleware)` 一次，跟 `server.js` 的全域設定重複（無害但多餘） | `routes/homeworkRoutes.js` |
| Low | 前端沒有全域狀態管理，`GET /api/auth/me` 在 `App.vue`、`Home.vue`、`Announcement.vue`、`Discussion.vue`、`Profile.vue` 各自重複呼叫 | — |
| Low | `App.vue` 切換路由時會額外呼叫 `GET /api/courses/search` 查課程名稱、`GET /api/courses/:code/contacts` 查聯絡資訊，課程頁的每次導航都多兩支 API 請求 | `App.vue` |
