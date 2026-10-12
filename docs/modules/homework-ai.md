# 模組：作業 AI（Homework AI）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [shared](shared.md)
>
> 核對日期：2026-09-29。CRUD/繳交/批改本體在 [homework](homework.md)，這裡只涵蓋 AI 相關功能。

## 這個模組做什麼

- 教師：單題 / 整份 / 批次 AI 預評分（**目前前端沒有任何頁面呼叫這三支 API**）、課程層級 AI Prompt 設定（chat/discussion/grading 三種 + 四個資料存取開關）。
- 學生：自評（AI 預估分數）、針對子題與 AI 解惑聊天（蘇格拉底式、禁止透露評分標準）。

## 前端程式碼

- **`frontend/src/views/course/student/HomeworkStudent.vue`**：學生端 AI 解惑聊天 + 自評按鈕
  - `scrollChatToBottom`：收到新訊息後把聊天視窗捲到最下面
  - `sendChat`：送出一則聊天訊息，呼叫 `POST .../questions/:qId/ai-chat`
  - `estimateMyScore`：請 AI 預估自己的分數，呼叫 `POST .../self-estimate`
- **`frontend/src/components/ChatBot.vue`**：⚠️ 這兩支呼叫的是「本模組」的 API，但元件本身歸類在 [course-ai](course-ai.md)（因為它同時也是課程 AI 助教聊天窗），教師打開 ChatBot 看到的「Prompt 設定表單」其實是在改**這個模組**用到的 grading/discussion prompt
  - `savePrompt`：教師儲存 Prompt 設定，呼叫 `PUT /api/courses/:code/ai-prompts`
  - `fetchTeacherPrompt`：載入目前的 Prompt 設定，呼叫 `GET /api/courses/:code/ai-prompts`
- 教師用的 `ai-grade` / `ai-grade-batch` API **沒有對應的前端呼叫**，見已知問題

## 後端程式碼

### Route — `backend/src/routes/homeworkAiRoutes.js`（掛載於 `/api`）

- `GET /courses/:courseId/ai-prompts`（staff）
- `PUT /courses/:courseId/ai-prompts`（staff）
- `POST /submissions/:submissionId/ai-grade`（staff）
- `POST /submissions/:submissionId/questions/:questionId/ai-grade`（staff）
- `POST /homeworks/:hwId/ai-grade-batch`（staff）
- `POST /homeworks/:hwId/self-estimate`（studentSide）
- `POST /homeworks/:hwId/questions/:questionId/ai-chat`（studentSide）

### Controller — `backend/src/controllers/homeworkAiController.js`

| 函式 | 做什麼 | 備註 |
| --- | --- | --- |
| `getPrompts` | 讀某課程的 AI Prompt 設定 | 直接 `import { pool }`，略過 Model 層 |
| `updatePrompts` | 寫入/更新該課程的 AI Prompt 設定 | |
| `gradeOverall` | 對整份繳交做 AI 總評分 | |
| `gradeQuestion` | 對單一子題做 AI 評分 | |
| `batchGrade` | 對某作業批次 AI 評分所有繳交 | |
| `selfEstimate` | 學生自評，AI 預估分數 | |
| `chatWithAi` | 學生與 AI 解惑聊天 | |

### Service — `backend/src/services/homeworkAiService.js`

| 函式 | 做什麼 | 備註 |
| --- | --- | --- |
| `parseHomeworkAttachments` | 解析作業附件清單（轉成 AI 讀得懂的格式） | |
| `isPdfFile` | 判斷檔名是否為 PDF | 純函式，零依賴，適合優先補測試 |
| `isPdfSubmission` | 判斷某筆繳交內容是否為 PDF | |
| `buildHomeworkAttachmentContext` | 把附件內容組成文字，當 AI 評分的上下文 | |
| `perQuestionMaxScores` | 算每題的滿分（100 分依題數均分） | 純函式，零依賴，適合優先補測試 |
| `runAiGradeQuestion` | 對單一子題呼叫 AI 評分 | 用 `CourseAiModel.getPromptsByCourseId(hw.course_id)`——`hw.course_id` 是 `course_code`，但此函式查的是 `courses.id`，永遠查不到（見已知問題）；有 `console.log` 完整 prompt |
| `runAiGradeAllQuestions` | 對整份繳交逐題呼叫 `runAiGradeQuestion` 再加總 | |
| `chatWithTutor` | 呼叫 AI 回覆學生的解惑聊天 | 只取 `messages.slice(-16)`：後端只取最後 16 則，`messages` 直接來自 request body，未過濾 `role`（見已知問題） |

### Model / Utils

| 檔案 | 內容 |
| --- | --- |
| `models/courseAiModel.js` | `getPromptsByCourseId`、`upsertPrompts`（被本模組使用，詳見 [course-ai.md](course-ai.md)） |
| `models/homeworkAiModel.js` | `homeworkAiModel.getByCourseId`——⚠️ 定義了但全專案沒有任何地方 import 這個檔案，是死碼 |
| `utils/openaiHelper.js` | `OpenAiHelper.chat`，支援 `jsonMode` |
| `utils/pdfHelper.js` | `PdfHelper.extractText` |
| `utils/aiJsonParse.js` | `stripMarkdownJsonFence`（去掉 AI 回覆外層的 ```json 包裝）、`tryParseJsonObject`（嘗試把字串解析成 JSON，失敗不丟例外） |

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/courses/:courseId/ai-prompts` | `getPrompts` | JWT + (teacher, ta) |
| PUT | `/api/courses/:courseId/ai-prompts` | `updatePrompts` | JWT + (teacher, ta) |
| POST | `/api/submissions/:submissionId/ai-grade` | `gradeOverall` | JWT + (teacher, ta) |
| POST | `/api/submissions/:submissionId/questions/:questionId/ai-grade` | `gradeQuestion` | JWT + (teacher, ta) |
| POST | `/api/homeworks/:hwId/ai-grade-batch` | `batchGrade` | JWT + (teacher, ta) |
| POST | `/api/homeworks/:hwId/self-estimate` | `selfEstimate` | JWT + (student, ta) |
| POST | `/api/homeworks/:hwId/questions/:questionId/ai-chat` | `chatWithAi` | JWT + (student, ta) |

## 資料庫

讀寫 `homework_submissions` 的 `ai_estimated_score`/`ai_estimated_reason`/`ai_estimated_at`（⚠️ 未建表，見 [database.md 3.4](../database.md#34-作業)）、`homework_questions.ai_prompt`/`discussion_prompt`、`course_ai_prompts.grading_prompt`/`discussion_prompt`。

## 已知問題（本模組）

| 優先度 | 問題 | 位置 |
| --- | --- | --- |
| High | `ai_estimated_*` 三欄位未建表，全新環境呼叫這三支 AI 評分 API 會失敗 | 見 [database.md 3.4](../database.md#34-作業) |
| High | `runAiGradeQuestion` 用 `hw.course_id`（存 `course_code`）查 `course_ai_prompts.course_id`（存 `courses.id`），課程層級評分提示永遠是空字串 | `homeworkAiService.js` |
| Medium | `homeworkAiController.js` 全部方法一律回 500，不分「找不到子題」這種應為 4xx 的情境 | `controllers/homeworkAiController.js` |
| Medium | `chatWithTutor` 直接把前端傳來的 `messages` 塞進去，沒有過濾 `role`，可被夾帶 `role: "system"` 繞過「禁止透露評分標準」 | `homeworkAiService.js` |
| Medium | `PdfHelper.extractText` 的 catch 參數是 `err`，卻 log `error`，PDF 解析失敗時會再丟 `ReferenceError`，掩蓋原本的錯誤（這個共用工具也被 [discussion](discussion.md)、[aiquiz](aiquiz.md) 使用） | `utils/pdfHelper.js` |
| Medium | 教師用的 `ai-grade`／`ai-grade-batch`／單題 `ai-grade` 三支 API 前端沒有任何呼叫入口 | — |
| Medium | 學生重新整理作業頁後看不到 AI 預估分數：`HomeworkModel.getStudentSubmission`（見 [homework.md](homework.md)）沒有 select `ai_estimated_*` | `models/homeworkModel.js` |
| Low | 單題 AI 評分回傳 `question_order: q.questionOrder`，但物件實際欄位是 `question_order`（snake_case），值恆為 `undefined` | `homeworkAiService.js` |
| Low | `models/homeworkAiModel.js` 未被引用，死碼 | `models/homeworkAiModel.js` |
