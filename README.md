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

## 根目錄快捷指令

```sh
npm run frontend:dev
npm run backend:dev
```

## 備註

- 前端預設 API 位址為 `http://127.0.0.1:5000`，可透過 `frontend/.env` 的 `VITE_API_BASE_URL` 調整。
- 作業頁面有 teacher/student 路由切換，測試可用瀏覽器 console 設定：

```js
localStorage.setItem('userRole', 'teacher') // 或 'student'
```