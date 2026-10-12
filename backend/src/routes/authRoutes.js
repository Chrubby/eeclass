import express from "express";
import { AuthController } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/requireRole.js";
import { uploadAvatar, uploadSpreadsheet } from "../middlewares/upload.js";

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/accounts", authMiddleware, requireRole("admin"), AuthController.createAccount);
router.post(
  "/accounts/import",
  authMiddleware,
  requireRole("admin"),
  uploadSpreadsheet.single("file"),
  AuthController.importAccounts,
);
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/change-password", authMiddleware, AuthController.changePassword);
router.post("/avatar", authMiddleware, uploadAvatar.single("avatar"), AuthController.uploadAvatar);
router.get("/me", authMiddleware, AuthController.me);

export default router;
