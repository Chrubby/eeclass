import { GroupService } from "../services/groupService.js";

function handleError(res, error, fallbackMessage) {
  const message = error.message || "";
  if (message === "課程不存在" || message === "小組不存在") {
    return res.status(404).json({ message });
  }
  if (message === "尚未加入此課程") {
    return res.status(403).json({ message });
  }
  if (message === "目前不在此小組" || message.includes("小組名稱需為")) {
    return res.status(400).json({ message });
  }
  if (message.includes("一次需新增") || message === "開放狀態必須是布林值") {
    return res.status(400).json({ message });
  }
  if (message === "目前未開放學生創建小組") {
    return res.status(403).json({ message });
  }
  if (message === "此課程已存在相同名稱的小組") {
    return res.status(409).json({ message });
  }
  if (
    error.code === "APPLICATION_ALREADY_EXISTS"
    || message === "已經送出加入申請"
  ) {
    return res.status(409).json({ message: "已經送出加入申請" });
  }
  if (
    message.includes("只有組長")
    || message === "此小組目前未開放申請"
    || message === "你已經是此小組的組員"
    || message === "此小組已有人加入，請遞交加入申請"
    || message === "請向其他小組遞交加入申請"
    || message === "請先退出目前的小組，再創建新小組"
  ) {
    return res.status(403).json({ message });
  }
  if (
    message.includes("招募狀態")
    || message.includes("招募訊息")
    || message.includes("申請訊息")
  ) {
    return res.status(400).json({ message });
  }
  if (error.code === "APPLICATION_NOT_FOUND") {
    return res.status(404).json({ message: "找不到待處理的加入申請" });
  }
  if (error.code === "APPLICANT_IN_OTHER_GROUP") {
    return res.status(409).json({
      code: error.code,
      message: error.message,
    });
  }
  if (message.includes("請選擇新的組長") || message.includes("不是此小組成員")) {
    return res.status(400).json({ message });
  }
  console.error("[GroupController]", error);
  return res.status(500).json({ message: fallbackMessage });
}

export const GroupController = {
  async getGroups(req, res) {
    try {
      const groups = await GroupService.getGroups(req.params.courseCode, req.user);
      res.json(groups);
    } catch (error) {
      handleError(res, error, "讀取小組資料失敗");
    }
  },

  async getStudentCreationSetting(req, res) {
    try {
      const enabled = await GroupService.getStudentCreationSetting(
        req.params.courseCode,
      );
      res.json({ enabled });
    } catch (error) {
      handleError(res, error, "讀取學生創建設定失敗");
    }
  },

  async setStudentCreationSetting(req, res) {
    try {
      const enabled = await GroupService.setStudentCreationSetting(
        req.params.courseCode,
        req.body.enabled,
      );
      res.json({ enabled });
    } catch (error) {
      handleError(res, error, "更新學生創建設定失敗");
    }
  },

  async joinGroup(req, res) {
    try {
      await GroupService.joinGroup(
        req.params.courseCode,
        req.params.groupId,
        req.user,
      );
      res.json({ message: "加入小組成功" });
    } catch (error) {
      handleError(res, error, "加入小組失敗");
    }
  },

  async updateRecruitment(req, res) {
    try {
      await GroupService.updateRecruitment(
        req.params.courseCode,
        req.params.groupId,
        req.user,
        req.body,
      );
      res.json({ message: "招募設定已更新" });
    } catch (error) {
      handleError(res, error, "更新招募設定失敗");
    }
  },

  async transferLeadership(req, res) {
    try {
      await GroupService.transferLeadership(
        req.params.courseCode,
        req.params.groupId,
        req.user,
        req.body.studentId,
      );
      res.json({ message: "組長已轉移" });
    } catch (error) {
      handleError(res, error, "轉移組長失敗");
    }
  },

  async getApplications(req, res) {
    try {
      const applications = await GroupService.getApplications(
        req.params.courseCode,
        req.params.groupId,
        req.user,
      );
      res.json(applications);
    } catch (error) {
      handleError(res, error, "讀取加入申請失敗");
    }
  },

  async submitApplication(req, res) {
    try {
      await GroupService.submitApplication(
        req.params.courseCode,
        req.params.groupId,
        req.user,
        req.body.message,
      );
      res.status(201).json({ message: "加入申請已送出" });
    } catch (error) {
      handleError(res, error, "送出加入申請失敗");
    }
  },

  async approveApplication(req, res) {
    try {
      await GroupService.approveApplication(
        req.params.courseCode,
        req.params.groupId,
        req.params.applicationId,
        req.user,
      );
      res.json({ message: "已同意加入申請" });
    } catch (error) {
      handleError(res, error, "處理加入申請失敗");
    }
  },

  async leaveGroup(req, res) {
    try {
      await GroupService.leaveGroup(
        req.params.courseCode,
        req.params.groupId,
        req.user,
      );
      res.json({ message: "退出小組成功" });
    } catch (error) {
      handleError(res, error, "退出小組失敗");
    }
  },

  async getGroupHomeworks(req, res) {
    try {
      const homeworks = await GroupService.getGroupHomeworks(
        req.params.courseCode,
        req.user,
      );
      res.json(homeworks);
    } catch (error) {
      handleError(res, error, "讀取小組作業失敗");
    }
  },

  async createGroup(req, res) {
    try {
      const group = await GroupService.createGroup(
        req.params.courseCode,
        req.body.name,
        req.user,
      );
      res.status(201).json(group);
    } catch (error) {
      handleError(res, error, "新增小組失敗");
    }
  },

  async createGroups(req, res) {
    try {
      const groups = await GroupService.createGroups(
        req.params.courseCode,
        req.body.count,
      );
      res.status(201).json(groups);
    } catch (error) {
      handleError(res, error, "批量新增小組失敗");
    }
  },

  async deleteGroup(req, res) {
    try {
      await GroupService.deleteGroup(req.params.courseCode, req.params.groupId);
      res.json({ message: "小組已刪除" });
    } catch (error) {
      handleError(res, error, "刪除小組失敗");
    }
  },
};
