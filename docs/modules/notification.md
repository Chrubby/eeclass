# 模組：通知與 Email（Notification）

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
> 其他模組：[auth](auth.md) ・ [course](course.md) ・ [announcement](announcement.md) ・ [material](material.md) ・ [discussion](discussion.md) ・ [homework](homework.md) ・ [homework-ai](homework-ai.md) ・ [course-ai](course-ai.md) ・ [aiquiz](aiquiz.md) ・ [group](group.md) ・ [student-list](student-list.md) ・ [shared](shared.md)
>
> 核對日期：2026-10-12。這個模組涵蓋「站內通知」（右上角小鈴鐺）跟「寄到 email 的通知信」兩件事——兩者資料來源相同，只是多一個寄信的動作。

## 這個模組做什麼

學生/助教/教師右上角的通知鈴鐺：列出未讀/已讀通知、標記單筆或全部已讀。通知目前由這幾個地方觸發：教師/助教發公告時通知修課學生（[announcement](announcement.md)）、作業截止時通知該課教師去批改（`homeworkDeadlineService.js` 背景排程，每 60 秒檢查一次）。有填信箱的使用者，同一則通知也會收到一封email。使用者必須在註冊時或個人資料頁填寫信箱，才能收到 email 通知（未填信箱時頁首會出現提示 banner，見 [shared.md](shared.md) 的 `App.vue`）。

## 前端程式碼

- **`frontend/src/components/NotificationBell.vue`**：掛載在 `App.vue` 頁首，所有登入後的頁面都看得到
  - `fetchNotifications`：載入通知列表，呼叫 `GET /api/notifications`
  - `toggle`：點擊鈴鐺展開/收合通知清單
  - `openNotification`：點開一則通知，呼叫 `POST /api/notifications/:id/read` 標記已讀，並依通知類型導去對應頁面（例如公告、作業）
  - `markAllAsRead`：全部標記已讀，呼叫 `POST /api/notifications/read-all`
  - `formatTime`：把時間字串轉成「幾分鐘前」之類的相對時間顯示
  - `onClickOutside`：點擊清單以外的地方時自動收合
  - `onVisibilityChange`：分頁從背景切回前景時重新整理通知（避免看到過期的未讀數字）

## 後端程式碼

### Route — `backend/src/routes/notificationRoutes.js`（掛載於 `/api/notifications`）

- `GET /`（列表）
- `POST /read-all`（全部標已讀）
- `POST /:id/read`（單筆標已讀）

### Controller — `backend/src/controllers/notificationController.js`

- `list`：取得目前使用者的通知列表（依角色分學生/教師兩套資料）
- `markAsRead`：標記單筆已讀
- `markAllAsRead`：標記全部已讀

### Service — `backend/src/services/notificationService.js`

| 函式 | 做什麼 |
| --- | --- |
| `getNotifications` | 依角色（學生 vs. 教師）查對應的通知列表 |
| `markAsRead` | 標記單筆已讀 |
| `markAllAsRead` | 標記全部已讀 |
| `resolveExcludeStudentId`（私有） | 查發文者自己的學生 id，通知其他人時要排除自己 |
| `notifyByCourseCode` | 對某課程的修課學生建立一筆站內通知（公告模組在用，見 [announcement.md](announcement.md)） |
| `emailEnrolledStudents` | 對某課程已填信箱的修課學生寄送通知信 |

### Model — `backend/src/models/notificationModel.js`

- `createForCourseStudents`：對課程全部修課學生寫入一筆通知（可排除發文者本人）
- `listForStudent`/`listForTeacher`：查學生/教師自己的通知列表
- `countUnread`/`countUnreadForTeacher`：查未讀數量
- `markAsRead`/`markAsReadForTeacher`：標記單筆已讀
- `markAllAsRead`/`markAllAsReadForTeacher`：標記全部已讀
- `markAsReadByRef`：依「來源物件」標記已讀（例如學生在公告頁直接點開公告時，順便標記對應的通知已讀）
- `insertForTeacher`：對某教師寫入一筆通知（`homeworkDeadlineService.js` 的批改提醒在用）
- `listEmailsForTeachers`/`listEmailsForCourse`：查教師/修課學生裡有填信箱的 email 清單，給寄信用

### 相關服務／工具

| 檔案 | 內容 |
| --- | --- |
| `services/homeworkDeadlineService.js` | `startHomeworkDeadlineNotifier`：`server.js` 啟動時開始跑的背景排程，每 60 秒查一次有沒有剛截止、還沒通知過的作業；`notifyDueHomeworks`：實際查詢與逐筆通知；`notifyOneDueHomework`：對單一作業，用資料庫交易搶佔「只通知一次」（`grade_notified_at` 欄位），通知該課全部教師並寄信 |
| `utils/mailer.js` | `sendNotificationEmails`：實際寄出通知信（本來只有忘記密碼用的 `sendPasswordResetEmail`，現在擴充成共用的寄信工具） |

## API

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| GET | `/api/notifications` | `list` | JWT + (student, ta, teacher) |
| POST | `/api/notifications/read-all` | `markAllAsRead` | JWT + (student, ta, teacher) |
| POST | `/api/notifications/:id/read` | `markAsRead` | JWT + (student, ta, teacher) |

## 資料庫

`notifications` 表（`student_id`/`teacher_id` 兩個外鍵欄位擇一有值，`type`/`ref_id` 記錄通知對應到哪個物件）。目前 `database.md` 還沒有這張表的章節。

## 已知問題（本模組）

| 優先度 | 問題 |
| --- | --- |
| Medium | `database.md` 還沒有 `notifications` 表的章節 |
| Low | `homeworkDeadlineService.js` 是 `setInterval` 常駐在單一 process 裡，如果之後多開一個 backend instance（水平擴展）會變成每個 instance 都各自跑一次檢查，需要改成用資料庫鎖或外部排程器 |
