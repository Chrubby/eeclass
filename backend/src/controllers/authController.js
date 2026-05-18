import { AuthService } from "../services/authService.js";

export const AuthController = {
  async register(req, res) {
    try {
      await AuthService.register(req.body);
      res.json({ message: "註冊成功！" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const result = await AuthService.login(username, password);
      res.json({ message: "登入成功！", ...result });
    } catch (error) {
      res.status(401).json({ message: error.message });
    }
  },

  /** 需搭配 authMiddleware：依 JWT 回傳目前使用者資料 */
  async me(req, res) {
    try {
      const result = await AuthService.getUserInfo(req.user.username);
      res.json(result);
    } catch {
      res.status(500).json({ message: "系統發生異常" });
    }
  },

  async forgotPassword(req, res) {
    try {
      const { identifier, email, username } = req.body;
      const id = identifier ?? email ?? username;
      const result = await AuthService.requestPasswordReset(id);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  async resetPassword(req, res) {
    try {
      const { token, password, confirmPassword } = req.body;
      const result = await AuthService.resetPasswordWithToken({ token, password, confirmPassword });
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
};
