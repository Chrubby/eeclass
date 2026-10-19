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
  if (message === "找不到待處理的加入申請" || message === "找不到待撤回的加入申請") {
    return res.status(404).json({ message });
  }
  if (message === "找不到小組作業" || message === "找不到討論留言" || message === "找不到此小組的討論留言" || message === "找不到可刪除的討論留言") {
    return res.status(404).json({ message });
  }
  if (message.includes("只有該小組組員")) {
    return res.status(403).json({ message });
  }
  if (message.includes("留言內容")) {
    return res.status(400).json({ message });
  }
  if (message.includes("檔案移除清單")) {
    return res.status(400).json({ message });
  }
  if (message.includes("截止") || message.includes("空內容") || message.includes("檔案")) {
    return res.status(400).json({ message });
  }
  if (message.includes("一次需新增") || message === "開放狀態必須是布林值") {
    return res.status(400).json({ message });
  }
  if (message === "小組人數上限必須是大於 0 的整數") {
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
  if (error.code === "APPLICANT_HAS_OTHER_GROUPS") {
    return res.status(409).json({
      code: error.code,
      message: error.message,
      otherGroups: error.otherGroups,
    });
  }
  if (error.code === "GROUP_AT_CAPACITY") {
    return res.status(409).json({ code: error.code, message });
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
        req.body || {},
      );
      res.json({ message: "招募設定已更新" });
    } catch (error) {
      handleError(res, error, "更新招募設定失敗");
    }
  },

  async getCourseMaxMembers(req, res) {
    try {
      const maxMembers = await GroupService.getCourseMaxMembers(
        req.params.courseCode,
      );
      res.json({ maxMembers });
    } catch (error) {
      handleError(res, error, "讀取小組人數上限失敗");
    }
  },

  async setCourseMaxMembers(req, res) {
    try {
      await GroupService.setCourseMaxMembers(
        req.params.courseCode,
        req.user,
        req.body.maxMembers,
      );
      res.json({ message: "課程小組人數上限已更新" });
    } catch (error) {
      handleError(res, error, "更新課程小組人數上限失敗");
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
        req.body?.confirmMultipleGroups === true,
      );
      res.json({ message: "已同意加入申請" });
    } catch (error) {
      handleError(res, error, "處理加入申請失敗");
    }
  },

  async withdrawApplication(req, res) {
    try {
      await GroupService.withdrawApplication(
        req.params.courseCode,
        req.params.groupId,
        req.user,
      );
      res.json({ message: "已撤回加入申請" });
    } catch (error) {
      handleError(res, error, "撤回加入申請失敗");
    }
  },

  async deleteApplication(req, res) {
    try {
      await GroupService.deleteApplication(
        req.params.courseCode,
        req.params.groupId,
        req.params.applicationId,
        req.user,
      );
      res.json({ message: "已刪除加入申請" });
    } catch (error) {
      handleError(res, error, "刪除加入申請失敗");
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

  async getGroupDiscussion(req, res) {
    try {
      const posts = await GroupService.getGroupDiscussion(
        req.params.courseCode,
        req.params.groupId,
        req.user,
      );
      res.json(posts);
    } catch (error) {
      handleError(res, error, "讀取小組討論失敗");
    }
  },

  async addGroupDiscussionPost(req, res) {
    try {
      const id = await GroupService.addGroupDiscussionPost(
        req.params.courseCode,
        req.params.groupId,
        req.user,
        req.body || {},
      );
      res.status(201).json({ id, message: "留言已送出" });
    } catch (error) {
      handleError(res, error, "發表小組討論留言失敗");
    }
  },

  async deleteGroupDiscussionPost(req, res) {
    try {
      await GroupService.deleteGroupDiscussionPost(
        req.params.courseCode,
        req.params.groupId,
        req.params.postId,
        req.user,
      );
      res.json({ message: "留言已刪除" });
    } catch (error) {
      handleError(res, error, "刪除小組討論留言失敗");
    }
  },

  async getGroupHomework(req, res) {
    try {
      const result = await GroupService.getGroupHomework(
        req.params.courseCode,
        req.params.groupId,
        req.params.hwId,
        req.user,
      );
      res.json(result);
    } catch (error) {
      handleError(res, error, "讀取小組作業失敗");
    }
  },

  async submitGroupHomework(req, res) {
    try {
      let removeIndexes = [];
      try {
        removeIndexes = req.body.removeFileIndexes ? JSON.parse(req.body.removeFileIndexes) : [];
      } catch {
        throw new Error("檔案移除清單格式錯誤");
      }
      await GroupService.submitGroupHomework(
        req.params.courseCode,
        req.params.groupId,
        req.params.hwId,
        req.user,
        req.body.answerText,
        req.files || [],
        removeIndexes,
      );
      res.json({ message: "小組作業繳交成功" });
    } catch (error) {
      handleError(res, error, "繳交小組作業失敗");
    }
  },

  async unsubmitGroupHomework(req, res) {
    try {
      await GroupService.unsubmitGroupHomework(
        req.params.courseCode,
        req.params.groupId,
        req.params.hwId,
        req.user,
      );
      res.json({ message: "小組作業已收回" });
    } catch (error) {
      handleError(res, error, "收回小組作業失敗");
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
