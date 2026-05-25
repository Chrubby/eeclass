import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./src/routes/authRoutes.js";
import courseRoutes from "./src/routes/courseRoutes.js";
import announcementRoutes from "./src/routes/announcementRoutes.js";
import discussionRoutes from "./src/routes/discussionRoutes.js";
import homeworkRoutes from "./src/routes/homeworkRoutes.js";
import homeworkAiRoutes from "./src/routes/homeworkAiRoutes.js";
import { authMiddleware } from "./src/middlewares/authMiddleware.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";
import { ensureSchema } from "./src/utils/ensureSchema.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}
app.use("/uploads", express.static(uploadsRoot));

app.use("/api/auth", authRoutes);

app.use("/api/courses", authMiddleware, courseRoutes);
app.use("/api/announcements", authMiddleware, announcementRoutes);
app.use("/api/discussions", authMiddleware, discussionRoutes);
app.use("/api", authMiddleware, homeworkRoutes);
app.use("/api", authMiddleware, homeworkAiRoutes);

app.use(errorHandler);

const port = process.env.PORT || 5000;
ensureSchema()
  .catch((e) => console.warn("[ensureSchema] 初始化檢查發生例外：", e?.message || e))
  .finally(() => {
    app.listen(port, () => console.log(`Server running at http://127.0.0.1:${port}`));
  });
