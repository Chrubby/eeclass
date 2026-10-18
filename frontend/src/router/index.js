import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Course from '../views/Course.vue'
import ForgotPassword from "../views/ForgotPassword.vue"
import ResetPassword from "../views/ResetPassword.vue"
import ChangePassword from "../views/ChangePassword.vue"
import Profile from "../views/Profile.vue"
import MainPage from '../views/MainPage.vue'
import { getRoleFromToken, getAccountRole, hasCourseRoles, getAccessToken, getMustChangePassword } from '@/utils/auth.js'
import { refreshCourseRoles } from '@/utils/courseRoles.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'MainPage', component: MainPage},
    { path: '/dashboard', name: 'Home', component: Home },
    {
      path: '/admin/accounts',
      name: 'AdminAccounts',
      component: () => import('../views/admin/AccountManage.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/admin/courses',
      name: 'AdminCourses',
      component: () => import('../views/admin/CourseList.vue'),
      meta: { requiresAdmin: true }
    },
    { path: '/profile', name: 'Profile', component: Profile },
    { path: '/change-password', name: 'ChangePassword', component: ChangePassword },
    { path: '/course/:id', name: 'Course', component: Course,
      children: [
        {
          path: '',
          name: 'CourseAnnouncement',
          component: () => import('../views/course/Announcement.vue')
        },
        {
          path: 'studentlist',
          name: 'StudentList',
          component: () => import('../views/course/StudentList.vue'),
          meta: { allowRoles: ['admin', 'teacher', 'ta'] }
        },
        {
          path: 'material',
          name: 'CourseMaterial',
          component: () => import('../views/course/Material.vue')
        },
        {
          path: 'aiquiz',
          name: 'AIQuiz',
          component: () => import('../views/course/AIQuiz.vue')
        },
        {
          path: 'aiquiz/create',
          name: 'AIQuizCreate',
          component: () => import('../views/course/teacher/AIQuizCreate.vue'),
          meta: { requiresTeacher: true }
        },
        {
          path: 'aiquiz/:quizId',
          name: 'AIQuizDetail',
          component: () => import('../views/course/AIQuizDetail.vue')
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
          path: 'group',
          name: 'CourseGroup',
          component: () => import('../views/course/Group.vue')
        },
        {
          path: 'homework/create',
          name: 'HomeworkCreate',
          component: () => import('../views/course/teacher/HomeworkCreate.vue'),
          meta: { requiresTeacher: true }
        },
        {
          path: 'homework/:hwId/edit',
          name: 'HomeworkEdit',
          component: () => import('../views/course/teacher/HomeworkEdit.vue'),
          meta: { requiresTeacher: true }
        },
        {
          path: 'homework/:hwId',
          name: 'HomeworkDetail',
          component: async () => {
            const role = getRoleFromToken()

            if (role === 'teacher' || role === 'ta') {
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
    // 登入表單在首頁，舊的 /login 網址導回首頁
    { path: "/login", redirect: "/" },
    { path: "/forgot-password", name: 'ForgotPassword', component: ForgotPassword },
    { path: "/reset-password", name: 'ResetPassword', component: ResetPassword }
  ]
})

const staffRoles = ['teacher', 'ta']

const publicPaths = new Set(['/', '/forgot-password', '/reset-password'])
const mustChangeAllowedPaths = new Set(['/change-password', '/', '/profile'])

router.beforeEach(async (to, from) => {
  const token = getAccessToken()
  const mustChange = getMustChangePassword()

  if (token && mustChange && !mustChangeAllowedPaths.has(to.path)) {
    return '/change-password'
  }

  if (!token && !publicPaths.has(to.path) && to.path !== '/change-password') {
    return '/'
  }

  // 助教是課程層級身分：第一次載入、或進到另一門課時，先問後端我在各課的身分
  const courseCode = to.params.id
  if (token && courseCode && getAccountRole() === 'student' && (!hasCourseRoles() || from.params.id !== courseCode)) {
    await refreshCourseRoles()
  }
  const userRole = getRoleFromToken(courseCode)

  // admins manage courses through the student list only; the other course pages assume a teacher or student
  if (token && userRole === 'admin') {
    if (to.path === '/dashboard') return '/admin/accounts'
    if (to.path.startsWith('/course/') && to.name !== 'StudentList') {
      return { name: 'StudentList', params: { id: to.params.id } }
    }
  }

  if (to.meta.requiresTeacher && !staffRoles.includes(userRole)) {
    alert('無法訪問此頁面。')
    return false
  }

  if (to.meta.requiresAdmin && userRole !== 'admin') {
    alert('無法訪問此頁面。')
    return false
  }

  if (to.meta.allowRoles && !to.meta.allowRoles.includes(userRole)) {
    alert('無法訪問此頁面。')
    return false
  }
})

export default router
