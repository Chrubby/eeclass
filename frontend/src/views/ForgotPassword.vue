<template>
  <div class="flex justify-center mt-20">
    <div class="w-full max-w-sm px-4">
      <h1 class="text-xl font-bold text-gray-800 mb-6 text-center">忘記密碼</h1>
      <p class="text-sm text-gray-600 mb-4">
        請輸入<strong>帳號</strong>與教師提供的<strong>重設密碼代碼</strong>，並設定新密碼。
      </p>
      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <input
          v-model="username"
          type="text"
          placeholder="帳號"
          required
          class="w-full bg-[#eef3fe] border-b-[3px] border-gray-300 px-4 py-3 text-lg text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#e4ebf9] transition-colors"
        />
        <input
          v-model="recoveryCode"
          type="password"
          placeholder="重設密碼代碼"
          required
          class="w-full bg-[#eef3fe] border-b-[3px] border-gray-300 px-4 py-3 text-lg text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#e4ebf9] transition-colors"
        />
        <input
          v-model="password"
          type="password"
          placeholder="新密碼（至少 8 字元）"
          required
          minlength="8"
          class="w-full bg-[#eef3fe] border-b-[3px] border-gray-300 px-4 py-3 text-lg text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#e4ebf9] transition-colors"
        />
        <input
          v-model="confirmPassword"
          type="password"
          placeholder="確認新密碼"
          required
          class="w-full bg-[#eef3fe] border-b-[3px] border-gray-300 px-4 py-3 text-lg text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#e4ebf9] transition-colors"
        />
        <button
          type="submit"
          class="w-full bg-[#337ab7] text-white py-2.5 rounded text-lg tracking-widest hover:bg-[#285e8e] transition-colors"
          :disabled="loading"
        >
          {{ loading ? '處理中…' : '重設密碼' }}
        </button>
      </form>
      <div class="mt-6 text-center text-[15px]">
        <router-link to="/login" class="text-[#337ab7] hover:text-[#285e8e]">返回登入</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/client.js'

const router = useRouter()
const username = ref('')
const recoveryCode = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const submit = async () => {
  if (password.value !== confirmPassword.value) {
    alert('兩次輸入的新密碼不相符')
    return
  }

  loading.value = true
  try {
    const { data } = await api.post('/api/auth/forgot-password', {
      username: username.value.trim(),
      recoveryCode: recoveryCode.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    })
    alert(data.message)
    router.push('/login')
  } catch (e) {
    alert(e.response?.data?.message || '重設失敗')
  } finally {
    loading.value = false
  }
}
</script>
