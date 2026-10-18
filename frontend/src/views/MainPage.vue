<template>
  <div class="min-h-screen bg-gray-50 text-gray-800 font-sans">
    <header class="bg-white flex justify-between items-center px-6 py-3 border-b text-sm h-12">
      <router-link to ="/" class="font-bold text-base p-1 border-2 border-transparent focus:border-black rounded ">國立中央大學 「LMS 計畫」</router-link>
    </header>
    <div class="flex justify-start items-start mt-10 ml-10 gap-8">
<div class="w-full max-w-[300px] p-4 bg-white border border-gray-200 rounded-xl shadow-lg">
        
        <!-- 已登入 (isLoggedIn 為 true) -->
        <template v-if="isLoggedIn">
          <h2 class="text-2xl font-bold text-gray-800 mb-6">歡迎, {{ user.name || '使用者' }}</h2>
          <hr class="my-6 border-t-4 border-blue-500" />
          <div class="flex flex-col gap-4 py-4">
            <button
              type="button"
              @click="enterCourse"
              class="w-full bg-[#337ab7] text-white py-2.5 rounded text-lg tracking-widest hover:bg-[#285e8e] transition-colors shadow-sm"
            >
              進入課程
            </button>
            <button
              type="button"
              @click="logout"
              class="w-full bg-gray-200 text-gray-700 py-2 rounded text-base hover:bg-gray-300 transition-colors"
            >
              登出
            </button>
          </div>
        </template>

        <!-- 未登入 (isLoggedIn 為 false) -->
        <template v-else>
          <h2 class="text-2xl font-bold text-gray-800 mb-6">登入log in</h2>
          <hr class="my-6 border-t-4 border-blue-500" />
          <div class="w-full max-w-sm px-[10px]">
            <form @submit.prevent="login" class="flex flex-col gap-6">
              <div>
                <input
                v-model="email"
                type="text" placeholder="帳號" required
                class="w-full bg-[#eef3fe] border-b-[3px] border-gray-300 px-4 py-3 text-lg text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#e4ebf9] transition-colors"
                />
              </div>

              <div class="relative">
                <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Password"
                    required
                    class="w-full bg-[#eef3fe] border-b-[3px] border-gray-300 px-4 py-3 pr-12 text-lg text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#e4ebf9] transition-colors"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-700 hover:text-black cursor-pointer"
                >
                  <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.52-3.32m2.46-2.46A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.52 3.32m-2.46 2.46A9.97 9.97 0 0112 19zM15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" />
                  </svg>
                </button>
              </div>

              <div class="flex items-center -mt-2">
                <input
                  id="remember"
                  v-model="rememberMe"
                  type="checkbox"
                  class="w-4 h-4 border-gray-400 rounded cursor-pointer"
                />
                <label for="remember" class="ml-2 text-gray-600 text-[15px] cursor-pointer select-none">
                  保持登入狀態
                </label>
              </div>

              <button
              type="submit"
              class="w-full bg-[#337ab7] text-white py-2.5 rounded text-lg tracking-widest hover:bg-[#285e8e] transition-colors"
              >
                登入
              </button>
            </form>

            <div class="mt-4 text-center flex justify-center gap-2 text-[15px]">
              <router-link to="/forgot-password" class="text-[#337ab7] hover:text-[#285e8e]">
                忘記密碼
              </router-link>
            </div>
          </div>
        </template>
      </div>
      <div class="w-full max-w-[840px] p-4 bg-white border border-gray-200 rounded-xl shadow-lg">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">最新公告</h2>
        <hr class="my-6 border-t-4 border-blue-500" />
        <a> - 等待更新 - </a>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted } from "vue"
import api from "@/api/client.js"
import { setAccessToken, setMustChangePassword } from "@/utils/auth.js"

const email = ref("")
const password = ref("")
const showPassword = ref(false)
const rememberMe = ref(false)
const isLoggedIn = ref(false)

const user = ref({
  name: '',
  user_id: '',
  role: '',
})


const loadUser = async () => {
  const stored = localStorage.getItem("user")
  // 未登入時留在首頁，由首頁的登入表單處理
  if (!stored) return

  user.value.user_id = stored

  try {
    const res = await api.get('/api/auth/me')
    user.value.role = res.data.role
  } catch (err) {
    console.error('取得使用者資訊失敗', err)
  }
}

// 檢查Token是否存在
const checkLoginStatus = () => {
  // 檢查 localStorage (保持登入) 或 sessionStorage (一般登入)
  const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || localStorage.getItem("token")
  isLoggedIn.value = !!token
}

const login = async () => {
  try {
    const { data } = await api.post("/api/auth/login", {
      username: email.value,
      password: password.value,
    })

    alert(data.message)

    setAccessToken(data.token)
    localStorage.setItem("user", data.username)
    setMustChangePassword(Boolean(data.mustChangePassword))

    if (data.mustChangePassword) {
      window.location.href = '/change-password'
    } else {
      window.location.href = data.role === 'admin' ? '/admin/accounts' : '/dashboard'
    }
  } catch (error) {
    const msg = error.response?.data?.message || "連線失敗"
    alert(msg)
    console.error("錯誤詳細資訊:", error)
  }
}

// 進入課程按鈕
const enterCourse = () => {
  window.location.href = '/dashboard'
}

const logout = () => {
  localStorage.clear()
  window.location.href = '/'
  isLoggedIn.value = false
  email.value = ""
  password.value = ""
}

onMounted(() => {
  loadUser()
  checkLoginStatus()
})
</script>