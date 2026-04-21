import { pool } from "../config/db.js";
import { AnnouncementModel } from "../models/announcementModel.js";
import { CourseModel } from "../models/courseModel.js";
import { AuthModel } from "../models/authModel.js";

export const AnnouncementService = {
  async getAnnouncements(courseCode, studentIdentifier) {
    const course = await CourseModel.findCourseByCode(courseCode);
    if (!course) throw new Error("找不到課程");

    let studentDbId = null;
    if (studentIdentifier) {
      const student = await AuthModel.getStudentById(studentIdentifier);
      if (student) studentDbId = student.id;
    }

    let rows;
    if (studentDbId) {
      rows = await AnnouncementModel.getForStudent(course.id, studentDbId);
    } else {
      rows = await AnnouncementModel.getForCourse(course.id);
    }

    // 轉換資料格式，加上 isNew 屬性
    const announcements = rows.map((item) => ({ ...item, isNew: !item.is_read }));

    return { 
      course_code: courseCode, 
      course_id: course.id, 
      student_id: studentDbId, 
      announcements 
    };
  },

  async markAsRead(studentIdentifier, announcementId) {
    const student = await AuthModel.getStudentById(studentIdentifier);
    if (!student) throw new Error("找不到學生");

    await AnnouncementModel.markAsRead(student.id, announcementId);
  },

  async createAnnouncement(courseCode, teacherIdentifier, title, content, isPinned) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const course = await CourseModel.findCourseByCode(courseCode, connection);
      if (!course) throw new Error("找不到課程");

      let finalTeacherId;
      const teacher = await AuthModel.getTeacherById(teacherIdentifier);

      // 如果發文者是老師，直接用老師的 ID
      if (teacher) {
        finalTeacherId = teacher.id;
      } else {
        // 如果發文者是助教(在 teachers 表找不到)，則代入這門課主負責老師的 ID
        const courseTeachers = await CourseModel.getCourseTeachers(course.id, connection);
        if (courseTeachers.length > 0) {
          finalTeacherId = courseTeachers[0].id; 
        } else {
          throw new Error("找不到這門課的授課老師，因此助教無法代發公告");
        }
      }

      await AnnouncementModel.create(course.id, finalTeacherId, title, content, isPinned, connection);
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};