import { pool } from "../config/db.js";

export const GroupModel = {
  async getCourseIdByCode(courseCode, connection = pool) {
    const [rows] = await connection.execute(
      "SELECT id FROM courses WHERE course_code = ?",
      [courseCode],
    );
    return rows[0]?.id ?? null;
  },

  async getStudentCreationEnabled(courseId) {
    const [rows] = await pool.execute(
      "SELECT student_group_creation_enabled AS enabled FROM courses WHERE id = ?",
      [courseId],
    );
    return Boolean(rows[0]?.enabled);
  },

  async setStudentCreationEnabled(courseId, enabled) {
    await pool.execute(
      "UPDATE courses SET student_group_creation_enabled = ? WHERE id = ?",
      [enabled ? 1 : 0, courseId],
    );
  },

  async isStudentEnrolled(courseId, studentId, connection = pool) {
    const [rows] = await connection.execute(
      `SELECT 1
       FROM students s
       JOIN enrollments e ON e.student_id = s.id
       WHERE s.student_id = ? AND e.course_id = ?
       LIMIT 1`,
      [studentId, courseId],
    );
    return rows.length > 0;
  },

  async getGroups(courseId, studentId) {
    const [rows] = await pool.execute(
      `SELECT
         g.id,
         g.name,
         g.recruitment_enabled AS recruitmentEnabled,
         g.recruitment_message AS recruitmentMessage,
         gm.student_id AS memberId,
         COALESCE(s.name, gm.student_id) AS memberName,
         CASE WHEN mine.group_id = g.id THEN 1 ELSE 0 END AS isMine,
         CASE WHEN leader.student_id = ? THEN 1 ELSE 0 END AS isLeader,
         leader.student_id AS leaderId,
         COALESCE(leader_student.name, leader.student_id) AS leaderName,
         mine_application.status AS myApplicationStatus
       FROM course_groups g
       LEFT JOIN course_group_memberships gm
         ON gm.group_id = g.id AND gm.course_id = g.course_id
       LEFT JOIN students s ON s.student_id = gm.student_id
       LEFT JOIN course_group_memberships leader
         ON leader.course_id = g.course_id
         AND leader.group_id = g.id
         AND leader.student_id = CASE
           WHEN EXISTS (
             SELECT 1
             FROM course_group_memberships current_leader
             WHERE current_leader.course_id = g.course_id
               AND current_leader.group_id = g.id
               AND current_leader.student_id = g.leader_student_id
           ) THEN g.leader_student_id
           ELSE (
             SELECT leader_member.student_id
             FROM course_group_memberships leader_member
             WHERE leader_member.course_id = g.course_id
               AND leader_member.group_id = g.id
             ORDER BY leader_member.joined_at, leader_member.id
             LIMIT 1
           )
         END
       LEFT JOIN students leader_student ON leader_student.student_id = leader.student_id
       LEFT JOIN course_group_memberships mine
         ON mine.course_id = g.course_id AND mine.student_id = ?
       LEFT JOIN course_group_applications mine_application
         ON mine_application.course_id = g.course_id
         AND mine_application.group_id = g.id
         AND mine_application.student_id = ?
       WHERE g.course_id = ?
       ORDER BY g.id, gm.joined_at, gm.id`,
      [studentId, studentId, studentId, courseId],
    );

    const groupsById = new Map();
    for (const row of rows) {
      if (!groupsById.has(row.id)) {
        groupsById.set(row.id, {
          id: row.id,
          name: row.name,
          members: [],
          recruitmentEnabled: Boolean(row.recruitmentEnabled),
          recruitmentMessage: row.recruitmentMessage || "",
          isMine: Boolean(row.isMine),
          isLeader: Boolean(row.isLeader),
          leaderId: row.leaderId || null,
          leaderName: row.leaderName || null,
          myApplicationStatus: row.myApplicationStatus || null,
        });
      }
      if (row.memberId !== null) {
        groupsById.get(row.id).members.push({
          id: row.memberId,
          name: row.memberName,
        });
      }
    }
    return [...groupsById.values()];
  },

  async groupBelongsToCourse(courseId, groupId, connection = pool) {
    const [rows] = await connection.execute(
      "SELECT id FROM course_groups WHERE id = ? AND course_id = ?",
      [groupId, courseId],
    );
    return rows.length > 0;
  },

  async isGroupLeader(courseId, groupId, studentId, connection = pool) {
    const [rows] = await connection.execute(
      `SELECT 1
       FROM course_groups g
       WHERE g.course_id = ?
         AND g.id = ?
         AND CASE
           WHEN EXISTS (
             SELECT 1
             FROM course_group_memberships current_leader
             WHERE current_leader.course_id = g.course_id
               AND current_leader.group_id = g.id
               AND current_leader.student_id = g.leader_student_id
           ) THEN g.leader_student_id
           ELSE (
             SELECT first_member.student_id
             FROM course_group_memberships first_member
             WHERE first_member.course_id = g.course_id
               AND first_member.group_id = g.id
             ORDER BY first_member.joined_at, first_member.id
             LIMIT 1
           )
         END = ?
       LIMIT 1`,
      [courseId, groupId, studentId],
    );
    return rows.length > 0;
  },

  async transferLeadership(courseId, groupId, currentLeaderId, newLeaderId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [groups] = await connection.execute(
        "SELECT leader_student_id FROM course_groups WHERE course_id = ? AND id = ? FOR UPDATE",
        [courseId, groupId],
      );
      if (!groups.length) throw new Error("小組不存在");

      const [members] = await connection.execute(
        `SELECT student_id
         FROM course_group_memberships
         WHERE course_id = ? AND group_id = ?
         ORDER BY joined_at, id`,
        [courseId, groupId],
      );
      const leaderId = groups[0].leader_student_id || members[0]?.student_id;
      if (leaderId !== currentLeaderId) {
        throw new Error("只有組長能轉移組長");
      }
      if (!members.some((member) => member.student_id === newLeaderId)) {
        throw new Error("指定的新組長不是此小組成員");
      }
      await connection.execute(
        "UPDATE course_groups SET leader_student_id = ? WHERE course_id = ? AND id = ?",
        [newLeaderId, courseId, groupId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateRecruitment(courseId, groupId, enabled, message) {
    await pool.execute(
      `UPDATE course_groups
       SET recruitment_enabled = ?, recruitment_message = ?
       WHERE course_id = ? AND id = ?`,
      [enabled ? 1 : 0, message || null, courseId, groupId],
    );
  },

  async isGroupRecruiting(courseId, groupId) {
    const [rows] = await pool.execute(
      `SELECT recruitment_enabled AS enabled
       FROM course_groups
       WHERE course_id = ? AND id = ?`,
      [courseId, groupId],
    );
    return rows.length > 0 && Boolean(rows[0].enabled);
  },

  async isGroupMember(courseId, groupId, studentId) {
    const [rows] = await pool.execute(
      `SELECT 1 FROM course_group_memberships
       WHERE course_id = ? AND group_id = ? AND student_id = ?
       LIMIT 1`,
      [courseId, groupId, studentId],
    );
    return rows.length > 0;
  },

  async hasCourseMembership(courseId, studentId) {
    const [rows] = await pool.execute(
      `SELECT 1 FROM course_group_memberships
       WHERE course_id = ? AND student_id = ?
       LIMIT 1`,
      [courseId, studentId],
    );
    return rows.length > 0;
  },

  async getPendingApplications(courseId, groupId) {
    const [rows] = await pool.execute(
      `SELECT
         a.id,
         a.student_id AS studentId,
         COALESCE(s.name, a.student_id) AS studentName,
         a.message,
         a.created_at AS createdAt
       FROM course_group_applications a
       LEFT JOIN students s ON s.student_id = a.student_id
       WHERE a.course_id = ? AND a.group_id = ? AND a.status = 'pending'
       ORDER BY a.created_at, a.id`,
      [courseId, groupId],
    );
    return rows;
  },

  async createApplication(courseId, groupId, studentId, message) {
    try {
      const [rows] = await pool.execute(
        `SELECT status FROM course_group_applications
         WHERE group_id = ? AND student_id = ?`,
        [groupId, studentId],
      );
      if (rows[0]?.status === "pending") {
        const error = new Error("已經送出加入申請");
        error.code = "APPLICATION_ALREADY_EXISTS";
        throw error;
      }
      if (rows.length) {
        await pool.execute(
          `UPDATE course_group_applications
           SET message = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP
           WHERE group_id = ? AND student_id = ?`,
          [message || null, groupId, studentId],
        );
        return;
      }
      await pool.execute(
        `INSERT INTO course_group_applications
           (course_id, group_id, student_id, message, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [courseId, groupId, studentId, message || null],
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        error.code = "APPLICATION_ALREADY_EXISTS";
      }
      throw error;
    }
  },

  async approveApplication(courseId, groupId, applicationId, leaderId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [groupRows] = await connection.execute(
        `SELECT id FROM course_groups
         WHERE course_id = ? AND id = ?
         FOR UPDATE`,
        [courseId, groupId],
      );
      if (!groupRows.length) {
        const error = new Error("小組不存在");
        error.code = "GROUP_NOT_FOUND";
        throw error;
      }
      const [leaderRows] = await connection.execute(
        `SELECT 1
         FROM course_group_memberships leader
         WHERE leader.course_id = ?
           AND leader.group_id = ?
           AND leader.student_id = ?
           AND leader.id = (
             SELECT first_member.id
             FROM course_group_memberships first_member
             WHERE first_member.course_id = ?
               AND first_member.group_id = ?
             ORDER BY first_member.joined_at, first_member.id
             LIMIT 1
           )
         LIMIT 1`,
        [courseId, groupId, leaderId, courseId, groupId],
      );
      if (!leaderRows.length) {
        const error = new Error("只有組長能處理加入申請");
        error.code = "NOT_GROUP_LEADER";
        throw error;
      }
      const [applications] = await connection.execute(
        `SELECT id, student_id
         FROM course_group_applications
         WHERE id = ? AND course_id = ? AND group_id = ? AND status = 'pending'
         FOR UPDATE`,
        [applicationId, courseId, groupId],
      );
      if (!applications.length) {
        const error = new Error("找不到待處理的加入申請");
        error.code = "APPLICATION_NOT_FOUND";
        throw error;
      }
      const applicantId = applications[0].student_id;
      const [existingMemberships] = await connection.execute(
        `SELECT group_id FROM course_group_memberships
         WHERE course_id = ? AND student_id = ?
         FOR UPDATE`,
        [courseId, applicantId],
      );
      if (existingMemberships.some((membership) => Number(membership.group_id) !== Number(groupId))) {
        const error = new Error("申請人已加入其他小組，請先退出原小組再重新處理申請");
        error.code = "APPLICANT_IN_OTHER_GROUP";
        throw error;
      }
      if (!existingMemberships.length) {
        await connection.execute(
          `INSERT INTO course_group_memberships (course_id, group_id, student_id)
           VALUES (?, ?, ?)`,
          [courseId, groupId, applicantId],
        );
      }
      await connection.execute(
        `UPDATE course_group_applications
         SET status = 'accepted'
         WHERE id = ?`,
        [applicationId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async joinEmptyGroup(courseId, groupId, studentId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [groups] = await connection.execute(
        "SELECT id FROM course_groups WHERE course_id = ? AND id = ? FOR UPDATE",
        [courseId, groupId],
      );
      if (!groups.length) throw new Error("小組不存在");
      const [members] = await connection.execute(
        "SELECT id FROM course_group_memberships WHERE course_id = ? AND group_id = ? LIMIT 1",
        [courseId, groupId],
      );
      if (members.length) throw new Error("此小組已有人加入，請遞交加入申請");
      await connection.execute(
        `INSERT INTO course_group_memberships (course_id, group_id, student_id)
         VALUES (?, ?, ?)`,
        [courseId, groupId, studentId],
      );
      await connection.execute(
        `UPDATE course_groups
         SET leader_student_id = ?
         WHERE course_id = ? AND id = ?`,
        [studentId, courseId, groupId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async createGroup(courseId, name, studentId = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      let result;
      try {
        [result] = await connection.execute(
          "INSERT INTO course_groups (course_id, name, leader_student_id) VALUES (?, ?, ?)",
          [courseId, name, studentId],
        );
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          error.code = "GROUP_NAME_TAKEN";
        }
        throw error;
      }
      if (studentId) {
        await connection.execute(
          `INSERT INTO course_group_memberships (course_id, group_id, student_id)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             group_id = VALUES(group_id),
             joined_at = CURRENT_TIMESTAMP`,
          [courseId, result.insertId, studentId],
        );
      }
      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async createGroups(courseId, count) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute(
        "SELECT name FROM course_groups WHERE course_id = ?",
        [courseId],
      );
      const existingNames = new Set(rows.map((row) => row.name));
      const groups = [];
      let number = 1;
      while (groups.length < count) {
        const name = `第${number}組`;
        number += 1;
        if (existingNames.has(name)) continue;
        const [result] = await connection.execute(
          "INSERT INTO course_groups (course_id, name) VALUES (?, ?)",
          [courseId, name],
        );
        existingNames.add(name);
        groups.push({ id: result.insertId, name });
      }
      await connection.commit();
      return groups;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async deleteGroup(courseId, groupId) {
    const [result] = await pool.execute(
      "DELETE FROM course_groups WHERE course_id = ? AND id = ?",
      [courseId, groupId],
    );
    return result.affectedRows > 0;
  },

  async leaveGroup(courseId, groupId, studentId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [groups] = await connection.execute(
        "SELECT leader_student_id FROM course_groups WHERE course_id = ? AND id = ? FOR UPDATE",
        [courseId, groupId],
      );
      if (!groups.length) {
        await connection.rollback();
        return false;
      }

      const [members] = await connection.execute(
        `SELECT id, student_id
         FROM course_group_memberships
         WHERE course_id = ? AND group_id = ?
         ORDER BY joined_at, id`,
        [courseId, groupId],
      );
      const member = members.find((row) => row.student_id === studentId);
      if (!member) {
        await connection.rollback();
        return false;
      }

      const leaderId = groups[0].leader_student_id || members[0]?.student_id;
      const remainingMembers = members.filter((row) => row.student_id !== studentId);
      if (leaderId === studentId) {
        await connection.execute(
          "UPDATE course_groups SET leader_student_id = ? WHERE course_id = ? AND id = ?",
          [remainingMembers[0]?.student_id || null, courseId, groupId],
        );
      }
      await connection.execute(
        "DELETE FROM course_group_memberships WHERE id = ?",
        [member.id],
      );
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getGroupHomeworks(courseCode, courseId, groupId) {
    const [rows] = await pool.execute(
      `SELECT
         h.id,
         h.title,
         h.deadline,
         EXISTS (
           SELECT 1
           FROM homework_submissions hs
           JOIN course_group_memberships gm
             ON gm.student_id = hs.student_id
           WHERE hs.homework_id = h.id
             AND hs.is_submitted = 1
             AND gm.course_id = ?
             AND gm.group_id = ?
         ) AS isSubmitted,
         (
           SELECT hs.score
           FROM homework_submissions hs
           JOIN course_group_memberships gm
             ON gm.student_id = hs.student_id
           WHERE hs.homework_id = h.id
             AND hs.is_submitted = 1
             AND hs.score IS NOT NULL
             AND gm.course_id = ?
             AND gm.group_id = ?
           ORDER BY hs.graded_at DESC, hs.submitted_at DESC
           LIMIT 1
         ) AS score
       FROM homeworks h
       WHERE h.course_id = ? AND h.is_group_homework = 1
       ORDER BY h.deadline IS NULL, h.deadline, h.id`,
      [courseId, groupId, courseId, groupId, courseCode],
    );
    return rows.map((homework) => ({
      ...homework,
      isSubmitted: Boolean(homework.isSubmitted),
    }));
  },
};
