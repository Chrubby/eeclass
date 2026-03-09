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
    { path: '/course/:id', name: 'Course', component: Course }, // :id 代表課程代碼
    { path: "/login", name: 'Login', component: Login },
    { path: "/register", name: 'Register', component: Register }
  ]
})

export default router
