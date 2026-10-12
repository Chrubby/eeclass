# 模組：教材（Material）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [shared](shared.md)
>
> 核對日期：2026-09-29。

## 這個模組做什麼

課程教材的上傳、列表、下載、刪除（教師/助教管理，所有人可下載）。

## 前端程式碼

- **`frontend/src/views/course/Material.vue`**：教材列表頁，含拖曳上傳
  - `onDownload`：點擊下載，呼叫 `utils/files.js` 的 `downloadFile`
  - `loadMaterials`：載入教材列表，呼叫 `GET .../materials`
  - `onPickFile`、`onDrop`：選檔/拖曳放檔後，把檔案存進待上傳的狀態
  - `uploadMaterial`：送出上傳，呼叫 `POST .../materials`
  - `deleteMaterial`：刪除教材，呼叫 `DELETE .../materials/:id`
- **`frontend/src/utils/files.js`**：下載邏輯共用工具，見 [shared.md](shared.md)
  - `downloadFile`、`getFileUrl`：分別是「帶 JWT 下載檔案」與「組出檔案的完整 URL」

## 後端程式碼

### Route

| 檔案 | 內容 |
| --- | --- |
| `routes/courseRoutes.js` | `GET /:courseId/materials`、`POST /:courseId/materials`（staff，`upload.single('file')`）、`DELETE /:courseId/materials/:materialId`（staff） |

### Controller — `backend/src/controllers/materialController.js`

- `getMaterials`：取得課程教材列表
- `uploadMaterial`：上傳教材檔案
- `deleteMaterial`：刪除教材（含刪除實體檔）

### Service — `backend/src/services/materialService.js`

| 函式 | 備註 |
| --- | --- |
| `getCourseMaterials` | |
| `uploadMaterial` | 處理 multer 原始檔名編碼（latin1→utf8） |
| `deleteMaterial` | 會檢查教材是否屬於該課程，並刪除實體檔（`fs.unlink`） |

### Model — `backend/src/models/materialModel.js`

- `getByCourseId`：查某課程的教材列表
- `create`：寫入 `course_materials`
- `getById`：依 id 查單筆教材（刪除前先確認歸屬哪個課程）
- `delete`：刪除資料列

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/courses/:courseId/materials` | `getMaterials` | JWT |
| POST | `/api/courses/:courseId/materials` | `uploadMaterial` | JWT + (teacher, ta) |
| DELETE | `/api/courses/:courseId/materials/:materialId` | `deleteMaterial` | JWT + (teacher, ta) |

## 資料庫

`course_materials`（`course_id` 欄位存的是 `course_code`，不是 `courses.id`，見 [database.md 3.7](../database.md#37-教材)）。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| Low | `course_materials` 沒有 DB 層 FK |
| Low | 下載請求會經過 `/uploads` 靜態路徑，實際上不需要登入即可存取（見 [shared.md](shared.md)） |
