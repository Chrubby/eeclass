import { GroupModel } from "../models/groupModel.js";
import { HomeworkModel } from "../models/homeworkModel.js";
import { HomeworkService } from "./homeworkService.js";

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

async function assertGroupAccess(courseId, groupId, user) {
  if (!(await GroupModel.groupBelongsToCourse(courseId, groupId))) {
    throw new Error("小組不存在");
  }
  if (user.role === "student") {
    await assertStudentEnrollment(courseId, user.username);
    if (!(await GroupModel.isGroupMember(courseId, groupId, user.username))) {
      throw new Error("只有該小組組員與教師、助教能查看此內容");
    }
  } else if (["teacher", "ta"].includes(user.role)) {
    if (!(await GroupModel.isCourseStaff(courseId, user.username, user.role))) {
      throw new Error("只有該小組組員與教師、助教能查看此內容");
    }
  } else {
    throw new Error("只有該小組組員與教師、助教能查看此內容");
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

  async getCourseMaxMembers(courseCode) {
    const courseId = await resolveCourseId(courseCode);
    return GroupModel.getCourseMaxMembers(courseId);
  },

  async setCourseMaxMembers(courseCode, user, maxMembers) {
    const courseId = await resolveCourseId(courseCode);
    if (!["teacher", "ta"].includes(user.role)) {
      throw new Error("只有教師或助教能設定小組人數上限");
    }
    if (!Number.isInteger(maxMembers) || maxMembers < 1) {
      throw new Error("小組人數上限必須是大於 0 的整數");
    }
    await GroupModel.setCourseMaxMembers(courseId, maxMembers);
  },

  async joinGroup(courseCode, groupId, user) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId))) {
      throw new Error("小組不存在");
    }
    await assertStudentEnrollment(courseId, user.username);
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
    let groupIds;
    if (user.role === "student") {
      await assertStudentEnrollment(courseId, user.username);
      const groups = await GroupModel.getGroups(courseId, user.username);
      groupIds = groups.filter((group) => group.isMine).map((group) => group.id);
    } else {
      if (!["teacher", "ta"].includes(user.role)
        || !(await GroupModel.isCourseStaff(courseId, user.username, user.role))) {
        throw new Error("只有該小組組員與教師、助教能查看此內容");
      }
      const groups = await GroupModel.getGroups(courseId, user.username);
      groupIds = groups.map((group) => group.id);
    }

    return GroupModel.getGroupHomeworks(courseCode, courseId, groupIds);
  },

  async getGroupDiscussion(courseCode, groupId, user) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId))) throw new Error("小組不存在");
    await assertGroupAccess(courseId, groupId, user);
    return GroupModel.getGroupDiscussionPosts(groupId);
  },

  async addGroupDiscussionPost(courseCode, groupId, user, { content, parentPostId = null }) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId))) throw new Error("小組不存在");
    await assertGroupAccess(courseId, groupId, user);
    const normalizedContent = typeof content === "string" ? content.trim() : "";
    if (!normalizedContent) throw new Error("留言內容不可為空");
    if (normalizedContent.length > 10000) throw new Error("留言內容不可超過 10000 個字");
    if (parentPostId != null && !/^\d+$/.test(String(parentPostId))) {
      throw new Error("找不到此小組的討論留言");
    }
    return GroupModel.createGroupDiscussionPost(
      groupId,
      user.username,
      parentPostId,
      normalizedContent,
    );
  },

  async deleteGroupDiscussionPost(courseCode, groupId, postId, user) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId)) || !/^\d+$/.test(String(postId))) {
      throw new Error("找不到討論留言");
    }
    await assertGroupAccess(courseId, groupId, user);
    const isStaff = ["teacher", "ta"].includes(user.role);
    if (!(await GroupModel.deleteGroupDiscussionPost(groupId, postId, user.username, isStaff))) {
      throw new Error("找不到可刪除的討論留言");
    }
  },

  async getGroupHomework(courseCode, groupId, hwId, user) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId)) || !/^\d+$/.test(String(hwId))) {
      throw new Error("找不到小組作業");
    }
    await assertGroupAccess(courseId, groupId, user);
    const homework = await HomeworkService.getHomeworkDetail(hwId);
    if (!homework || String(homework.course_id) !== String(courseCode) || !homework.is_group_homework) {
      throw new Error("找不到小組作業");
    }
    const submission = await HomeworkModel.getStudentSubmission(
      hwId,
      user.username,
      Number(groupId),
    );
    return { homework, submission };
  },

  async submitGroupHomework(courseCode, groupId, hwId, user, answerText, files, removeFileIndexes = []) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId)) || !/^\d+$/.test(String(hwId))) {
      throw new Error("找不到小組作業");
    }
    await assertGroupAccess(courseId, groupId, user);
    const homework = await HomeworkModel.getHomeworkById(hwId);
    if (!homework || String(homework.course_id) !== String(courseCode) || !homework.is_group_homework) {
      throw new Error("找不到小組作業");
    }
    return HomeworkService.submitHomework(
      hwId,
      user.username,
      answerText,
      files,
      removeFileIndexes,
      Number(groupId),
    );
  },

  async unsubmitGroupHomework(courseCode, groupId, hwId, user) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId)) || !/^\d+$/.test(String(hwId))) {
      throw new Error("找不到小組作業");
    }
    await assertGroupAccess(courseId, groupId, user);
    const homework = await HomeworkModel.getHomeworkById(hwId);
    if (!homework || String(homework.course_id) !== String(courseCode) || !homework.is_group_homework) {
      throw new Error("找不到小組作業");
    }
    return HomeworkService.unsubmitHomework(
      hwId,
      user.username,
      Number(groupId),
    );
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
    if (await GroupModel.isGroupAtCapacity(courseId, groupId)) {
      const error = new Error("小組人數已達上限，暫時無法申請加入");
      error.code = "GROUP_AT_CAPACITY";
      throw error;
    }
    const normalizedMessage = typeof message === "string" ? message.trim() : "";
    if (normalizedMessage.length > 500) {
      throw new Error("申請訊息不可超過 500 個字");
    }
    await GroupModel.createApplication(courseId, groupId, user.username, normalizedMessage);
  },

  async approveApplication(courseCode, groupId, applicationId, user, confirmMultipleGroups = false) {
    const courseId = await resolveCourseId(courseCode);
    if (
      !/^\d+$/.test(String(groupId))
      || !/^\d+$/.test(String(applicationId))
      || !(await GroupModel.groupBelongsToCourse(courseId, groupId))
    ) {
      throw new Error("找不到待處理的加入申請");
    }
    await GroupModel.approveApplication(
      courseId,
      groupId,
      applicationId,
      user.username,
      confirmMultipleGroups,
    );
  },

  async withdrawApplication(courseCode, groupId, user) {
    const courseId = await resolveCourseId(courseCode);
    if (!/^\d+$/.test(String(groupId)) || !(await GroupModel.groupBelongsToCourse(courseId, groupId))) {
      throw new Error("找不到待撤回的加入申請");
    }
    await assertStudentEnrollment(courseId, user.username);
    if (!(await GroupModel.withdrawApplication(courseId, groupId, user.username))) {
      throw new Error("找不到待撤回的加入申請");
    }
  },

  async deleteApplication(courseCode, groupId, applicationId, user) {
    const courseId = await resolveCourseId(courseCode);
    if (
      !/^\d+$/.test(String(groupId))
      || !/^\d+$/.test(String(applicationId))
      || !(await GroupModel.groupBelongsToCourse(courseId, groupId))
    ) {
      throw new Error("找不到待處理的加入申請");
    }
    if (!(await GroupModel.isGroupLeader(courseId, groupId, user.username))) {
      throw new Error("只有組長能刪除加入申請");
    }
    if (!(await GroupModel.deleteApplication(courseId, groupId, applicationId))) {
      throw new Error("找不到待處理的加入申請");
    }
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
