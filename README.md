# eeclass

目前專案已整理為雙服務結構：

- `frontend/`: Vue 3 + Vite 前端
- `backend/`: Node.js + Express API
- `db/`: 資料庫相關腳本/說明

## 啟動方式

### 1) 啟動後端

```sh
cd backend
npm install
copy .env.example .env
npm run dev
```

### 2) 啟動前端

```sh
cd frontend
npm install
copy .env.example .env
npm run dev
```

### 3) 建立第一個管理員

系統不開放自行註冊，所有帳號都由管理員建立，所以新的資料庫要先建立一個管理員才登得進去：

```sh
cd backend
node scripts/seedAdmin.js <帳號> <姓名> <密碼>
```

- 管理員登入後可在「帳號管理」逐一建立帳號，或上傳學員名單 Excel 批次建立（學生、授課老師）。
- 管理員在「所有課程」建立課程；課程的「學生名冊」可上傳同一份 Excel 同步修課名單。
- 助教不是另一種帳號：由授課老師在課程的「學生名冊」把學生勾選為該課助教，同一個帳號可以在別門課當一般學生。

## 根目錄快捷指令

```sh
npm run frontend:dev
npm run backend:dev
```

## 備註

- 前端預設 API 位址為 `http://127.0.0.1:5000`，可透過 `frontend/.env` 的 `VITE_API_BASE_URL` 調整。
- 作業頁面有 teacher/student 路由切換，測試可用瀏覽器 console 設定：
- 網站已部署到 [`http://140.115.53.217`](http://140.115.53.217)

```js
localStorage.setItem('userRole', 'teacher') // 或 'student'
```