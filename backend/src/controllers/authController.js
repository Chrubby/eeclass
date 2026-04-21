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

  async getUserInfo(req, res) {
    try {
      const { user_id } = req.query;
      const result = await AuthService.getUserInfo(user_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};