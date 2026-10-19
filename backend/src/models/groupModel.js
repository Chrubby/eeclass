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

  async getCourseMaxMembers(courseId) {
    const [rows] = await pool.execute(
      "SELECT group_max_members AS maxMembers FROM courses WHERE id = ?",
      [courseId],
    );
    return Number(rows[0]?.maxMembers ?? 4);
  },

  async setCourseMaxMembers(courseId, maxMembers) {
    await pool.execute(
      "UPDATE courses SET group_max_members = ? WHERE id = ?",
      [maxMembers, courseId],
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

  async isCourseStaff(courseId, username, role) {
    const sql = role === "teacher"
      ? `SELECT 1 FROM teacher_courses tc
         JOIN teachers t ON t.id = tc.teacher_id
         WHERE tc.course_id = ? AND t.teacher_id = ? LIMIT 1`
      : `SELECT 1 FROM enrollments e
         JOIN students s ON s.id = e.student_id
         WHERE e.course_id = ? AND s.student_id = ? AND e.role = 'ta' LIMIT 1`;
    const [rows] = await pool.execute(sql, [courseId, username]);
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
       JOIN courses c ON c.id = g.course_id
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
         ON mine.course_id = g.course_id
         AND mine.group_id = g.id
         AND mine.student_id = ?
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

  async getGroupDiscussionPosts(groupId) {
    const [groups] = await pool.execute(
      "SELECT name FROM course_groups WHERE id = ?",
      [groupId],
    );
    const [rows] = await pool.execute(
      `SELECT p.id, p.group_id AS groupId, p.student_id AS studentId,
              p.parent_post_id AS parentPostId, p.content, p.created_at AS createdAt,
              COALESCE(s.name, t.name, a.username, p.student_id) AS authorName
       FROM course_group_discussion_posts p
       LEFT JOIN students s ON s.student_id = p.student_id
       LEFT JOIN teachers t ON t.teacher_id = p.student_id
       LEFT JOIN accounts a ON a.username = p.student_id
       WHERE p.group_id = ?
       ORDER BY p.created_at, p.id`,
      [groupId],
    );
    return { groupName: groups[0]?.name || `小組 ${groupId}`, posts: rows };
  },

  async createGroupDiscussionPost(groupId, studentId, parentPostId, content) {
    if (parentPostId !== null && parentPostId !== undefined) {
      const [parents] = await pool.execute(
        "SELECT id FROM course_group_discussion_posts WHERE id = ? AND group_id = ?",
        [parentPostId, groupId],
      );
      if (!parents.length) throw new Error("找不到此小組的討論留言");
    }
    const [result] = await pool.execute(
      `INSERT INTO course_group_discussion_posts
         (group_id, student_id, parent_post_id, content)
       VALUES (?, ?, ?, ?)`,
      [groupId, studentId, parentPostId || null, content],
    );
    return result.insertId;
  },

  async deleteGroupDiscussionPost(groupId, postId, studentId, isStaff) {
    const [result] = await pool.execute(
      `DELETE FROM course_group_discussion_posts
       WHERE group_id = ? AND id = ? AND (? = 1 OR student_id = ?)`,
      [groupId, postId, isStaff ? 1 : 0, studentId],
    );
    return result.affectedRows > 0;
  },

  async getGroupHomeworks(courseCode, courseId, groupIds) {
    if (!groupIds.length) return [];
    const placeholders = groupIds.map(() => "?").join(", ");
    const [rows] = await pool.execute(
      `SELECT h.id, h.title, h.deadline,
              g.id AS groupId, g.name AS groupName,
              hs.id AS submissionId,
              COALESCE(hs.is_submitted, 0) AS isSubmitted,
              hs.score, hs.feedback
       FROM homeworks h
       JOIN course_groups g ON g.course_id = ?
       LEFT JOIN homework_submissions hs
         ON hs.homework_id = h.id
         AND hs.group_id = g.id
         AND hs.is_submitted = 1
       WHERE h.course_id = ?
         AND h.is_group_homework = 1
         AND g.id IN (${placeholders})
       ORDER BY h.deadline IS NULL, h.deadline, h.id, g.name`,
      [courseId, courseCode, ...groupIds],
    );
    return rows.map((row) => ({
      ...row,
      isSubmitted: Boolean(row.isSubmitted),
    }));
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

  async isGroupAtCapacity(courseId, groupId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) >= c.group_max_members AS isFull
       FROM course_groups g
       JOIN courses c ON c.id = g.course_id
       LEFT JOIN course_group_memberships gm
         ON gm.course_id = g.course_id AND gm.group_id = g.id
       WHERE g.course_id = ? AND g.id = ?
       GROUP BY g.id, c.group_max_members`,
      [courseId, groupId],
    );
    return rows.length > 0 && Boolean(rows[0].isFull);
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

  async getPendingApplications(courseId, groupId) {
    const [rows] = await pool.execute(
      `SELECT
         a.id,
         a.student_id AS studentId,
         COALESCE(s.name, a.student_id) AS studentName,
         a.message,
         a.created_at AS createdAt,
         other_group.name AS otherGroupName
       FROM course_group_applications a
       LEFT JOIN students s ON s.student_id = a.student_id
       LEFT JOIN course_group_memberships other_membership
         ON other_membership.course_id = a.course_id
         AND other_membership.student_id = a.student_id
         AND other_membership.group_id <> a.group_id
       LEFT JOIN course_groups other_group
         ON other_group.id = other_membership.group_id
         AND other_group.course_id = other_membership.course_id
       WHERE a.course_id = ? AND a.group_id = ? AND a.status = 'pending'
       ORDER BY a.created_at, a.id`,
      [courseId, groupId],
    );
    const applications = new Map();
    for (const row of rows) {
      if (!applications.has(row.id)) {
        applications.set(row.id, {
          id: row.id,
          studentId: row.studentId,
          studentName: row.studentName,
          message: row.message,
          createdAt: row.createdAt,
          otherGroups: [],
        });
      }
      if (row.otherGroupName && !applications.get(row.id).otherGroups.includes(row.otherGroupName)) {
        applications.get(row.id).otherGroups.push(row.otherGroupName);
      }
    }
    return [...applications.values()];
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

  async approveApplication(courseId, groupId, applicationId, leaderId, confirmMultipleGroups = false) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [groupRows] = await connection.execute(
        `SELECT g.id, c.group_max_members AS maxMembers
         FROM course_groups g
         JOIN courses c ON c.id = g.course_id
         WHERE g.course_id = ? AND g.id = ?
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
        [courseId, groupId, leaderId],
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
        `SELECT gm.group_id, g.name AS groupName
         FROM course_group_memberships gm
         JOIN course_groups g ON g.id = gm.group_id AND g.course_id = gm.course_id
         WHERE gm.course_id = ? AND gm.student_id = ?
         FOR UPDATE`,
        [courseId, applicantId],
      );
      const otherGroups = existingMemberships
        .filter((membership) => Number(membership.group_id) !== Number(groupId))
        .map((membership) => membership.groupName);
      if (otherGroups.length && !confirmMultipleGroups) {
        const error = new Error("申請人已加入其他小組");
        error.code = "APPLICANT_HAS_OTHER_GROUPS";
        error.otherGroups = otherGroups;
        throw error;
      }
      if (!existingMemberships.some((membership) => Number(membership.group_id) === Number(groupId))) {
        const [memberCountRows] = await connection.execute(
          `SELECT COUNT(*) AS memberCount
           FROM course_group_memberships
           WHERE course_id = ? AND group_id = ?`,
          [courseId, groupId],
        );
        if (Number(memberCountRows[0].memberCount) >= Number(groupRows[0].maxMembers)) {
          const error = new Error("小組人數已達上限");
          error.code = "GROUP_AT_CAPACITY";
          throw error;
        }
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

  async withdrawApplication(courseId, groupId, studentId) {
    const [result] = await pool.execute(
      `DELETE FROM course_group_applications
       WHERE course_id = ? AND group_id = ? AND student_id = ? AND status = 'pending'`,
      [courseId, groupId, studentId],
    );
    return result.affectedRows > 0;
  },

  async deleteApplication(courseId, groupId, applicationId) {
    const [result] = await pool.execute(
      `DELETE FROM course_group_applications
       WHERE course_id = ? AND group_id = ? AND id = ? AND status = 'pending'`,
      [courseId, groupId, applicationId],
    );
    return result.affectedRows > 0;
  },

  async joinEmptyGroup(courseId, groupId, studentId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [groups] = await connection.execute(
        `SELECT g.id, c.group_max_members AS maxMembers
         FROM course_groups g
         JOIN courses c ON c.id = g.course_id
         WHERE g.course_id = ? AND g.id = ?
         FOR UPDATE`,
        [courseId, groupId],
      );
      if (!groups.length) throw new Error("小組不存在");
      const [members] = await connection.execute(
        "SELECT COUNT(*) AS memberCount FROM course_group_memberships WHERE course_id = ? AND group_id = ?",
        [courseId, groupId],
      );
      if (Number(members[0].memberCount) > 0) throw new Error("此小組已有人加入，請遞交加入申請");
      if (Number(members[0].memberCount) >= Number(groups[0].maxMembers)) {
        const error = new Error("小組人數已達上限");
        error.code = "GROUP_AT_CAPACITY";
        throw error;
      }
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

};
