import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 引入路由
import authRoutes from "./src/routes/authRoutes.js";
import courseRoutes from "./src/routes/courseRoutes.js";
import announcementRoutes from "./src/routes/announcementRoutes.js";
import discussionRoutes from "./src/routes/discussionRoutes.js";
import homeworkRoutes from "./src/routes/homeworkRoutes.js";
import homeworkAiRoutes from "./src/routes/homeworkAiRoutes.js";
import courseAiRoutes from "./src/routes/courseAiRoutes.js";

// 初始化環境變數
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 設定靜態檔案路徑 (Uploads)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}
app.use("/uploads", express.static(uploadsRoot));

// 掛載 API 路由
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/discussions", discussionRoutes);

// 作業與 AI 路由
app.use("/api", homeworkRoutes);
app.use("/api", homeworkAiRoutes);
app.use("/api/courses", courseAiRoutes); // 全域助教路由

// 啟動伺服器
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running at http://127.0.0.1:${port}`));