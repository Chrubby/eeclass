# 模組：討論區（Discussion）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [notification](notification.md) ・ [shared](shared.md)
>
> 核對日期：2026-10-12。

## 這個模組做什麼

討論主題的建立（可附 1 個 PDF + AI Prompt）、修改、刪除、列表；巢狀留言的新增、修改、刪除（含權限檢查：本人或教師/助教才能改/刪）；留言時若使用者勾選「請 AI 回覆」且主題有設定 `ai_prompt`，會自動讀取附件 PDF + 歷史對話，呼叫 OpenAI 產生 AI 回覆並寫回留言串（AI 回覆現在是**選擇性**的，不是每則留言都觸發）；新增主題/留言時會對課程其他修課學生建立[站內通知](notification.md)。完整資料流見 [overview.md 4.3](../overview.md#43-討論區留言--ai-自動回覆)。

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
  - `startEditRoom`/`onRoomFile`/`saveRoom`：教師/助教修改主題（標題/內容/AI Prompt/更換或移除附件 PDF），呼叫 `PUT /api/discussions/:id`（multipart）
  - `aiAvailable`：該主題是否有設定 `ai_prompt`（決定要不要顯示「請 AI 回覆」勾選框）
  - `submitThread`：送出留言，`wantAi` 參數對應使用者有沒有勾選「請 AI 回覆」，呼叫 `POST /api/discussions/:roomId/threads`（帶 `request_ai`）
- **`frontend/src/views/course/DiscussionThread.vue`**：遞迴留言元件（一則留言 + 其底下的回覆），**也被 [aiquiz](aiquiz.md) 的留言功能共用**
  - `defineProps`、`defineEmits(['submit-reply', 'changed'])`：接收這則留言的資料，送出回覆/異動事件給父層
  - `handleReply`：展開回覆輸入框並送出
  - `startEdit`/`saveEdit`：本人或教師/助教修改這則留言，呼叫 `PUT /api/discussions/threads/:threadId`
  - `roleText`、`roleClass`：把角色代碼轉成顯示文字/樣式（例如把 `'AI'` 顯示成「AI 助教」並套不同顏色）

## 後端程式碼

### Route

| 檔案 | 內容 |
| --- | --- |
| `routes/courseRoutes.js` | `GET /:courseCode/discussions`、`POST /:courseCode/discussions`（staff，`uploadPdf.single('file')`）⚠️ 課程代碼實際取自 body 的 `course_code`，不是路徑參數 |
| `routes/discussionRoutes.js` | `PUT /:id`（teacher, ta，修改主題）、`DELETE /:id`（teacher, ta）、`PUT /threads/:threadId`、`DELETE /threads/:threadId`、`GET /:roomId/threads`、`POST /:roomId/threads`，掛載於 `/api/discussions` |

### Controller — `backend/src/controllers/discussionController.js`

- `getCourseDiscussions`：取得課程討論主題列表
- `createRoom`：建立討論主題（可附 PDF + AI Prompt）
- `updateRoom`：修改討論主題（標題/內容/AI Prompt/附件）
- `deleteRoom`：刪除討論主題
- `getRoomThreads`：取得某主題底下的巢狀留言
- `addThread`：新增留言（`request_ai` 為真且主題有設定 `ai_prompt` 才會觸發 AI 自動回覆）
- `updateThread`：修改一則留言（本人或教師/助教）
- `deleteThread`：刪除一則留言（本人或教師/助教；AI 自己的留言只有教師/助教能刪）

### Service — `backend/src/services/discussionService.js`

| 函式 | 備註 |
| --- | --- |
| `getCourseDiscussions` | |
| `createDiscussion` | 建立成功後呼叫 [notification](notification.md) 的 `NotificationService.notifyByCourseCode` 通知修課學生 |
| `updateDiscussion` | 修改標題/內容/AI Prompt/附件（可勾選移除現有附件） |
| `updateThread`/`deleteThread` | 檢查操作者是本人（`author_username === username`）或教師/助教，才允許修改/刪除；AI 自己發的留言只有教師/助教能刪 |
| `deleteDiscussion` | |
| `getRoomAndThreads` | |
| `addThreadAndTriggerAI` | 寫入留言 → 若 `requestAi` 為真且主題有 `ai_prompt` 才繼續：先建立站內通知，再讀 `file_path` → `PdfHelper.extractText` → 沿 `parent_thread_id` 追溯歷史 → 直接用 `fetch` 呼叫 OpenAI（**沒有經過 `utils/openaiHelper.js`**）→ 寫入 AI 回覆（⚠️ 函式末段還留著一行判斷式已經不會執行到的舊檢查，見已知問題） |

### Model — `backend/src/models/discussionModel.js`

- `getRoomsByCourseId`：查某課程的討論主題列表（發文者姓名優先查 `created_by` 對應的教師/學生名稱，查不到再退回主題下第一則留言的作者）
- `createRoom`：寫入 `discussion_rooms`（含 `created_by`）
- `updateRoom`：更新標題/內容/AI Prompt/附件路徑（`clearFile` 為真時清空附件）
- `deleteRoom`：刪除討論主題
- `getRoomById`：依 id 查單一主題（含 `ai_prompt`/`file_path`/對應課程代碼，AI 回覆跟通知都要用）
- `getThreadsByRoomId`：查某主題下所有留言（含發文者 `author_username`）
- `getThreadById`：依 id 查單一留言（含發文者帳號/角色，修改/刪除前先檢查權限用）
- `updateThreadContent`：更新留言內容
- `deleteThread`：刪除一則留言
- `createThread`：寫入 `threads`
- `getParentThreadInfo`：查父留言資訊（組 AI 要看的歷史對話用）

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/courses/:courseCode/discussions` | `getCourseDiscussions` | JWT |
| POST | `/api/courses/:courseCode/discussions` | `createRoom` | JWT + (teacher, ta) |
| PUT | `/api/discussions/:id` | `updateRoom` | JWT + (teacher, ta) |
| DELETE | `/api/discussions/:id` | `deleteRoom` | JWT + (teacher, ta) |
| GET | `/api/discussions/:roomId/threads` | `getRoomThreads` | JWT |
| POST | `/api/discussions/:roomId/threads` | `addThread` | JWT |
| PUT | `/api/discussions/threads/:threadId` | `updateThread` | JWT（本人或 teacher/ta） |
| DELETE | `/api/discussions/threads/:threadId` | `deleteThread` | JWT（本人或 teacher/ta） |

## 資料庫

`discussion_rooms`、`threads`，見 [database.md 3.5](../database.md#35-討論區)。`threads.student_id` 存的是 `accounts.id`（數字轉字串）或字面值 `'AI'`，不是 `students.id`，命名容易誤導。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| Low | 刪除討論主題時，附件 PDF 實體檔不會一併刪除（見 [database.md 第 4 節「刪除連動」](../database.md#刪除連動)） |
| Low | `discussion_rooms.room_name` 欄位建立時從未被寫入，是死欄位 |
| Low | AI 呼叫直接寫在 `discussionService.js` 裡用 `fetch`，沒有走共用的 `openaiHelper.js`，跟其他 AI 模組（[homework-ai](homework-ai.md)、[course-ai](course-ai.md)、[aiquiz](aiquiz.md)）風格不一致 |
| Low | `addThreadAndTriggerAI` 裡 `if (!roomInfo?.ai_prompt) return;` 這行在目前邏輯下已經是永遠不會執行到的死碼（上面的 `requestAi` 檢查已經先擋掉了），只是還沒清掉 |
