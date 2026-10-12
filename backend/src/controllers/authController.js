import { AuthService } from "../services/authService.js";
import { BulkAccountImportAdapter } from "../modules/bulkAccountImportAdapter.js";

export const AuthController = {
  async register(req, res) {
    try {
      await AuthService.register({ ...req.body, emailRequired: true });
      res.json({ message: "註冊成功！請登入並變更密碼。" });
    } catch (error) {
      console.error("[register]", error);
      res.status(400).json({ message: error.message || "註冊失敗" });
    }
  },

  async bulkRegister(req, res) {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ message: "請上傳 Excel 或 CSV 檔案" });
      }

      const outcome = await BulkAccountImportAdapter.createFromUpload(req.file.buffer, {
        importCode: req.body?.importCode,
      });

      res.json({
        message: `批次建立完成：成功 ${outcome.summary.created} 筆，失敗 ${outcome.summary.failed} 筆`,
        summary: outcome.summary,
        results: outcome.results,
        meta: outcome.meta,
      });
    } catch (error) {
      console.error("[bulkRegister]", error);
      res.status(400).json({ message: error.message || "批次建立失敗" });
    }
  },

  async bulkRegisterTemplate(_req, res) {
    try {
      const buffer = BulkAccountImportAdapter.buildTemplateBuffer();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", 'attachment; filename="bulk-account-template.xlsx"');
      res.send(buffer);
    } catch (error) {
      console.error("[bulkRegisterTemplate]", error);
      res.status(500).json({ message: error.message || "無法產生樣板" });
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
      const { username, recoveryCode, password, confirmPassword } = req.body;
      const result = await AuthService.resetPasswordWithRecoveryCode({
        username,
        recoveryCode,
        password,
        confirmPassword,
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  async changePassword(req, res) {
    try {
      const result = await AuthService.changePassword(req.user.username, req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  async updateEmail(req, res) {
    try {
      const result = await AuthService.updateEmail(req.user.username, req.body?.email);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message || "更新信箱失敗" });
    }
  },

  async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "請選擇圖片檔案" });
      }
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const result = await AuthService.updateAvatar(req.user.username, avatarUrl);
      res.json({ message: "頭貼已更新", ...result });
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
