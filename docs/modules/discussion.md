# 模組：討論區（Discussion）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [shared](shared.md)
>
> 核對日期：2026-09-29。

## 這個模組做什麼

討論主題的建立（可附 1 個 PDF + AI Prompt）、刪除、列表；巢狀留言；留言時若主題有設定 `ai_prompt`，會自動讀取附件 PDF + 歷史對話，呼叫 OpenAI 產生 AI 回覆並寫回留言串。完整資料流見 [overview.md 4.3](../overview.md#43-討論區留言--ai-自動回覆)。

## 前端程式碼

- **`frontend/src/views/course/Discussion.vue`**：討論主題列表頁
  - `handleFileChange`：選擇要附加的 PDF 檔
  - `loadUser`：載入目前使用者資訊（決定角色）
  - `fetchDiscussions`：載入主題列表，呼叫 `GET .../discussions`
  - `createDiscussion`：建立新主題（含附件），呼叫 `POST .../discussions`（multipart）
  - `deleteDiscussion`：刪除主題，呼叫 `DELETE /api/discussions/:id`
- **`frontend/src/views/course/DiscussionDetail.vue`**：單一主題的留言頁
  - `onViewAttachment`：開啟主題附加的 PDF
  - `fetchData`：載入該主題的巢狀留言，呼叫 `GET /api/discussions/:roomId/threads`
  - `submitThread`：送出留言（可能觸發 AI 回覆），呼叫 `POST /api/discussions/:roomId/threads`
- **`frontend/src/views/course/DiscussionThread.vue`**：遞迴留言元件（一則留言 + 其底下的回覆），**也被 [aiquiz](aiquiz.md) 的留言功能共用**
  - `defineProps`、`defineEmits(['submit-reply'])`：接收這則留言的資料，送出回覆事件給父層
  - `handleReply`：展開回覆輸入框並送出
  - `roleText`、`roleClass`：把角色代碼轉成顯示文字/樣式（例如把 `'AI'` 顯示成「AI 助教」並套不同顏色）

## 後端程式碼

### Route

| 檔案 | 內容 |
| --- | --- |
| `routes/courseRoutes.js` | `GET /:courseCode/discussions`、`POST /:courseCode/discussions`（staff，`uploadPdf.single('file')`）⚠️ 課程代碼實際取自 body 的 `course_code`，不是路徑參數 |
| `routes/discussionRoutes.js` | `DELETE /:id`（teacher, ta）、`GET /:roomId/threads`、`POST /:roomId/threads`，掛載於 `/api/discussions` |

### Controller — `backend/src/controllers/discussionController.js`

- `getCourseDiscussions`：取得課程討論主題列表
- `createRoom`：建立討論主題（可附 PDF + AI Prompt）
- `deleteRoom`：刪除討論主題
- `getRoomThreads`：取得某主題底下的巢狀留言
- `addThread`：新增留言（可能觸發 AI 自動回覆）

### Service — `backend/src/services/discussionService.js`

| 函式 | 備註 |
| --- | --- |
| `getCourseDiscussions` | |
| `createDiscussion` | |
| `deleteDiscussion` | |
| `getRoomAndThreads` | |
| `addThreadAndTriggerAI` | 核心 AI 邏輯：寫入留言 → 讀 `ai_prompt`/`file_path` → `PdfHelper.extractText` → 沿 `parent_thread_id` 追溯歷史 → 直接用 `fetch` 呼叫 OpenAI（**沒有經過 `utils/openaiHelper.js`**）→ 寫入 AI 回覆 |

### Model — `backend/src/models/discussionModel.js`

- `getRoomsByCourseId`：查某課程的討論主題列表
- `createRoom`：寫入 `discussion_rooms`
- `deleteRoom`：刪除討論主題
- `getRoomById`：依 id 查單一主題（含 `ai_prompt`/`file_path`，AI 回覆要用）
- `getThreadsByRoomId`：查某主題下所有留言
- `createThread`：寫入 `threads`
- `getParentThreadInfo`：查父留言資訊（組 AI 要看的歷史對話用）

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/courses/:courseCode/discussions` | `getCourseDiscussions` | JWT |
| POST | `/api/courses/:courseCode/discussions` | `createRoom` | JWT + (teacher, ta) |
| DELETE | `/api/discussions/:id` | `deleteRoom` | JWT + (teacher, ta) |
| GET | `/api/discussions/:roomId/threads` | `getRoomThreads` | JWT |
| POST | `/api/discussions/:roomId/threads` | `addThread` | JWT |

## 資料庫

`discussion_rooms`、`threads`，見 [database.md 3.5](../database.md#35-討論區)。`threads.student_id` 存的是 `accounts.id`（數字轉字串）或字面值 `'AI'`，不是 `students.id`，命名容易誤導。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| Low | 刪除討論主題時，附件 PDF 實體檔不會一併刪除（見 [database.md 第 4 節「刪除連動」](../database.md#刪除連動)） |
| Low | `discussion_rooms.room_name` 欄位建立時從未被寫入，是死欄位 |
| Low | AI 呼叫直接寫在 `discussionService.js` 裡用 `fetch`，沒有走共用的 `openaiHelper.js`，跟其他 AI 模組（[homework-ai](homework-ai.md)、[course-ai](course-ai.md)、[aiquiz](aiquiz.md)）風格不一致 |
