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
            信箱 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="mail"
            type="email"
            placeholder="name@example.com"
            required
            maxlength="100"
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

        <p class="text-gray-500 text-[13px] -mt-1">
          此頁僅供學生註冊；教師與管理員帳號請由系統管理員建立。
        </p>

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
import api from "@/api/client.js"

const account = ref("")
const name = ref("")
const mail = ref("")
const password = ref("")
const confirmPassword = ref("")

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const router = useRouter()

const register = async () => {
  if (password.value !== confirmPassword.value) {
    alert("兩次輸入的密碼不相符，請重新確認！")
    return
  }
  const userData = {
    username: account.value.trim(),
    password: password.value,
    confirmPassword: confirmPassword.value,
    name: name.value.trim(),
    email: mail.value.trim(),
  }

  try {
    const { data } = await api.post("/api/auth/register", userData)

    if (data.message) {
      alert(data.message)
      router.push("/login")
    }
  } catch (error) {
    const msg = error.response?.data?.message || "連線失敗"
    alert(`註冊失敗：${msg}`)
    console.error("註冊錯誤:", error.response?.data || error)
  }
}
</script>
