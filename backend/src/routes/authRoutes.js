import express from "express";
import { AuthController } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/user_inf", AuthController.getUserInfo);

export default router;