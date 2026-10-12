# 開發流程稽核：現況問題

> 所屬文件：[overview.md（總覽）](overview.md) ・ [database.md](database.md) ・ **process-issues.md** ・ [workflow.md](workflow.md) ・ [modules/](modules/README.md)
>
> 這份文件**只記錄現況與問題**，不重複寫「該怎麼做」——團隊正式採用的規則都在 [workflow.md](workflow.md)。全部內容依 `git log`、`.gitignore`、專案設定檔等**可查證的實際紀錄**整理（核對日期：2026-09-28），不是憑印象猜測；無法從現有資料確認的地方標示 **TODO / 待確認**。
>
> 討論的不是「程式碼寫得對不對」（那是 [database.md](database.md) 和 [modules/](modules/README.md) 的範圍），而是**團隊怎麼做出這些程式碼的過程**：版本控制、程式碼審查、測試、CI、Schema 變更、機密管理、文件、專案追蹤、部署。

---

## 1. 現況總覽

| 項目 | 現況 |
| --- | --- |
| 版本控制策略 | 有用 Git + GitHub，但**沒有分支保護、沒有 Pull Request 審查**，直接 push/merge 到 `main` |
| Commit / 分支規範 | 無（訊息格式不一致，已合併分支未清理，見第 2 章） |
| 自動化測試 | **無**（沒有任何測試檔案，也沒有安裝測試框架） |
| CI/CD | **無**（沒有 `.github/workflows`，沒有 `.github` 目錄） |
| Lint / Format 強制執行 | 有設定 ESLint / oxlint / Prettier，但**沒有 pre-commit hook**（無 husky / lint-staged），靠自覺執行 |
| 需求 / 設計文件 | **無**（沒有 Design Doc、ADR、User Story，見第 4 章的具體後果） |
| API 契約 | 在補上 [modules/](modules/README.md) 前**完全沒有**，靠讀程式碼 |
| 資料庫 Migration 工具 | **無**（手動疊加 `ALTER TABLE`，見 [database.md](database.md#1-基本資訊)） |
| 機密管理 | `.env` 有被 `.gitignore` 排除，但舊版 `db/*.py` 內有硬編碼明文密碼已進入 git 歷史（見 [database.md](database.md#5-舊版腳本)） |
| 專案 / 任務追蹤 | 已採用 Jira + Discord（見 [workflow.md](workflow.md)），但本機看不到過去的使用紀錄 |
| 部署流程 | **無**（沒有 Dockerfile、CI/CD、staging 環境，見 [overview.md 第 6 章](overview.md#6-部署與環境)） |

> 以上這些項目「現在該怎麼做」已經是 [workflow.md](workflow.md) 的正式規則（分支保護、PR 流程、commit 格式、CI 閘門、migration 原則、機密管理、Jira/Discord 流程等），這裡不重複列建議，只保留「現況是什麼、為什麼有問題」。`workflow.md` 自己的「代辦事項」章節也列了幾項目前還沒做到、需要排進去做的項目。

---

## 2. 版本控制與協作流程（現況）

專案在 GitHub（`https://github.com/Chrubby/eeclass`），主分支 `main`，另有 4 個遠端分支：

| 分支 | 狀態 |
| --- | --- |
| `discussion` | 已完全合併進 `main`（領先 0 個 commit），**但分支沒有被刪除** |
| `frontend` | 已完全合併進 `main`（領先 0 個 commit），**但分支沒有被刪除** |
| `temp` | 已完全合併進 `main`（領先 0 個 commit），**但分支沒有被刪除** |
| `mainpage` | 領先 `main` 1 個 commit（`c2b533d 新增了主介面連結，並對排版進行修改`），**從未合併回 main，也不知道是否還需要** |

目前為止共 58 個 commit、4 位貢獻者（依 `git log` 作者統計，Atlas 25 次、ccwangg 24 次、Chrubby 8 次、Evan 1 次）。開發時間集中在 2026-03-04 ～ 2026-05-25，**`main` 最後一次 commit 是 2026-05-25**（TODO / 待確認：是團隊暫停開發、還是有未 commit 的進度在別處）。

檢查所有 merge commit 訊息，**沒有任何一筆是 GitHub Pull Request 產生的合併**（GitHub 的 PR 合併訊息固定會是 `Merge pull request #N from ...`，這裡完全沒有這種格式）：

```text
preparing for
Merge branch 'main' of https://github.com/Chrubby/eeclass
Merge branch 'main' of https://github.com/Chrubby/eeclass
merge
Merge branch 'main' of https://github.com/Chrubby/eeclass
Merge remote-tracking branch 'origin/discussion'
merge
Merge branch 'frontend'
```

這代表所有合併都是在本機用 `git pull` / `git merge` 完成後直接 `push`，**沒有人在合併前看過對方的 diff**。專案裡也沒有 `.github/` 目錄，代表沒有 PR 模板、沒有 Issue 模板、沒有任何 GitHub Actions。

Commit 訊息本身也看得出協作方式偏隨性：

```text
first commit          ← 出現 3 次（942a1eb、5509039、7f3322b），代表至少 3 次有人在沒有先 pull 既有歷史的情況下另起爐灶
merge                 ← 出現多次，看不出合併了什麼
3.22 / 3.28 / 4.4      ← 用日期當 commit 訊息，看不出做了什麼
catch the error cannot read pdf   ← 連續 3 次一模一樣的訊息（f50a675、3b33e59、02ddfb0），像是同一個問題本機沒測過就直接推上去，來回修了 3 次
fixed:file upload      ← 冒號後沒有空格，跟其他訊息風格（fix:security、fixed: hw submittion）不一致
```

**這樣做的實際風險**：

- **沒有 Code Review** → `AiQuizService.getQuizDetail` 被定義兩次互相覆蓋、`courseAiModel.upsertPrompts` 呼叫作用域外的 `res`、`homework_submissions.ai_estimated_*` 欄位被程式碼引用卻從未建表——這些如果有第二個人在合併前看過 diff，多半在 Review 階段就能被抓到（詳見 [aiquiz 模組](modules/aiquiz.md)、[course-ai 模組](modules/course-ai.md)、[database.md 第 7 節](database.md#7-已知問題)）。
- **直接 push 到 `main`、沒有分支保護** → 任何一次沒測過的 commit 都會立刻影響所有人在跑的 `main`，「連續 3 次相同訊息的 debug commit」就是這種代價的直接證據。
- **已合併分支不清理** → `discussion`/`frontend`/`temp` 這種已經併入 `main` 的分支留著，新加入的人不知道該不該用、內容是否過時，增加認知負擔；`mainpage` 這種**從未合併、也沒人記得的分支**更危險。
- **Commit 訊息不可搜尋** → 半年後想知道「作業批改邏輯是哪個 commit 改的」，訊息是 `3.28`、`merge` 完全查不到，只能整包翻 diff。

---

## 3. 程式碼品質保證（現況）

- **沒有任何自動化測試**：`frontend/package.json`、`backend/package.json` 都沒有安裝測試框架（無 Vitest、Jest、Mocha、Playwright、Cypress），專案裡也搜尋不到任何 `*.test.js` / `*.spec.js`。
- 但 `.gitignore` 裡其實**已經預留了 Vitest 與 Cypress 的規則**（`__screenshots__/`、`/cypress/videos/`、`/cypress/screenshots/`）——這是 `create-vue` 鷹架初始化時的預設內容，代表專案一開始的範本有考慮到測試，但後續**從未真的導入**，也沒人清掉這些用不到的規則。
- **沒有 CI**：沒有 `.github/workflows`，代表 push / PR 時不會自動跑 lint、build 或測試，能不能動全靠開發者自己在本機確認。
- **有 lint/format 設定但沒有強制執行**：`eslint.config.js`、`.oxlintrc.json`、`.prettierrc.json` 都存在，`frontend/package.json` 也有 `npm run lint`、`npm run format` script，但沒有 husky/lint-staged 之類的 pre-commit hook，也沒有 CI 幫忙擋，**是否執行完全取決於個人習慣**。

---

## 4. 需求與設計流程（現況）

專案裡看不到任何需求文件、User Story、Design Doc 或 Architecture Decision Record（ADR）。這不是「文件寫得不夠」的問題，而是從程式碼可以直接觀察到**沒有事前設計**留下的具體後果：

- **鍵值慣例在不同功能各自為政**：同樣是「課程」，`teacher_courses`/`enrollments`/`announcements` 存的是 `courses.id`（數字），但 `homeworks`/`course_materials`/`AIQuizzes` 存的是 `course_code`（字串）；同樣是「使用者」，一部分表存 `accounts.id` 或 `students.id`，一部分存 `accounts.username`。這種不一致目前已經造成真的功能壞掉（作業 AI 讀不到課程 Prompt、AI 助教讀不到作業與學生資訊，見 [database.md 第 7 節](database.md#7-已知問題)）——如果資料模型在動工前有先畫一次 ER 圖並讓團隊看過，這種「同一個概念、兩套鍵值」的狀況通常在設計階段就會被發現。
- **功能做一半就上線**：`Exam.vue`、`Grade.vue` 只有前端外殼、按鈕按下去是 `alert('開發中')`，沒有對應後端；`ResetPassword.vue` 頁面存在但後端從來沒有產生 token 的 API 去觸發它（見 [auth 模組](modules/auth.md)）。這類「介面先做、之後再也沒接上」的情況，通常代表功能拆解時沒有明確定義「這個任務的完成標準是什麼」。
- **API 沒有事先約定格式**：同樣是「建立」語意的 API，有的回 `{ message, course_id }`、有的回 `{ message, data: {...} }`，看得出是前後端各自寫各自習慣的格式，沒有先講好一份共同規格。

---

## 5. 資料庫 Schema 變更管理（現況）

已在 [database.md 第 1 節](database.md#1-基本資訊) 記錄過，這裡只從「流程」角度重述重點：schema 變更目前是「直接在 `backend/scripts/initDB.js` 尾端疊加一段 `try/catch` 包住的 `ALTER TABLE`」，沒有版本號、沒有 rollback、也沒有工具追蹤「這個資料庫現在套用到哪一版」。後果是：

- `homework_submissions.ai_estimated_*` 三個欄位被程式碼引用，但**沒有任何腳本會建立它們**（見 [database.md 3.4](database.md#34-作業)）——這正是「schema 變更沒有走統一流程」會發生的典型狀況：可能是有人在自己的資料庫手動下了 `ALTER TABLE`，就直接開發下去，卻忘了把這段 SQL 補進 `initDB.js`。
- 同一批欄位（例如 `must_change_password`、`avatar_url`）在 `initDB.js` 跟 `ensureSchema.js` 兩處都各自補了一次，看不出哪一份是「目前真正的規格」，這兩處至今還沒合併成一個。

---

## 6. 機密與環境管理（現況）

- `.env`、`backend/.env` 有被 `.gitignore` 排除，**目前的** `.env` 本身沒有進版本控制，這點做得對。
- 但舊版 `db/create_db.py`、`db/seed_data.py`（已不建議使用，見 [database.md 第 5 節](database.md#5-舊版腳本)）裡**寫死了明文 MySQL 密碼，且已經進入 git 歷史**，即使現在刪掉檔案內容，這組密碼字串仍留在過去的 commit 裡，任何人 `git log -p` 都翻得到，**至今還沒更換**。
- `backend/src/utils/jwt.js` 在 `JWT_SECRET` 沒設定時會 fallback 成寫死在程式碼裡的字串，而且這個變數**沒有列在 `.env.example`** 提醒團隊要設定（見 [auth 模組](modules/auth.md)）。
- 沒有看到任何 secret scanning 機制（例如 GitHub 內建的 secret scanning、或 CI 裡跑 gitleaks/trufflehog），代表未來如果又有人不小心把金鑰寫死進程式碼，不會有任何自動提醒。

---

## 7. 文件與知識管理（現況）

在 `docs/` 這系列文件出現之前，專案**完全沒有技術文件**——沒有 API 規格、沒有資料表說明、沒有架構圖，唯一的文件是根目錄 `README.md`（啟動方式）與 `backend/readme.md`（架構簡介），兩者都不涉及 API/DB 細節。這代表：

- 新成員只能靠讀程式碼理解系統，上手成本高。
- 沒有「單一事實來源」，前後端對 API 格式的認知會各自漂移（見第 4 章 API 格式不一致的例子）。

---

## 8. 專案 / 任務管理（現況）

目前已採用 Jira（key `NL`）+ Discord 的流程（見 [workflow.md 第 1 章](workflow.md#1-jira-任務管理)）。**TODO / 待確認**：這份文件核對當下（2026-09-28）看不出 Jira/Discord 是何時導入的，也看不出導入前（2026-03～05 那段 git 歷史）是否有任何任務追蹤——從 commit 訊息完全沒有 Issue/Ticket 編號引用來看，當時應該是沒有的。

---

## 9. 部署與上線流程（現況）

延續 [overview.md 第 6 章](overview.md#6-部署與環境) 已記錄的現況：目前沒有 Dockerfile、docker-compose、CI/CD、process manager、staging 環境，`npm run start` 之後也沒有任何監控或錯誤回報機制。考慮到這個系統的目標是**正式取代中央大學校內現行的 eeclass**（見 [overview.md 第 1 章](overview.md#1-系統概述)），這些都是上線前必須補齊的缺口，`workflow.md` 第 4.4 節與「代辦事項」已經列了對應的目標規則與現況落差，這裡不重複。
