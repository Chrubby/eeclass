import express from "express";
import { AuthController } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.get("/me", authMiddleware, AuthController.me);

export default router;
