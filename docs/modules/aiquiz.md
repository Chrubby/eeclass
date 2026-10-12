# 模組：AI 測驗（AI Quiz）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [shared](shared.md)
>
> 核對日期：2026-09-29。
## 這個模組做什麼

教師上傳 PDF 讓 AI 出題（純生成，不寫 DB）→ 編輯題目與「討論回饋 Prompt」→ 發布測驗；學生作答後即時取得 AI 回饋，並可看同儕作答；每筆作答下可巢狀留言討論（重用 [discussion](discussion.md) 的 `DiscussionThread.vue`）。

## 前端程式碼

- **`frontend/src/views/course/AIQuiz.vue`**：測驗列表
  - `loadQuizzes`：載入測驗列表，呼叫 `GET .../aiquizzes`
  - `deleteQuiz`：刪除測驗，呼叫 `DELETE .../aiquizzes/:id`
- **`frontend/src/views/course/AIQuizDetail.vue`**：測驗作答/檢視頁，`studentId`/`studentName` 直接取自 `getUsernameFromToken()`/`localStorage.userName`（⚠️ 後者從未被 `setItem` 過，見已知問題）
  - `transformNode`：把後端回傳的留言資料轉成 `DiscussionThread.vue` 吃的格式
  - `loadQuizData`：載入測驗題目、自己/同儕的作答、留言，呼叫 `GET .../aiquizzes/:quizId?role=&studentId=`
  - `handleCommentSubmit`：在某筆作答下送出留言，呼叫 `POST .../answers/:id/comments`
  - `submitAnswers`：送出學生作答，呼叫 `POST .../aiquizzes/:quizId/answers`
- **`frontend/src/views/course/teacher/AIQuizCreate.vue`**：教師出題頁
  - `onReferenceFileChange`：選擇要讓 AI 出題的參考 PDF
  - `generateAIQuestions`：請 AI 依 PDF 產生題目（純生成，不寫 DB），呼叫 `POST .../aiquizzes/generate`
  - `submitAssignment`：發布測驗（把題目寫進 DB），呼叫 `POST .../aiquizzes`
- **`frontend/src/views/course/DiscussionThread.vue`**：見 [discussion.md](discussion.md)；遞迴留言樹元件，本模組直接重用，不重複實作

## 後端程式碼

### Route — `backend/src/routes/AiQuizRoutes.js`（`mergeParams: true`，掛載於 `/api/courses/:courseId/aiquizzes`）

- `POST /generate`（`uploadPdf.single`）
- `POST /`（建立測驗）
- `GET /`（列表）
- `GET /:quizId`（詳情）
- `POST /:quizId/answers`（提交答案）
- `DELETE /:quizId`
- `POST /answers/:answerId/comments`

⚠️ 整支路由檔只掛了 `authMiddleware`（來自 `courseRoutes.js` 的全域設定），**沒有任何 `requireRole`**，見已知問題。

### Controller — `backend/src/controllers/AiQuizController.js`

- `generateAIQuestions`：上傳 PDF 讓 AI 出題（純生成，不寫 DB）
- `createQuiz`：發布測驗（把題目寫進 DB）
- `getQuizzes`：取得測驗列表
- `getQuizDetail`：取得測驗詳情（`role`/`studentId` 取自 `req.query`，未核對 `req.user`，見已知問題）
- `submitAnswers`：學生提交答案
- `deleteQuiz`：刪除測驗
- `postComment`：在某筆作答下留言

### Service — `backend/src/services/AiQuizService.js`

| 函式 | 做什麼 | 備註 |
| --- | --- | --- |
| `generateQuestionsFromPdf` | 讀 PDF 內容，呼叫 AI 產生題目 | |
| `createQuiz` | 寫入測驗與題目 | |
| `getQuizList` | 查某課程的測驗列表 | |
| `getQuizDetail`（第一次定義） | — | ⚠️ 死碼，被下面第二次定義覆蓋 |
| `submitStudentAnswers` | 寫入學生作答，觸發 AI 即時回饋 | 沒有檢查測驗截止時間 |
| `deleteQuiz` | 刪除測驗 | |
| `getQuizDetail`（第二次定義，實際生效） | 查測驗詳情、題目、作答、留言 | 含留言樹組裝 |
| `buildCommentTree` | 把扁平的留言資料組成巢狀樹狀結構 | |
| `addComment` | 寫入一筆留言 | |

### Model — `backend/src/models/AiQuizModel.js`

| 函式 | 做什麼 | 備註 |
| --- | --- | --- |
| `createQuizWithQuestions` | 寫入 `AIQuizzes` 與 `AIQuestions` | transaction |
| `getQuizzesByCourse` | 查某課程的測驗列表 | |
| `getQuizById` | 查單一測驗（含題目） | |
| `getAllAnswersByQuestion` | 查某題所有學生的作答（同儕作答用） | |
| `saveStudentAnswer` | 寫入學生作答 | `ON DUPLICATE KEY UPDATE` 實際不會觸發，見已知問題 |
| `getStudentAnswersForQuiz` | 查某學生在整份測驗的作答 | |
| `getPeerAnswers` | 查同儕（其他學生）的作答 | |
| `checkStudentSubmission` | 檢查學生是否已作答過 | |
| `deleteQuiz` | 刪除測驗 | |
| `saveComment` | 寫入 `AIQuizComments` | |
| `getCommentsByAnswer` | 查某筆作答底下的留言 | |

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| POST | `/api/courses/:courseId/aiquizzes/generate` | `generateAIQuestions` | JWT ⚠️ 無角色限制 |
| POST | `/api/courses/:courseId/aiquizzes` | `createQuiz` | JWT ⚠️ 無角色限制 |
| GET | `/api/courses/:courseId/aiquizzes` | `getQuizzes` | JWT |
| GET | `/api/courses/:courseId/aiquizzes/:quizId` | `getQuizDetail` | JWT |
| POST | `/api/courses/:courseId/aiquizzes/:quizId/answers` | `submitAnswers` | JWT |
| DELETE | `/api/courses/:courseId/aiquizzes/:quizId` | `deleteQuiz` | JWT ⚠️ 無角色限制 |
| POST | `/api/courses/:courseId/aiquizzes/answers/:answerId/comments` | `postComment` | JWT |

## 資料庫

`AIQuizzes`、`AIQuestions`、`StudentAnswers`、`AIQuizComments`，見 [database.md 3.8](../database.md#38-ai-測驗)。`AIQuizzes.courseId` 存 `course_code`、`teacherId`/`StudentAnswers.studentId` 存 `accounts.username`，皆無 DB 層 FK。

## 已知問題（本模組）

| 優先度 | 問題 | 位置 |
| --- | --- | --- |
| High | 整組路由沒有 `requireRole`，一般學生也能呼叫「出題/建立/刪除測驗」這些應為教師專用的 API | `routes/AiQuizRoutes.js` |
| High | 提交答案、留言時的 `studentId`/`studentName`/`userId`/`userName`/`role` 全部由前端傳入，後端直接信任，可冒用他人身分作答/留言，或用 `role=teacher` 取得全班作答視角 | `controllers/AiQuizController.js`、`AIQuizDetail.vue` |
| Medium | `submitStudentAnswers` 沒有檢查測驗 `deadline`，過期仍可作答 | `AiQuizService.js` |
| Low | `getQuizDetail` 定義兩次，前者是死碼 | `AiQuizService.js` |
| Low | `saveStudentAnswer` 的 `ON DUPLICATE KEY UPDATE` 不會觸發（`StudentAnswers` 沒有 `UNIQUE(questionId, studentId)`，`id` 每次都是新 UUID），重新作答會新增一筆而非覆蓋 | `AiQuizModel.js` |
| Low | `AIQuizDetail.vue` 讀 `localStorage.getItem('userName')`，但全專案沒有任何地方 `setItem` 過這個 key，顯示名稱其實一直是帳號 | `AIQuizDetail.vue` |
