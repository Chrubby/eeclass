import { GroupModel } from "../models/groupModel.js";

function validateCourseCode(courseCode) {
  if (typeof courseCode !== "string" || !courseCode.trim()) {
    throw new Error("課程不存在");
  }
}

async function resolveCourseId(courseCode) {
  validateCourseCode(courseCode);
  const courseId = await GroupModel.getCourseIdByCode(courseCode);
  if (!courseId) throw new Error("課程不存在");
  return courseId;
}

async function assertStudentEnrollment(courseId, studentId) {
  if (!(await GroupModel.isStudentEnrolled(courseId, studentId))) {
    throw new Error("尚未加入此課程");
  }
}

export const GroupService = {
  async getGroups(courseCode, user) {
    const courseId = await resolveCourseId(courseCode);
    if (user.role === "student") {
      await assertStudentEnrollment(courseId, user.username);
    }
    return GroupModel.getGroups(courseId, user.username);
  },

  async getStudentCreationSetting(courseCode) {
    const courseId = await resolveCourseId(courseCode);
    return GroupModel.getStudentCreationEnabled(courseId);
  },

  async setStudentCreationSetting(courseCode, enabled) {
    if (typeof enabled !== "boolean") {
      throw new Error("開放狀態必須是布林值");
    }
    const courseId = await resolveCourseId(courseCode);
    await GroupModel.setStudentCreationEnabled(courseId, enabled);
    return enabled;
  },

  async joinGroup(courseCode, groupId, user) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId))) {
      throw new Error("小組不存在");
    }
    await assertStudentEnrollment(courseId, user.username);
    if (await GroupModel.hasCourseMembership(courseId, user.username)) {
      throw new Error("請向其他小組遞交加入申請");
    }
    if (!(await GroupModel.groupBelongsToCourse(courseId, groupId))) {
      throw new Error("小組不存在");
    }
    await GroupModel.joinEmptyGroup(courseId, groupId, user.username);
  },

  async leaveGroup(courseCode, groupId, user) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId))) {
      throw new Error("小組不存在");
    }
    await assertStudentEnrollment(courseId, user.username);
    const left = await GroupModel.leaveGroup(courseId, groupId, user.username);
    if (!left) throw new Error("目前不在此小組");
  },

  async getGroupHomeworks(courseCode, user) {
    const courseId = await resolveCourseId(courseCode);
    let groupId = null;
    if (user.role === "student") {
      await assertStudentEnrollment(courseId, user.username);
      const groups = await GroupModel.getGroups(courseId, user.username);
      groupId = groups.find((group) => group.isMine)?.id ?? null;
    }

    return GroupModel.getGroupHomeworks(courseCode, courseId, groupId);
  },

  async createGroup(courseCode, name, user) {
    const courseId = await resolveCourseId(courseCode);
    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (!normalizedName || normalizedName.length > 100) {
      throw new Error("小組名稱需為 1 至 100 個字");
    }
    if (user.role === "student") {
      await assertStudentEnrollment(courseId, user.username);
      const enabled = await GroupModel.getStudentCreationEnabled(courseId);
      if (!enabled) throw new Error("目前未開放學生創建小組");
      if (await GroupModel.hasCourseMembership(courseId, user.username)) {
        throw new Error("請先退出目前的小組，再創建新小組");
      }
    }
    try {
      const id = await GroupModel.createGroup(
        courseId,
        normalizedName,
        user.role === "student" ? user.username : null,
      );
      return {
        id,
        name: normalizedName,
        members: user.role === "student"
          ? [{ id: user.username, name: user.username }]
          : [],
        isMine: user.role === "student",
      };
    } catch (error) {
      if (error.code === "GROUP_NAME_TAKEN") {
        throw new Error("此課程已存在相同名稱的小組");
      }
      throw error;
    }
  },

  async createGroups(courseCode, count) {
    const courseId = await resolveCourseId(courseCode);
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      throw new Error("一次需新增 1 至 100 個小組");
    }
    return GroupModel.createGroups(courseId, count);
  },

  async updateRecruitment(courseCode, groupId, user, { enabled, message }) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId)) || !(await GroupModel.groupBelongsToCourse(courseId, groupId))) {
      throw new Error("小組不存在");
    }
    if (typeof enabled !== "boolean") {
      throw new Error("招募狀態必須是布林值");
    }
    const normalizedMessage = typeof message === "string" ? message.trim() : "";
    if (normalizedMessage.length > 1000) {
      throw new Error("招募訊息不可超過 1000 個字");
    }
    if (!(await GroupModel.isGroupLeader(courseId, groupId, user.username))) {
      throw new Error("只有組長能修改招募設定");
    }
    await GroupModel.updateRecruitment(courseId, groupId, enabled, normalizedMessage);
  },

  async transferLeadership(courseCode, groupId, user, newLeaderId) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId))) {
      throw new Error("小組不存在");
    }
    if (typeof newLeaderId !== "string" || !newLeaderId.trim()) {
      throw new Error("請選擇新的組長");
    }
    await GroupModel.transferLeadership(
      courseId,
      groupId,
      user.username,
      newLeaderId,
    );
  },

  async getApplications(courseCode, groupId, user) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId)) || !(await GroupModel.groupBelongsToCourse(courseId, groupId))) {
      throw new Error("小組不存在");
    }
    if (!(await GroupModel.isGroupLeader(courseId, groupId, user.username))) {
      throw new Error("只有組長能查看加入申請");
    }
    return GroupModel.getPendingApplications(courseId, groupId);
  },

  async submitApplication(courseCode, groupId, user, message) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId)) || !(await GroupModel.groupBelongsToCourse(courseId, groupId))) {
      throw new Error("小組不存在");
    }
    await assertStudentEnrollment(courseId, user.username);
    if (await GroupModel.isGroupMember(courseId, groupId, user.username)) {
      throw new Error("你已經是此小組的組員");
    }
    if (!(await GroupModel.isGroupRecruiting(courseId, groupId))) {
      throw new Error("此小組目前未開放申請");
    }
    const normalizedMessage = typeof message === "string" ? message.trim() : "";
    if (normalizedMessage.length > 500) {
      throw new Error("申請訊息不可超過 500 個字");
    }
    await GroupModel.createApplication(courseId, groupId, user.username, normalizedMessage);
  },

  async approveApplication(courseCode, groupId, applicationId, user) {
    const courseId = await resolveCourseId(courseCode);
    if (
      !/^\d+$/.test(String(groupId))
      || !/^\d+$/.test(String(applicationId))
      || !(await GroupModel.groupBelongsToCourse(courseId, groupId))
    ) {
      throw new Error("找不到待處理的加入申請");
    }
    await GroupModel.approveApplication(courseId, groupId, applicationId, user.username);
  },

  async deleteGroup(courseCode, groupId) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId))) {
      throw new Error("小組不存在");
    }
    const deleted = await GroupModel.deleteGroup(courseId, groupId);
    if (!deleted) throw new Error("小組不存在");
  },
};
