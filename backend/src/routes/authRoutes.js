import express from "express";
import { AuthController } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { uploadAvatar } from "../middlewares/upload.js";

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/change-password", authMiddleware, AuthController.changePassword);
router.post("/avatar", authMiddleware, uploadAvatar.single("avatar"), AuthController.uploadAvatar);
router.get("/me", authMiddleware, AuthController.me);

export default router;
