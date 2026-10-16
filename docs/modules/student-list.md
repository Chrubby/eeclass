# 模組：學生名冊（Student List）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [group](group.md) ・ [notification](notification.md) ・ [shared](shared.md)
>
> 核對日期：2026-10-17。跟 [course](course.md) 模組的差別：course 模組是「學生自己加選課」，這個模組是「管理員/教師/助教管理某課程的修課名單」。

## 這個模組做什麼

管理員、授課教師、助教查看課程學生名冊；手動把某個學生加入課程或修改其身分；上傳 Excel 名單整批同步（名單上有的人加選或恢復修課，名冊上有但名單沒有的學生改為「退選」，**資料一律保留**）。**課程助教也在這裡指定**：授課教師或管理員在名冊勾選「助教」，該學生在這門課就變成助教（見 [auth 模組的課程層級助教](auth.md#課程層級助教--backendsrcmiddlewarescourserolejs)）。

名冊裡每個人的課程身分（`enrollments.role`）有五種：

| 值 | 意義 |
| --- | --- |
| `student` | 一般學生（預設） |
| `ta` | 這門課的助教（只有授課教師/管理員能指定或取消） |
| `external` | 校外加選 |
| `auditor` | 旁聽 |
| `dropped` | 已退選（資料保留，`withdrawn_at` 記錄退選時間，重新加入時清空） |

## 前端程式碼

- **`frontend/src/views/course/StudentList.vue`**：名冊頁面（路由 `studentlist`，`meta.allowRoles: ['admin','teacher','ta']`）
  - `loadUser`：載入目前使用者資訊（決定能不能管理），呼叫 `GET /api/auth/me`
  - `canManage`、`canAssignTa`（computed）：前者為 admin/teacher/ta；後者只有 admin/teacher，決定要不要顯示「助教」勾選框
  - `fetchStudents`：載入名冊，呼叫 `GET /api/courses/:courseCode/studentlist`
  - `handleFileChange`：選擇 `.xlsx` 後送出整批同步，呼叫 `POST /api/courses/:courseCode/studentlist`（multipart）；結果存入 `syncResult`，頁面顯示新增／恢復／變更身分／退選／略過的逐筆明細；成功後呼叫 `refreshCourseInfo`（由 `App.vue` 提供）重新載入側欄的教師/助教聯絡資訊
  - `toggleTa`：勾選／取消某位學生的助教，呼叫 `POST /api/courses/:courseCode/studentlist/update`（`role` 為 `ta` 或 `student`）
  - `handleManualSubmit`：手動新增/修改單一學生身分，呼叫 `POST /api/courses/:courseCode/studentlist/update`
  - `triggerFileInput`：點擊按鈕觸發隱藏的檔案選取欄位
  - `formatRole`、`formatDate`：把身分代碼／退選時間轉成顯示文字
- 管理員在側欄只看得到「學生名冊」（見 [shared](shared.md)），其他課程頁面都會被路由守衛導回名冊頁。

## 後端程式碼

### Route — 掛在 `backend/src/routes/courseRoutes.js`（`/api/courses/:courseId/studentlist`）

權限用 `rosterManagers = requireRole("admin","teacher","ta")`，`:courseId` 帶的是課程代碼。

- `GET /`
- `POST /`（`uploadSpreadsheet.single('file')`，整批同步 Excel；檔案只存記憶體，不落地）
- `POST /update`（手動新增/修改單一學生）

### Controller — `backend/src/controllers/StudentListController.js`

- `getCourseStudents`：取得課程學生名冊；找不到課程回 404
- `updateStudentRole`：手動新增學生到課程，或修改其身分（`role` 預設 `student`，並傳入 `req.user.role` 做助教權限檢查）；找不到課程 404、無權指定助教 403、其他錯誤 400
- `syncStudents`：接收上傳的 Excel（`req.file.buffer`），呼叫 Service 整批同步；其餘錯誤回 400

### Service — `backend/src/services/StudentListService.js`

| 函式 | 做什麼 |
| --- | --- |
| `getCourseStudentList` | 依課程代碼查名冊（含已退選者，帶 `email`、`withdrawn_at`；排序：助教 → 學生 → 校外 → 旁聽 → 已退選） |
| `updateOrAddStudent` | 驗證身分在五種之內；用 `getStudentById` 找學生（找不到回「系統中找不到此學號的學生」）；**指定或取消助教（`role` 或目前身分是 `ta`）只有 admin/teacher 可以**，助教不能自己指定助教、也不能動其他助教；要設成 `dropped` 時學生必須已在名冊；最後呼叫 `CourseModel.enrollStudent`（沒選過就新增，選過就更新身分） |
| `syncStudentsFromExcel` | 見下方「同步規則」 |
| `enrollmentRoleFromNote`（私有） | 名單備註欄含「助教」→`ta`、「校外」→`external`、「旁聽」→`auditor`，沒寫就回傳 null（沿用原本身分） |
| `findRosterAccount`（私有） | 先用名單的帳號找；名單沒有帳號（只有信箱）時改用信箱找 |

**同步規則（`syncStudentsFromExcel`）**

1. 用 `parseRosterExcel` 解析名單（見下方 Utils）。
2. 逐列找帳號：**這裡不建立帳號**，找不到的列放進 `skipped`（原因「尚未建立帳號」）。`student` 帳號進入「要加入名冊」清單；`teacher` 帳號會被綁定為該課授課教師（`teacher_courses`，已綁定就略過，回報在 `teachersAdded`）；`admin` 帳號略過。
3. 名單裡一個可加入的學生都沒有時直接丟錯、不做任何變更（避免傳錯檔案時整班被改成退選）。
4. 在同一個 transaction 內（先 `getCourseEnrollmentsForUpdate` 鎖住該課的選課紀錄，避免兩人同時匯入互相覆蓋）：名單有、名冊沒有 → 新增（`added`）；名冊上是 `dropped` → 恢復（`reactivated`）；身分不同 → 更新（`updated`）；沒變 → 計入 `unchanged`；**名冊有、名單沒有 → 改為 `dropped`（`withdrawn`）**。任一步失敗全部回滾。
5. **助教上傳的限制**：名單備註「助教」不會被採用（照一般學生處理，並在 `skipped` 說明）；名冊上原本是助教的人也不會被退選。也就是同步不會改變誰是助教，除非由 admin/teacher 上傳。

回傳 `{ message, title, added, reactivated, updated, unchanged, withdrawn, teachersAdded, skipped }`。

### Utils — `backend/src/utils/rosterExcel.js`

`parseRosterExcel(buffer)`（用 `exceljs`；[auth](auth.md) 的帳號批次匯入也共用）：

- 在前 10 列找標題列，認得的欄名（不分大小寫）：姓名／name、帳號／學號／account／username／student id、信箱／電子郵件／電子信箱／email。標題列上方可以有合併的標題列（第一列第一格當 `title` 回傳）。至少要有「姓名」加上「帳號」或「信箱」其中一欄。
- 其他沒有被認得的欄位內容會串成**備註**，用來判斷身分：含「授課／老師／教師／教授」→ 教師；含「助教」→ 助教；否則學生。
- 沒填帳號的列用信箱當帳號；信箱轉小寫。
- 有問題的列不會讓整份失敗，而是進 `problems`：缺姓名、缺帳號與信箱、帳號超過 64 字元、與前面某列重複。
- 整份限制：只收 `.xlsx`（舊版 `.xls` 要先另存）、5MB、最多 2000 列資料列。

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/courses/:courseId/studentlist` | `getCourseStudents` | JWT + (admin, teacher, ta) |
| POST | `/api/courses/:courseId/studentlist` | `syncStudents` | JWT + (admin, teacher, ta) |
| POST | `/api/courses/:courseId/studentlist/update` | `updateStudentRole` | JWT + (admin, teacher, ta) |

## 資料庫

沒有獨立資料表，實際操作的是 [course 模組](course.md)的 `enrollments`（`role`、`withdrawn_at` 欄位）、`students`、`teacher_courses` 表（見 [database.md 3.2](../database.md#32-課程--選課)）。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| Medium | `syncStudentsFromExcel` 逐列呼叫 `findRosterAccount`／`getStudentById`，名單筆數多（上限 2000 列）時是逐筆查詢（N+1），還沒有批次查詢最佳化 |
| Medium | 同步以名單為準：名冊上有、名單沒有的學生會被退選。名單只列「新增的人」而不是完整名單的話會把其他人全部退選（雖有「名單沒有任何學生就不動作」的保護，但不涵蓋這種情況）。目前頁面沒有二次確認或預覽 |
| Low | 沒有提供名單樣板下載，使用者得自己照上面的欄名規則準備 Excel |
| Low | 管理員無法選擇「這份名單同時要建帳號」：名單上尚未建立帳號的人只會出現在 `skipped`，要先到[帳號管理](auth.md)匯入同一份名單 |
