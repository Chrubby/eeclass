# 模組：公告（Announcement）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [shared](shared.md)
>
> 核對日期：2026-09-29。

## 這個模組做什麼

課程公告的列表（含已讀狀態）、標記已讀、新增公告（教師/助教）。

## 前端程式碼

- **`frontend/src/views/course/Announcement.vue`**：本模組唯一頁面，同時也是 [ChatBot](course-ai.md) 目前唯一掛載的頁面
  - `loadUser`：載入目前使用者資訊（決定角色），呼叫 `GET /api/auth/me`
  - `fetchAnnouncements`：載入公告列表，呼叫 `GET /api/courses/:code/announcements`
  - `openAnnouncement`：點開某則公告的詳細內容（順便觸發標記已讀）
  - `markAsRead`：標記一則公告已讀，呼叫 `POST /api/announcements/:id/read`
  - `createAnnouncement`：教師/助教新增公告，呼叫 `POST /api/courses/:code/announcements`

## 後端程式碼

### Route

| 檔案 | 內容 |
| --- | --- |
| `routes/courseRoutes.js` | `GET /:courseCode/announcements`、`POST /:courseCode/announcements`（staff） |
| `routes/announcementRoutes.js` | `POST /:id/read`（student, ta），掛載於 `/api/announcements` |

### Controller — `backend/src/controllers/announcementController.js`

- `getAnnouncements`：取得公告列表（依角色決定是否附帶已讀狀態）
- `markAsRead`：標記一則公告已讀
- `create`：教師/助教新增公告

### Service — `backend/src/services/announcementService.js`

| 函式 | 備註 |
| --- | --- |
| `getAnnouncements` | 依角色決定回傳「含已讀狀態」或「全部已讀」 |
| `markAsRead` | |
| `createAnnouncement` | transaction；助教發公告時 `teacher_id` 用該課第一位教師 |

### Model — `backend/src/models/announcementModel.js`

- `getForStudent`：查某學生對某課程的公告（含每則的已讀狀態）
- `getForCourse`：查某課程的全部公告（教師視角，不分已讀）
- `markAsRead`：寫入 `announcement_reads`
- `create`：寫入 `announcements`

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/courses/:courseCode/announcements` | `getAnnouncements` | JWT |
| POST | `/api/courses/:courseCode/announcements` | `create` | JWT + (teacher, ta) |
| POST | `/api/announcements/:id/read` | `markAsRead` | JWT + (student, ta) |

## 資料庫

`announcements`、`announcement_reads`，見 [database.md 3.3](../database.md#33-公告)。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| Medium | `announcements`、`announcement_reads` 沒有 DB 層 FK（見 [database.md 第 7 節](../database.md#7-已知問題)） |
