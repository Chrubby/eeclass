# 模組：學生名冊（Student List）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [group](group.md) ・ [notification](notification.md) ・ [shared](shared.md)
>
> 核對日期：2026-10-12。跟 [course](course.md) 模組的差別：course 模組是「學生自己加選課」，這個模組是「教師/助教管理某課程已經選上的學生名單」。

## 這個模組做什麼

教師/助教查看課程學生名冊、手動把某個學生加入課程或修改其身分（例如改成 `ta`）、上傳 Excel 名冊整批同步（名冊裡有的學生自動加選、名冊裡沒有但原本選課的學生自動退選）。

## 前端程式碼

- **`frontend/src/views/course/StudentList.vue`**：教師/助教專用頁面
  - `loadUser`：載入目前使用者資訊（決定能不能看這頁），呼叫 `GET /api/auth/me`
  - `fetchStudents`：載入學生名冊，呼叫 `GET /api/courses/:courseCode/studentlist`
  - `handleFileChange`：選擇 Excel 檔後送出整批同步，呼叫 `POST /api/courses/:courseCode/studentlist`（multipart）
  - `handleManualSubmit`：手動新增/修改單一學生身分，呼叫 `POST /api/courses/:courseCode/studentlist/update`
  - `triggerFileInput`：點擊按鈕觸發隱藏的檔案選取欄位
  - `formatRole`：把角色代碼（`student`/`ta`）轉成顯示文字

## 後端程式碼

### Route — 掛在 `backend/src/routes/courseRoutes.js`（`/api/courses/:courseId/studentlist`）

- `GET /`（staff）
- `POST /`（staff，`upload.single('file')`，整批同步 Excel）
- `POST /update`（staff，手動新增/修改單一學生）

### Controller — `backend/src/controllers/StudentListController.js`

- `getCourseStudents`：取得課程學生名冊
- `updateStudentRole`：手動新增學生到課程，或修改其身分
- `syncStudents`：接收上傳的 Excel，交給 Service 整批同步，處理完刪除暫存檔

### Service — `backend/src/services/StudentListService.js`

| 函式 | 做什麼 |
| --- | --- |
| `getCourseStudentList` | 依課程代碼查已選課學生列表（呼叫 [course](course.md) 模組的 `CourseModel`） |
| `updateOrAddStudent` | 該學生若還沒選這門課就加選，已經選了就更新身分 |
| `syncStudentsFromExcel` | 解析上傳的 Excel（用 `xlsx` 套件），比對「名冊裡的學生」跟「目前已選課的學生」，名冊有但未選課的自動加選、已選課但名冊沒有的自動退選；整個同步在同一個資料庫交易內完成，中途失敗全部回滾 |

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/courses/:courseId/studentlist` | `getCourseStudents` | JWT + (teacher, ta) |
| POST | `/api/courses/:courseId/studentlist` | `syncStudents` | JWT + (teacher, ta) |
| POST | `/api/courses/:courseId/studentlist/update` | `updateStudentRole` | JWT + (teacher, ta) |

## 資料庫

沒有獨立資料表，實際操作的是 [course 模組](course.md)的 `enrollments`、`students` 表（見 [database.md 3.2](../database.md#32-課程--選課)）。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| Medium | `syncStudentsFromExcel` 逐行呼叫 `AuthModel.getStudentById` 驗證學號存不存在，Excel 筆數多時是逐筆查詢（N+1），還沒有批次查詢最佳化 |
| Low | Excel 格式（欄位名稱、從第幾行開始讀）目前寫死在 `syncStudentsFromExcel`（`row["帳號"]`、`range: 1`），沒有對應的範本下載功能，使用者得自己猜格式 |
