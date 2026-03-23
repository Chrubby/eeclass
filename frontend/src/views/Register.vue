<template>
  <div class="flex justify-center mt-10 mb-16">
    <div class="w-full max-w-md px-4">
      <form @submit.prevent="register" class="flex flex-col gap-4">

        <div>
          <label class="block text-gray-800 mb-1.5 text-[15px]">
            帳號 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="account"
            type="text"
            placeholder="帳號"
            required
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
          />
        </div>

        <div>
          <label class="block text-gray-800 mb-1.5 text-[15px]">
            姓名 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="name"
            type="text"
            placeholder="姓名"
            required
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
          />
        </div>

        <div>
          <label class="block text-gray-800 mb-1.5 text-[15px]">
            密碼 <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="密碼長度至少8個字元"
              required
              class="w-full bg-white border border-gray-300 rounded px-3 py-2 pr-10 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
            />
            <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-700 hover:text-black cursor-pointer">
              <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.52-3.32m2.46-2.46A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.52 3.32m-2.46 2.46A9.97 9.97 0 0112 19zM15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" /></svg>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-gray-800 mb-1.5 text-[15px]">
            密碼確認
          </label>
          <div class="relative">
            <input
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="密碼確認"
              required
              class="w-full bg-white border border-gray-300 rounded px-3 py-2 pr-10 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
            />
            <button type="button" @click="showConfirmPassword = !showConfirmPassword" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-700 hover:text-black cursor-pointer">
              <svg v-if="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.52-3.32m2.46-2.46A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.52 3.32m-2.46 2.46A9.97 9.97 0 0112 19zM15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" /></svg>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-gray-800 mb-1.5 text-[15px]">
            信箱 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="email"
            type="email"
            placeholder=""
            required
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
          />
        </div>

        <div>
          <label class="block text-gray-800 mb-1.5 text-[15px]">
            身份 <span class="text-red-500">*</span>
          </label>
          <select
            v-model="role"
            required
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%234A5568%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_12px_center] bg-no-repeat"
          >
            <option value="student">學生</option>
            <option value="teacher">老師</option>
          </select>
        </div>
<!--
        <div class="flex flex-col gap-1 mt-1">
          <div class="flex items-center gap-2">
            <div class="h-[38px] w-[110px] bg-gray-200 border border-gray-300 flex items-center justify-center bg-cover bg-center opacity-80" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMTAiIGhlaWdodD0iMzgiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlNWU3ZWIiLz48dGV4dCB4PSI1NSIgeT0iMjYiIGZvbnQtc2l6ZT0iMjIiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmaWxsPSIjMWUzYThhIiBsZXR0ZXItc3BhY2luZz0iMnB4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5iMzNtPC90ZXh0Pjwvc3ZnPg==');">
            </div> -->

            <!-- <button type="button" class="text-[#337ab7] hover:text-[#285e8e] cursor-pointer p-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button> -->

            <!-- <input
              v-model="captcha"
              type="text"
              placeholder="驗證碼"
              required
              class="w-28 bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
            /> -->
          <!-- </div>
          <span class="text-gray-500 text-xs mt-0.5">區分大小寫</span> -->
        <!-- </div> -->

        <div class="flex justify-center mt-3">
          <button
            type="submit"
            class="bg-[#337ab7] text-white px-8 py-2.5 rounded text-[16px] tracking-widest hover:bg-[#285e8e] transition-colors"
          >
            註冊
          </button>
        </div>
      </form>

      <div class="mt-6 text-center text-[15px] text-gray-700">
        已經有帳號？
        <router-link to="/login" class="text-[#337ab7] hover:text-[#285e8e]">
          登入
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

const account = ref("")
const name = ref("")
const password = ref("")
const confirmPassword = ref("")
const email = ref("")
const role = ref("student")
const agreeTerms = ref(false)
const captcha = ref("")

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const router = useRouter()
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000"

const register = async () => {
  if (password.value !== confirmPassword.value) {
    alert("兩次輸入的密碼不相符，請重新確認！")
    return
  }
  const userData = {
    username: account.value,
    password: password.value,
    name: name.value,
    email: email.value,
    role: role.value
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })

    const result = await response.json()

    if (response.ok) {
      alert(result.message)
      router.push("/login")
    } else {
      alert(result.message)
    }

  } catch (error) {
    alert("連線失敗")
    console.error( error)
  }
}
</script>
