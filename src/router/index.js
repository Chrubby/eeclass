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
    { path: '/course/:id', name: 'Course', component: Course,  // :id 代表課程代碼 
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
          path: 'homework',
          name: 'CourseHomework',
          component: () => import('../views/course/Homework.vue')
        },
        {
          path: 'homework/create',
          name: 'HomeworkCreate',
          component: () => import('../views/course/teacher/HomeworkCreate.vue')
        },
        {
          path: 'homework/:hwId',
          name: 'HomeworkDetail',
          component: async () => {
            // Test
            const role = localStorage.getItem('userRole') || 'teacher'

            if (role === 'teacher') {
              return (await import('../views/course/teacher/HomeworkTeacher.vue')).default
            }

            return (await import('../views/course/student/HomeworkStudent.vue')).default
          }
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

export default router
