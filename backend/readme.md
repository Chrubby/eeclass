1. 進入 `backend` 後安裝套件：`npm install`
2. 複製 `.env.example` 為 `.env`，填入資料庫連線資訊
3. 如需信箱登入，請確認：`ALTER TABLE accounts ADD COLUMN email VARCHAR(100) UNIQUE;`
4. 啟動後端：`npm run dev`（預設 `http://127.0.0.1:5000`）
5. 前端在專案根目錄啟動：`npm run dev`



0331 TODO：助教加入課程須經過老師同意、作業批改可套AI模型