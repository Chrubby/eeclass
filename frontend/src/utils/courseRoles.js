import api from "@/api/client.js";
import { setCourseRoles } from "@/utils/auth.js";

/** 重新取得「我在每門課的身分」。權限仍由後端把關，這份資料只決定畫面顯示。 */
export async function refreshCourseRoles() {
  try {
    const { data } = await api.get("/api/courses/user");
    setCourseRoles(Object.fromEntries(data.map((course) => [course.course_code, course.my_role])));
  } catch {
    setCourseRoles({});
  }
}
