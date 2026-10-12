import express from "express";
import { AuthController } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { uploadAvatar, uploadBulkAccountFile } from "../middlewares/upload.js";

const router = express.Router();

router.post("/register", AuthController.register);
router.post(
  "/bulk-register",
  uploadBulkAccountFile.single("file"),
  AuthController.bulkRegister,
);
router.get("/bulk-register/template", AuthController.bulkRegisterTemplate);
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/change-password", authMiddleware, AuthController.changePassword);
router.post("/email", authMiddleware, AuthController.updateEmail);
router.post("/avatar", authMiddleware, uploadAvatar.single("avatar"), AuthController.uploadAvatar);
router.get("/me", authMiddleware, AuthController.me);

export default router;
