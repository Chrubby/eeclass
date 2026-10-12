# 模組文件索引

> 所屬文件：[overview.md](../overview.md) ・ [database.md](../database.md) ・ [process-issues.md](../process-issues.md)
>
> 每個模組一個文件檔案，內容包含：這個模組做什麼、前端程式碼位置（檔案 + 函式/變數名稱）、後端程式碼位置（route/controller/service/model 檔案 + 函式名稱）、對應 API、對應資料表（連到 [database.md](../database.md)，不重複內容）、該模組已知的問題。找函式請用檔案內搜尋函式名稱。
>
> 核對日期：2026-09-29。

| 模組 | 涵蓋範圍 |
| --- | --- |
| [auth](auth.md) | 註冊、登入、忘記密碼、改密碼、頭貼 |
| [course](course.md) | 課程搜尋、加選課、建立課程、我的課程列表 |
| [announcement](announcement.md) | 課程公告與已讀狀態 |
| [material](material.md) | 課程教材上傳/下載/刪除 |
| [discussion](discussion.md) | 討論區主題、巢狀留言、AI 自動回覆 |
| [homework](homework.md) | 作業 CRUD、繳交、收回、批改、歷程 |
| [homework-ai](homework-ai.md) | 作業 AI 預評分、AI 解惑聊天、課程 Prompt 設定（讀寫） |
| [course-ai](course-ai.md) | 課程 AI 助教聊天、作業提醒、聊天紀錄 |
| [aiquiz](aiquiz.md) | AI 出題、學生作答、AI 即時回饋、留言 |
| [shared](shared.md) | 不屬於單一模組的共用基礎設施（server.js、router、api client、上傳/錯誤處理 middleware 等） |

資料庫的表格說明、鍵值慣例、ER 圖維持在 [database.md](../database.md)，各模組文件只連結過去，不重複描述。跨模組的流程（例如登入後怎麼導到各頁、作業繳交→AI 預評分→教師批改的完整資料流）見 [overview.md 第 4 章](../overview.md#4-跨層資料流程)。

## 怎麼看 APIs 段落

每個模組檔案的「API」表格固定是這個格式：

| Method | Endpoint | Controller 方法 | 權限 |
| --- | --- | --- | --- |
| HTTP 方法 | 路徑 | 對應的 controller 函式名稱（可以去該模組文件的「後端程式碼」段落找這個函式） | `Public` / `JWT` / `JWT + (角色...)` |

新增或修改 API 時，直接在對應模組檔案的這張表格加一列（或改掉既有那一列），不用額外開 PR 去改格式本身。
