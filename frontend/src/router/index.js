import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Course from '../views/Course.vue'
import Login from "../views/Login.vue"
import Register from "../views/Register.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/login" },
    { path: '/dashboard', name: 'Home', component: Home },
    { path: '/course/:id', name: 'Course', component: Course,
      children: [
        {
          path: '',
          name: 'CourseAnnouncement',
          component: () => import('../views/course/Announcement.vue')
        },
        {
          path: 'material',
          name: 'CourseMaterial',
          component: () => import('../views/course/Material.vue')
        },
        {
          path: 'discussion',
          name: 'CourseDiscussion',
          component: () => import('../views/course/Discussion.vue')
        },
        {
          path: 'discussion/:discussionId',
          name: 'DiscussionDetail',
          component: () => import('../views/course/DiscussionDetail.vue')
        },
        {
          path: 'homework',
          name: 'CourseHomework',
          component: () => import('../views/course/Homework.vue')
        },
        {
          path: 'homework/create',
          name: 'HomeworkCreate',
          component: () => import('../views/course/teacher/HomeworkCreate.vue'),
          meta: { requiresTeacher: true }
        },
        {
          path: 'homework/:hwId',
          name: 'HomeworkDetail',
          component: async () => {
            const role = localStorage.getItem('userRole') || 'student'

            if (role === 'teacher') {
              return (await import('../views/course/teacher/HomeworkTeacher.vue')).default
            }

            return (await import('../views/course/student/HomeworkStudent.vue')).default
          }
        },
        {
          path: 'homework/:hwId/grade/:submissionId',
          name: 'HomeworkGrade',
          component: () => import('../views/course/teacher/HomeworkGrade.vue'),
          meta: { requiresTeacher: true }
        },
        {
          path: 'exam',
          name: 'CourseExam',
          component: () => import('../views/course/Exam.vue')
        },
        {
          path: 'grade',
          name: 'CourseGrade',
          component: () => import('../views/course/Grade.vue')
        }
      ]
    },
    { path: "/login", name: 'Login', component: Login },
    { path: "/register", name: 'Register', component: Register }
  ]
})

router.beforeEach((to, from) => {
  const userRole = localStorage.getItem('userRole') || 'student'

  if (to.meta.requiresTeacher && userRole !== 'teacher') {
    alert('無法訪問此頁面。')
    return false
  }

})

export default router
