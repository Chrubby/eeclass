import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Course from '../views/Course.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/course/:id', name: 'Course', component: Course } // :id 代表課程代碼
  ]
})

export default router
