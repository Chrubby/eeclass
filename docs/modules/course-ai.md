# 模組：課程 AI 助教（Course AI Assistant）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [aiquiz](aiquiz.md) ・ [shared](shared.md)
>
> 核對日期：2026-09-29。作業相關的 AI Prompt 讀寫（`GET/PUT /api/courses/:courseId/ai-prompts`）雖然掛在同一個 `ChatBot.vue` 元件裡，但屬於 [homework-ai](homework-ai.md) 模組，這裡只涵蓋學生聊天、作業提醒、聊天紀錄。

## 這個模組做什麼

學生（含 ta）跟課程 AI 助教聊天（可依教師設定讀取公告/作業/學生資訊/成績當輔助資料）、產生未繳作業提醒、查看聊天紀錄。教師/助教在同一個 UI 元件（`ChatBot.vue`）裡看到的是 Prompt 設定表單，不是聊天窗。

## 前端程式碼

- **`frontend/src/components/ChatBot.vue`**：**目前只掛載在 `Announcement.vue`**；`savePrompt`/`fetchTeacherPrompt` 屬於 [homework-ai](homework-ai.md)
  - `defineProps`：接收 `courseCode`/`studentCode`/`role`，決定要顯示聊天窗還是教師的 Prompt 設定表單
  - `fetchReminder`：載入未繳作業提醒，呼叫 `POST .../ai-assistant/remind`
  - `fetchChatHistory`：載入過去的聊天紀錄，呼叫 `GET .../ai-assistant/history/:code/:studentCode`
  - `handleSend`：送出一則聊天訊息給 AI 助教，呼叫 `POST .../ai-assistant/ask`

## 後端程式碼

### Route — `backend/src/routes/courseAiRoutes.js`（用 `router.use("/:courseCode", ...)` 掛進 `courseRoutes.js`）

- `POST /ai-assistant/ask`（studentSide）
- `POST /ai-assistant/remind`（studentSide）
- `GET /ai-assistant/history/:courseCode/:studentCode`（studentSide）⚠️ 路徑裡 `:courseCode` 出現兩次，因為這支路由檔沒有 `mergeParams: true`，實際生效的是這裡（內層）宣告的 `:courseCode`，外層掛載路徑的參數讀不到

### Controller — `backend/src/controllers/courseAiController.js`

- `askAi`：學生跟 AI 助教聊天
- `remindHomework`：產生未繳作業提醒
- `getHistory`：查聊天紀錄

### Service — `backend/src/services/courseAiService.js`

| 函式 | 做什麼 | 備註 |
| --- | --- | --- |
| `askAssistant` | 組合課程資料當上下文，呼叫 AI 回答學生問題 | 依序讀公告、讀作業（⚠️ 鍵值錯誤，見已知問題）、讀學生資訊（⚠️ 鍵值錯誤）、讀成績（鍵值正確） |
| `remindHomework` | 查學生有哪些作業還沒交，組成提醒文字 | 鍵值正確（用 `course_code`/`accounts.username` 對照） |

### Model — `backend/src/models/courseAiModel.js`

| 函式 | 做什麼 | 備註 |
| --- | --- | --- |
| `getPromptsByCourseId` | 依 `courses.id` 查該課程的 AI Prompt 設定 | 給本模組與 [homework-ai](homework-ai.md) 共用 |
| `getPromptsByCourseCode` | 依 `course_code` 查該課程的 AI Prompt 設定 | 給 [homework-ai](homework-ai.md) 的 `getPrompts` 用 |
| `upsertPrompts` | 新增或更新該課程的 AI Prompt 設定 | 給 [homework-ai](homework-ai.md) 的 `updatePrompts` 用（找不到課程時丟 `Error("找不到課程")`；INSERT 分支欄位與參數數量已對齊） |
| `saveMessage` | 寫入一則聊天訊息 | |
| `getChatHistory` | 查某學生與 AI 助教的聊天紀錄 | ⚠️ `ORDER BY created_at ASC LIMIT n`，取到最早 n 筆，見已知問題 |

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| POST | `/api/courses/:courseCode/ai-assistant/ask` | `askAi` | JWT + (student, ta) |
| POST | `/api/courses/:courseCode/ai-assistant/remind` | `remindHomework` | JWT + (student, ta) |
| GET | `/api/courses/:courseCode/ai-assistant/history/:courseCode/:studentCode` | `getHistory` | JWT + (student, ta) |

## 資料庫

`ai_chat_messages`、`course_ai_prompts`，見 [database.md 3.6](../database.md#36-ai-助教--prompt-設定)。

## 已知問題（本模組）

| 優先度 | 問題 | 位置 |
| --- | --- | --- |
| High | `askAssistant` 的 `send_assignments` 區塊用 `course.id` 查 `homeworks.course_id`（存 `course_code`），查不到任何作業 | `courseAiService.js` |
| High | `askAssistant` 的 `send_student_info` 區塊用 `students.id`/`courses.id` 查 `homework_submissions.student_id`（存 username）/`homeworks.course_id`（存 course_code），結果恆為空或錯誤 | `courseAiService.js` |
| Medium | `getChatHistory` 用 `ORDER BY created_at ASC LIMIT n`，聊天紀錄 API 永遠顯示最早 20 筆，AI 的上下文永遠是最早 10 筆，不是最近的 | `courseAiModel.js` |
| Medium | `remindHomework` 對教師角色也會被 `ChatBot.vue` 呼叫（無角色檢查即觸發），後端回 403 被前端 catch 吞掉，只是多打一次無效 API | `ChatBot.vue` |
| Medium | `ChatBot.vue` 用 `v-html="renderMarkdown(...)"` 渲染 AI 回覆與提醒，只經過 `marked`，沒有 sanitize，有 XSS 風險 | `components/ChatBot.vue` |
