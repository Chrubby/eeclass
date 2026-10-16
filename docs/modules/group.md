# 模組：小組（Group）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [student-list](student-list.md) ・ [notification](notification.md) ・ [shared](shared.md)
>
> 核對日期：2026-10-12。

## 這個模組做什麼

課程內的分組功能：教師可以一次批次建立 N 組空組別，或開放學生自行建立小組；學生可以加入小組（開放招募時直接加入，否則要送出申請給組長核准）、退出小組、組長可以轉移組長身分、開關自己小組的招募狀態與招募訊息；另外提供「小組作業」列表（依自己所在小組彙整作業繳交狀況）。

## 前端程式碼

- **`frontend/src/views/course/Group.vue`**：小組專區唯一頁面，教師/學生看到的操作不同（依角色顯示批次建組、開關學生自建設定 vs. 加入/退出/申請）
  - `loadGroups`：載入小組列表（含每組成員、招募狀態），呼叫 `GET /api/courses/:courseId/groups`
  - `loadGroupHomeworks`：載入「小組作業」彙整資料，呼叫 `GET /api/courses/:courseId/groups/homeworks`
  - `loadStudentCreationSetting`：載入「是否開放學生自建小組」設定，呼叫 `GET /api/courses/:courseId/groups/student-creation`
  - `loadPageData`：頁面進入時依序呼叫上面幾個載入函式
  - `saveRecruitment`：組長開關自己小組的招募狀態/編輯招募訊息，呼叫 `PUT .../groups/:groupId/recruitment`
  - `submitApplication`：學生對某小組送出加入申請，呼叫 `POST .../groups/:groupId/applications`
  - `approveApplication`：組長同意某筆加入申請，呼叫 `POST .../groups/:groupId/applications/:applicationId/approve`
  - `transferLeadership`：組長把組長身分轉移給其他組員，呼叫 `PUT .../groups/:groupId/leader`
  - `joinGroup`：小組開放招募時，學生直接加入（不用走申請），呼叫 `POST .../groups/:groupId/members/me`
  - `leaveGroup`：退出目前所在小組，呼叫 `DELETE .../groups/:groupId/members/me`
  - `createGroup`：學生自建小組（需設定允許），呼叫 `POST .../groups`
  - `createGroups`：教師批次建立 N 組空組別，呼叫 `POST .../groups/batch`
  - `toggleStudentCreation`：教師開關「是否允許學生自建小組」，呼叫 `PUT .../groups/student-creation`
  - `deleteGroup`：教師刪除小組，呼叫 `DELETE .../groups/:groupId`
  - `memberNames`：把小組的成員資料組成顯示用的名字字串
  - `markRecruitmentChanged`：標記某組的招募設定表單有未儲存的修改（UI 用）

## 後端程式碼

### Route — `backend/src/routes/groupRoutes.js`（`mergeParams: true`，掛進 `courseRoutes.js` 的 `/:courseCode/groups`）

- `GET /`（列表）、`GET /homeworks`（小組作業彙整）、`GET /student-creation`（查詢設定）
- `PUT /student-creation`（staff，開關學生自建）
- `POST /`（student/teacher/ta，建立一組）、`POST /batch`（staff，批次建立）
- `PUT /:groupId/recruitment`（student，組長開關招募）
- `PUT /:groupId/leader`（student，轉移組長）
- `GET /:groupId/applications`、`POST /:groupId/applications`、`POST /:groupId/applications/:applicationId/approve`（student）
- `DELETE /:groupId`（staff，刪除小組）
- `POST /:groupId/members/me`（student/ta，加入）、`DELETE /:groupId/members/me`（student/ta，退出）

### Controller — `backend/src/controllers/groupController.js`

- `getGroups`：取得課程小組列表
- `getStudentCreationSetting`、`setStudentCreationSetting`：讀寫「是否允許學生自建小組」
- `joinGroup`：直接加入（開放招募時）
- `updateRecruitment`：組長開關/編輯招募設定
- `transferLeadership`：轉移組長
- `getApplications`：組長查看待審加入申請
- `submitApplication`：送出加入申請
- `approveApplication`：組長核准申請
- `leaveGroup`：退出小組
- `getGroupHomeworks`：取得小組作業彙整
- `createGroup`：建立一組（學生自建或教師單組建立）
- `createGroups`：批次建立 N 組
- `deleteGroup`：刪除小組
- 檔案開頭的 `handleError`：統一把 Service 丟出的各種中文錯誤訊息（例如「只有組長能操作」「此小組目前未開放申請」）對應成對的 HTTP 狀態碼（400/403/404/409）

### Service — `backend/src/services/groupService.js`

| 函式 | 做什麼 |
| --- | --- |
| `getGroups` | 查某課程的小組列表 |
| `getStudentCreationSetting`/`setStudentCreationSetting` | 讀寫課程層級的「開放學生自建小組」開關 |
| `joinGroup` | 檢查小組開放招募、使用者尚未在其他小組，才允許直接加入 |
| `leaveGroup` | 退出小組，若退出的是組長需先轉移或小組變空 |
| `getGroupHomeworks` | 依使用者所在小組，彙整相關作業的繳交狀況 |
| `createGroup` | 檢查課程是否開放學生自建、名稱是否重複 |
| `createGroups` | 教師批次建立 N 組空組別 |
| `updateRecruitment` | 檢查操作者是否為組長，才能開關招募狀態/編輯招募訊息 |
| `transferLeadership` | 檢查操作者是組長、新組長是此組成員，才能轉移 |
| `getApplications` | 組長查看自己小組的待審申請 |
| `submitApplication` | 檢查學生目前沒有在其他小組、沒有重複申請，才能送出 |
| `approveApplication` | 組長核准申請；若申請人已加入其他小組會丟 `APPLICANT_IN_OTHER_GROUP` |
| `deleteGroup` | 教師刪除小組 |
| `resolveCourseId`（私有） | 把課程代碼轉成 `courses.id`，課程不存在就丟錯 |

### Model — `backend/src/models/groupModel.js`

處理小組、成員、招募設定、加入申請四張表的 SQL，被上面的 Service 呼叫（細節見程式碼，函式對應 Service 要做的事，例如 `getCourseIdByCode`、`createGroup`、`leaveGroup`、`getStudentCreationEnabled` 等）。

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/courses/:courseCode/groups` | `getGroups` | JWT |
| GET | `/api/courses/:courseCode/groups/homeworks` | `getGroupHomeworks` | JWT |
| GET | `/api/courses/:courseCode/groups/student-creation` | `getStudentCreationSetting` | JWT |
| PUT | `/api/courses/:courseCode/groups/student-creation` | `setStudentCreationSetting` | JWT + (teacher, ta) |
| POST | `/api/courses/:courseCode/groups` | `createGroup` | JWT + (student, teacher, ta) |
| POST | `/api/courses/:courseCode/groups/batch` | `createGroups` | JWT + (teacher, ta) |
| PUT | `/api/courses/:courseCode/groups/:groupId/recruitment` | `updateRecruitment` | JWT + (student) |
| PUT | `/api/courses/:courseCode/groups/:groupId/leader` | `transferLeadership` | JWT + (student) |
| GET | `/api/courses/:courseCode/groups/:groupId/applications` | `getApplications` | JWT + (student) |
| POST | `/api/courses/:courseCode/groups/:groupId/applications` | `submitApplication` | JWT + (student) |
| POST | `/api/courses/:courseCode/groups/:groupId/applications/:applicationId/approve` | `approveApplication` | JWT + (student) |
| DELETE | `/api/courses/:courseCode/groups/:groupId` | `deleteGroup` | JWT + (teacher, ta) |
| POST | `/api/courses/:courseCode/groups/:groupId/members/me` | `joinGroup` | JWT + (student, ta) |
| DELETE | `/api/courses/:courseCode/groups/:groupId/members/me` | `leaveGroup` | JWT + (student, ta) |

## 資料庫

新增的小組相關資料表見 [database.md](../database.md)（`groups`、小組成員、招募設定、加入申請——實際表名以 `ensureSchema.js`/`groupModel.js` 為準，`database.md` 尚待補上這幾張表的章節）。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| Medium | `database.md` 還沒有小組相關資料表的章節，目前只能從 `groupModel.js` 反推欄位 |
| Low | 本文件是跟著程式碼讀出來的初版說明，還沒有像其他模組一樣跑過完整的「已知問題」排查（例如有沒有資源歸屬檢查、鍵值是否一致） |
