# 模組：課程（Course）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [group](group.md) ・ [student-list](student-list.md) ・ [notification](notification.md) ・ [shared](shared.md)
>
> 核對日期：2026-10-12。

## 這個模組做什麼

搜尋課程、加選課、取得「我的課程」列表、建立課程（含建課時自動建立預設 AI Prompt）、查詢課程的教師/助教聯絡資訊（頁首側欄用）。不包含公告/教材/討論/作業/AI 測驗/小組/學生名冊本身（那些是各自獨立的模組，只是路由都掛在 `/api/courses/...` 底下）。

## 前端程式碼

- **`frontend/src/views/Home.vue`**：登入後首頁
  - `loadUser`：載入目前使用者資訊（決定要顯示哪些功能）
  - `fetchMyCourses`：載入「我的課程」列表，呼叫 `GET /api/courses/user`
  - `searchCourse`：依課號/課名搜尋課程，呼叫 `GET /api/courses`
  - `addCourse`：加選課，呼叫 `POST /api/courses/enroll`
  - `createCourse`：教師/助教建立課程，呼叫 `POST /api/courses`
  - `fetchLatestAnnouncements`：呼叫 announcement 模組的 API（`GET /api/courses/:code/announcements`），彙整成首頁的「最新公告」，邏輯算 course 模組但資料屬於 [announcement](announcement.md)
- **`frontend/src/views/Course.vue`**：課程內頁外框（麵包屑 + `router-view`），本身不呼叫 API，實際內容由巢狀路由對應的各模組頁面渲染

## 後端程式碼

### Route — `backend/src/routes/courseRoutes.js`（掛載於 `/api/courses`）

這支檔案同時是 announcement/discussion/homework/material/course-ai/aiquiz 六個模組的掛載點，這裡只列**課程本身**的路由：

- `GET /`（依 `code` 或 `name` 搜尋）
- `GET /search`：跟 `GET /` 是同一個 Controller 方法，只是另外多開一個路徑（見已知問題）
- `POST /enroll`（`studentSide` = student/ta）
- `GET /user`
- `POST /`（`staff` = teacher/ta）
- `GET /:courseCode/contacts`：查詢該課程的教師/助教聯絡資訊

其餘路由是掛載其他模組的地方，見各自的模組文件（[announcement](announcement.md)、[discussion](discussion.md)、[homework](homework.md)、[material](material.md)、[course-ai](course-ai.md)、[aiquiz](aiquiz.md)）。

### Controller — `backend/src/controllers/courseController.js`

- `search`：依課號或課名搜尋課程（呼叫 `searchCourse`）
- `getContacts`：查該課程的教師/助教聯絡資訊（直接呼叫 `CourseModel.listContactsByCourseCode`，沒有經過 Service 層）
- `enroll`：學生/助教加選課（呼叫 `enrollCourse`）
- `getUserCourses`：取得「我的課程」列表（呼叫 `getUserCourses`）
- `createCourse`：教師/助教建立課程（呼叫 `createCourse`）

### Service — `backend/src/services/courseService.js`

| 函式 | 備註 |
| --- | --- |
| `searchCourse` | |
| `enrollCourse` | transaction |
| `getUserCourses` | student/ta 查 `enrollments`，teacher 查 `teacher_courses` |
| `createCourse` | transaction；內含寫死的預設 AI Prompt 文字，並呼叫 `CourseModel.createDefaultAiPrompt` |

### Model — `backend/src/models/courseModel.js`

- `findCourseByCode`：依課號查課程
- `findCourseByName`：依課名模糊搜尋課程
- `getCourseTeachers`：查某課程的授課教師
- `listContactsByCourseCode`：查該課程的教師/助教姓名與 email（頁首側欄用）
- `checkEnrollment`：檢查學生是否已選該課（避免重複加選）
- `enrollStudent`：寫入 `enrollments`
- `getStudentCourses`：查學生/助教已選的課程列表
- `getTeacherCourses`：查教師任教的課程列表
- `getCourseStudents`：查某課程已選課的學生（[student-list](student-list.md) 用）
- `updateStudentRole`：修改學生在某課程的身分
- `dropCourse`：把學生從課程退選（[student-list](student-list.md) 的 Excel 同步用）
- `createCourse`：寫入 `courses`
- `bindTeacherToCourse`：寫入 `teacher_courses`，把課程綁定給建立者
- `createDefaultAiPrompt`：建課時順便寫入一筆預設 AI Prompt

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/courses` | `search` | JWT |
| GET | `/api/courses/search` | `search` | JWT |
| POST | `/api/courses/enroll` | `enroll` | JWT + (student, ta) |
| GET | `/api/courses/user` | `getUserCourses` | JWT |
| POST | `/api/courses` | `createCourse` | JWT + (teacher, ta)⚠️ ta 實際會失敗，見已知問題 |
| GET | `/api/courses/:courseCode/contacts` | `getContacts` | JWT |

## 資料庫

`courses`、`teacher_courses`、`enrollments` 三張表，見 [database.md 3.2](../database.md#32-課程--選課)。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| Medium | `POST /api/courses` 雖允許 `ta` 角色通過 `requireRole`，但 `courseService.js` 的 `createCourse` 用 `getTeacherById` 查建立者，助教不在 `teachers` 表，會回 400「找不到該老師」——權限設定跟實際行為不一致 |
| Medium | `teacher_courses`、`enrollments` 沒有 DB 層 FOREIGN KEY，孤兒資料不會被擋下（見 [database.md 第 7 節](../database.md#7-已知問題)） |
| Low | `GET /api/courses` 跟 `GET /api/courses/search` 是同一個 Controller 方法重複掛兩條路徑，`frontend/src/App.vue` 現在用的是 `/search` 這條，但原本的 `/` 沒有拿掉，兩條路徑並存容易讓人搞不清楚該用哪個 |
| Low | `getContacts` 直接 `import { CourseModel }` 呼叫，略過 Service 層，跟其他模組「Controller 不碰 Model」的慣例不一致 |
