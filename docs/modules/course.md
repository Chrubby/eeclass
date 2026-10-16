# 模組：課程（Course）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [group](group.md) ・ [student-list](student-list.md) ・ [notification](notification.md) ・ [shared](shared.md)
>
> 核對日期：2026-10-17。

## 這個模組做什麼

搜尋課程、加選課、取得「我的課程」列表（每門課帶「我在這門課的身分」`my_role`）、建立課程（含建課時自動建立預設 AI Prompt；**只有管理員和教師能建課**）、管理員的「所有課程」總覽、查詢課程的教師/助教聯絡資訊（頁首側欄用）。不包含公告/教材/討論/作業/AI 測驗/小組/學生名冊本身（那些是各自獨立的模組，只是路由都掛在 `/api/courses/...` 底下）。

## 前端程式碼

- **`frontend/src/views/Home.vue`**：登入後首頁
  - `loadUser`：載入目前使用者資訊（決定要顯示哪些功能）
  - `fetchMyCourses`：載入「我的課程」列表，呼叫 `GET /api/courses/user`
  - `searchCourse`：依課號/課名搜尋課程，呼叫 `GET /api/courses`
  - `addCourse`：加選課，呼叫 `POST /api/courses/enroll`
  - `createCourse`：教師建立課程，呼叫 `POST /api/courses`
  - 課程卡片上，`my_role === 'ta'` 的課程會在課名旁顯示「助教」徽章
  - `fetchLatestAnnouncements`：呼叫 announcement 模組的 API（`GET /api/courses/:code/announcements`），彙整成首頁的「最新公告」，邏輯算 course 模組但資料屬於 [announcement](announcement.md)
- **`frontend/src/views/admin/CourseList.vue`**：管理員專用的「所有課程」頁（路由 `/admin/courses`，`meta.requiresAdmin`）
  - `loadCourses`：載入所有課程與修課／退選人數、授課教師，呼叫 `GET /api/courses/all`
  - `createCourse`：管理員建課，可同時指定授課教師（下拉選單來自 `GET /api/courses/teachers`），也可以先不指定、之後由[學生名冊](student-list.md)匯入時綁定；每列有連到該課「學生名冊」的連結
- **`frontend/src/views/Course.vue`**：課程內頁外框（麵包屑 + `router-view`），本身不呼叫 API，實際內容由巢狀路由對應的各模組頁面渲染。麵包屑與頁首橫幅現在顯示**課程名稱**（原本是課程代碼，代碼只在儀表板卡片、管理員課程列表與表單等需要識別課程的地方顯示）；管理員的麵包屑第一層是「所有課程」。`router-view` 以 `:key="$route.params.id"` 綁定課程，直接從一門課跳到另一門課（例如點通知連結）時整頁重建，課程資料與「我在該課的身分」才會重新載入，避免上一門課的助教權限殘留

## 後端程式碼

### Route — `backend/src/routes/courseRoutes.js`（掛載於 `/api/courses`）

這支檔案同時是 announcement/discussion/homework/material/course-ai/aiquiz 六個模組的掛載點，這裡只列**課程本身**的路由：

- `GET /`（依 `code` 或 `name` 搜尋）
- `GET /search`：跟 `GET /` 是同一個 Controller 方法，只是另外多開一個路徑（見已知問題）
- `POST /enroll`（`studentSide` = student/ta）
- `GET /user`
- `GET /all`（admin）：所有課程與人數
- `GET /teachers`（admin）：可指定的授課教師清單
- `POST /`（admin、teacher）
- `GET /:courseCode/contacts`：查詢該課程的教師/助教聯絡資訊

`router.param("courseCode"/"courseId", courseRole.byCode)` 讓底下所有 `/:courseCode/...` 路由都能依課程判斷助教身分，見 [auth 模組](auth.md#課程層級助教--backendsrcmiddlewarescourserolejs)。

其餘路由是掛載其他模組的地方，見各自的模組文件（[announcement](announcement.md)、[discussion](discussion.md)、[homework](homework.md)、[material](material.md)、[course-ai](course-ai.md)、[aiquiz](aiquiz.md)）。

### Controller — `backend/src/controllers/courseController.js`

- `search`：依課號或課名搜尋課程（呼叫 `searchCourse`）
- `getContacts`：查該課程的教師/助教聯絡資訊（直接呼叫 `CourseModel.listContactsByCourseCode`，沒有經過 Service 層）
- `enroll`：學生加選課（呼叫 `enrollCourse`）；被退選者重新自行加選會回 400
- `getUserCourses`：取得「我的課程」列表（呼叫 `getUserCourses`）
- `getAllCourses`、`getAllTeachers`：管理員總覽用
- `createCourse`：建立課程（呼叫 `createCourse`）；教師建的課程自動綁定給自己，管理員可用 body 的 `teacher_username` 指定授課教師或不指定

### Service — `backend/src/services/courseService.js`

| 函式 | 備註 |
| --- | --- |
| `searchCourse` | |
| `enrollCourse` | transaction；用 `getEnrollmentRole` 檢查：已被退選（`dropped`）回「你已被退選此課程，如需重新加入請聯絡授課老師」，避免學生用課程代碼自行加回去而推翻教師的名冊 |
| `getUserCourses` | student 查 `enrollments`（已退選不顯示，每筆帶 `my_role`），teacher 查 `teacher_courses` |
| `getAllCourses` | 管理員用：所有課程 + `active_count`/`withdrawn_count` + 授課教師 |
| `getAllTeachers` | 管理員建課時的授課教師下拉選單 |
| `createCourse` | transaction；`teacher_id` 可為空（管理員建課不指定老師），有值才綁定授課教師；內含寫死的預設 AI Prompt 文字，並呼叫 `CourseModel.createDefaultAiPrompt` |

### Model — `backend/src/models/courseModel.js`

- `findCourseByCode`：依課號查課程
- `findCourseByName`：依課名模糊搜尋課程
- `getCourseTeachers`：查某課程的授課教師
- `listContactsByCourseCode`：查該課程的教師/助教姓名與 email（頁首側欄用；助教改依 `enrollments.role = 'ta'` 判斷）
- `getEnrollmentRole`：查學生在某課的身分（含 `dropped`），沒選過回 null（取代原本的 `checkEnrollment`）
- `enrollStudent`：寫入 `enrollments`
- `getStudentCourses`：查學生已選的課程列表（不含已退選，每筆帶 `my_role`）
- `getCourseEnrollmentsForUpdate`：名冊同步時鎖住該課選課紀錄（`FOR UPDATE`）
- `isTeacherBound`：查教師是否已綁定某課
- `getAllTeachers`、`getAllCoursesWithCounts`：管理員總覽用
- `getTeacherCourses`：查教師任教的課程列表
- `getCourseStudents`：查某課程已選課的學生（[student-list](student-list.md) 用）
- `updateStudentRole`：修改學生在某課程的身分；同時維護 `withdrawn_at`（設為 `dropped` 時記錄退選時間，其他身分清空）
- `dropCourse`：把學生標記為退選（呼叫 `updateStudentRole(..., 'dropped')`，不刪資料；[student-list](student-list.md) 的 Excel 同步用）
- `createCourse`：寫入 `courses`
- `bindTeacherToCourse`：寫入 `teacher_courses`，把課程綁定給建立者
- `createDefaultAiPrompt`：建課時順便寫入一筆預設 AI Prompt

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/courses` | `search` | JWT |
| GET | `/api/courses/search` | `search` | JWT |
| POST | `/api/courses/enroll` | `enroll` | JWT + (student, ta) |
| GET | `/api/courses/all` | `getAllCourses` | JWT + (admin) |
| GET | `/api/courses/teachers` | `getAllTeachers` | JWT + (admin) |
| GET | `/api/courses/user` | `getUserCourses` | JWT |
| POST | `/api/courses` | `createCourse` | JWT + (admin, teacher) |
| GET | `/api/courses/:courseCode/contacts` | `getContacts` | JWT |

## 資料庫

`courses`、`teacher_courses`、`enrollments`（含 `role`、`withdrawn_at`）三張表，見 [database.md 3.2](../database.md#32-課程--選課)。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| Medium | `teacher_courses`、`enrollments` 沒有 DB 層 FOREIGN KEY，孤兒資料不會被擋下（見 [database.md 第 7 節](../database.md#7-已知問題)） |
| Low | `GET /api/courses` 跟 `GET /api/courses/search` 是同一個 Controller 方法重複掛兩條路徑，`frontend/src/App.vue` 現在用的是 `/search` 這條，但原本的 `/` 沒有拿掉，兩條路徑並存容易讓人搞不清楚該用哪個 |
| Low | `getContacts` 直接 `import { CourseModel }` 呼叫，略過 Service 層，跟其他模組「Controller 不碰 Model」的慣例不一致 |
