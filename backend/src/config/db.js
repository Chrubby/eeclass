import mysql from "mysql2/promise";
import dotenv from "dotenv";

// 確保環境變數有被載入
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME || "classroom_data",
};

// 建立並匯出連線池
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
});

// 可選：啟動時測試連線是否成功
pool.getConnection()
  .then(conn => {
    console.log("資料庫連線成功！");
    conn.release();
  })
  .catch(err => {
    console.error("資料庫連線失敗：", err.message);
  });