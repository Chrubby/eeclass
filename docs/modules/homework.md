# 模組：作業（Homework）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [shared](shared.md)
>
> 核對日期：2026-09-29。AI 相關功能（預評分、解惑聊天）獨立在 [homework-ai](homework-ai.md)，這裡只涵蓋 CRUD、繳交、批改、歷程。

## 這個模組做什麼

教師建立/編輯/刪除作業（含多子題、多附件）；學生繳交/收回；教師查看繳交清單、批改（逐題給分）、查看完整歷程（繳交/收回/批改/AI 預估的時間軸）。

## 前端程式碼

- **`frontend/src/views/course/Homework.vue`**：作業列表（依角色顯示不同欄位）
  - `loadHomeworkList`：載入作業列表，呼叫 `GET /api/courses/:id/homeworks`
  - `goToDetail`、`goToCreateHomework`：導到作業詳情頁 / 建立作業頁
- **`frontend/src/views/course/student/HomeworkStudent.vue`**：學生端作業詳情頁，AI 相關函式見 [homework-ai](homework-ai.md)
  - `onDownloadAttachment`：下載作業附件
  - `loadData`：載入作業內容、課程資訊、自己的繳交狀態（`GET /api/homeworks/:hwId` + `GET /api/courses/:id/homeworks` + `GET /api/homeworks/:hwId/submissions/me`）
  - `handleFileChange`：選擇要繳交的附件
  - `submitHomework`：送出繳交，呼叫 `POST /api/homeworks/:hwId/submissions`
  - `unsubmitHomework`：收回繳交，呼叫 `DELETE .../submissions/me`
- **`frontend/src/views/course/teacher/HomeworkTeacher.vue`**：教師端作業詳情頁
  - `loadData`：載入作業內容與繳交清單（`GET /api/homeworks/:hwId` + `GET .../submissions`）
  - `openHistory`：開啟某筆繳交的歷程時間軸，呼叫 `GET /api/submissions/:id/history`
  - `deleteHomework`：刪除作業，呼叫 `DELETE /api/homeworks/:hwId`
- **`frontend/src/views/course/teacher/HomeworkCreate.vue`**：建立作業表單（多子題、每題可設 `answerFormat`/`gradingPrompt`/`discussionPrompt`）
  - `submitAssignment`：送出新作業，呼叫 `POST /api/courses/:id/homeworks`
- **`frontend/src/views/course/teacher/HomeworkEdit.vue`**：編輯作業表單
  - `loadHomework`：載入既有作業內容，呼叫 `GET /api/homeworks/:hwId`
  - `saveHomework`：送出修改，呼叫 `PUT /api/homeworks/:hwId`
- **`frontend/src/views/course/teacher/HomeworkGrade.vue`**：逐題批改頁
  - `loadData`：載入某筆繳交內容與作業題目（`GET /api/submissions/:id` + `GET /api/homeworks/:hwId`）
  - `submitGrade`：送出批改分數/評語，呼叫 `POST /api/submissions/:id/grade`

## 後端程式碼

### Route — `backend/src/routes/homeworkRoutes.js`（掛載於 `/api`）

- `GET /homeworks/:hwId`
- `PUT /homeworks/:hwId`（staff）
- `DELETE /homeworks/:hwId`（staff）
- `POST /homeworks/:hwId/submissions`（studentSide）
- `GET /homeworks/:hwId/submissions/me`（studentSide）
- `DELETE /homeworks/:hwId/submissions/me`（studentSide）
- `GET /homeworks/:hwId/submissions`（staff）
- `GET /submissions/:submissionId`（staff）
- `POST /submissions/:submissionId/grade`（staff）
- `GET /submissions/:submissionId/history`（staff）

另外 `routes/courseRoutes.js` 有 `GET/POST /:courseId/homeworks`（列表 + 發布）。

### Controller — `backend/src/controllers/homeworkController.js`

- `publishHomework`：教師發布新作業
- `getCourseHomeworks`：取得課程作業列表（依角色附加繳交/批改統計）
- `getHomeworkDetail`：取得單一作業詳情（含子題）
- `updateHomework`：編輯作業
- `deleteHomework`：刪除作業
- `submitHomework`：學生繳交作業
- `getMySubmission`：取得自己的繳交內容
- `unsubmitHomework`：學生收回繳交
- `getSubmissionsList`：教師查看某作業的繳交清單
- `getSubmissionDetail`：教師查看單一學生的繳交內容
- `gradeSubmission`：教師逐題批改
- `getSubmissionHistory`：查看繳交/批改/AI 預估的歷程時間軸

### Service — `backend/src/services/homeworkService.js`

| 函式 | 備註 |
| --- | --- |
| `publishHomework` | transaction |
| `getCourseHomeworks` | 依角色附加繳交/批改統計 |
| `getHomeworkDetail` | |
| `submitHomework` | 檢查截止時間；檢查「不能繳空內容」 |
| `updateHomework` | transaction；有傳 `questions` 時整批刪除重建 |
| `deleteHomework` | |
| `unsubmitHomework` | 保留內容，只標記 `is_submitted=0` |
| `gradeSubmission` | |
| `getSubmissionHistory` | |

### Model — `backend/src/models/homeworkModel.js`

- `createHomework`：寫入 `homeworks`
- `updateHomeworkAttachments`：更新作業附件
- `updateHomeworkById`：更新作業本體欄位
- `deleteSubmissionsByHomeworkId`：刪除某作業底下所有繳交紀錄（編輯作業重建子題前會先清掉）
- `deleteQuestionsByHomeworkId`：刪除某作業底下所有子題
- `deleteHomeworkById`：刪除作業本體
- `createQuestions`：寫入子題
- `getHomeworksByCourse`：查課程作業列表
- `getHomeworkById`：查單一作業
- `getQuestionsByHomework`：查某作業的子題
- `getStudentSubmission`：查學生自己的繳交內容（⚠️ 不含 `ai_estimated_*` 欄位，見 [homework-ai 已知問題](homework-ai.md)）
- `getHomeworkStats`：統計繳交/批改人數
- `upsertSubmission`：新增或覆寫繳交內容
- `markSubmissionUnsubmitted`：標記收回繳交
- `deleteSubmission`：刪除繳交紀錄
- `getSubmissionsList`：查某作業的繳交清單
- `getSubmissionDetail`：查單筆繳交詳情
- `updateGrade`：寫入批改分數/評語
- `getSubmissionHistoryLogs`：查歷程紀錄

### Utils

`utils/dbHistoryLogger.js` 的 `appendSubmissionHistory` 被 `homeworkService.js` 多處呼叫，寫入 `homework_submission_histories`。

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/courses/:courseId/homeworks` | `getCourseHomeworks` | JWT |
| POST | `/api/courses/:courseId/homeworks` | `publishHomework` | JWT + (teacher, ta) |
| GET | `/api/homeworks/:hwId` | `getHomeworkDetail` | JWT |
| PUT | `/api/homeworks/:hwId` | `updateHomework` | JWT + (teacher, ta) |
| DELETE | `/api/homeworks/:hwId` | `deleteHomework` | JWT + (teacher, ta) |
| POST | `/api/homeworks/:hwId/submissions` | `submitHomework` | JWT + (student, ta) |
| GET | `/api/homeworks/:hwId/submissions/me` | `getMySubmission` | JWT + (student, ta) |
| DELETE | `/api/homeworks/:hwId/submissions/me` | `unsubmitHomework` | JWT + (student, ta) |
| GET | `/api/homeworks/:hwId/submissions` | `getSubmissionsList` | JWT + (teacher, ta) |
| GET | `/api/submissions/:submissionId` | `getSubmissionDetail` | JWT + (teacher, ta) |
| POST | `/api/submissions/:submissionId/grade` | `gradeSubmission` | JWT + (teacher, ta) |
| GET | `/api/submissions/:submissionId/history` | `getSubmissionHistory` | JWT + (teacher, ta) |

## 資料庫

`homeworks`、`homework_questions`、`homework_submissions`、`homework_submission_histories`，見 [database.md 3.4](../database.md#34-作業)。`homeworks.course_id` 存 `course_code`；`homework_submissions.student_id` 存 `accounts.username`；兩者皆無 DB 層 FK。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| Medium | 沒有資源歸屬檢查：任何教師/助教都能查看、批改其他課程的繳交 |
| Low | `homework_questions.has_attachment`/`file_name`/`file_path` 建立作業時固定寫 `0`/`NULL`，是死欄位（前端 `HomeworkStudent.vue` 的 `legacyQuestionAttachment` 因此永遠不會觸發） |
| Low | 刪除作業不會刪除學生上傳的實體檔案（見 [database.md 第 4 節](../database.md#刪除連動)） |
