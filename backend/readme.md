1. 進入 `backend` 後安裝套件：`npm install`
2. 複製 `.env.example` 為 `.env`，填入資料庫連線資訊
3. 如需信箱登入，請確認：`ALTER TABLE accounts ADD COLUMN email VARCHAR(100) UNIQUE;`
4. 啟動後端：`npm run dev`（預設 `http://127.0.0.1:5000`）
5. 前端在專案根目錄啟動：`npm run dev`

# 架構更新
```Plaintext
backend/
├── scripts/
│   └── initDB.js           # 資料庫初始化腳本
├── src/
│   ├── config/             # 設定檔 (例如 db.js 連線池)
│   ├── middlewares/        # 中介軟體 (例如 upload.js 檔案上傳攔截)
│   ├── routes/             # 定義 RESTful API 網址路徑 (分派給對應 Controller)
│   ├── controllers/        # 接收 Request，呼叫 Service，回傳 JSON Response
│   ├── services/           # 核心商業邏輯、Transaction 控制、呼叫外部 API
│   ├── models/             # 專責直接對資料庫下 SQL 指令
│   └── utils/              # 共用工具 (例如 openaiHelper.js, dbHistoryLogger.js)
└── server.js               # 系統進入點 (僅負責掛載 Route 與啟動 Server)
```
以上為這次新增的東西，啟動一樣是npm run dev
## ==若要初始化Database==
```
node scripts/initdb.js
```