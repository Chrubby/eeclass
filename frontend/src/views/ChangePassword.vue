<template>
  <div class="flex justify-center mt-16">
    <div class="w-full max-w-md px-4 bg-white border rounded shadow-sm p-6">
      <h1 class="text-xl font-bold text-gray-800 mb-2 text-center">請變更密碼</h1>
      <p class="text-sm text-gray-600 mb-6 text-center">
        首次登入或帳號安全政策要求，請先設定您的新密碼後再使用系統。
      </p>
      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <input
          v-model="password"
          type="password"
          placeholder="新密碼（至少 8 字元）"
          required
          minlength="8"
          class="w-full border border-gray-300 rounded px-3 py-2 text-[15px] focus:outline-none focus:border-blue-400"
        />
        <input
          v-model="confirmPassword"
          type="password"
          placeholder="確認新密碼"
          required
          class="w-full border border-gray-300 rounded px-3 py-2 text-[15px] focus:outline-none focus:border-blue-400"
        />
        <button
          type="submit"
          class="w-full bg-[#337ab7] text-white py-2.5 rounded text-lg tracking-wide hover:bg-[#285e8e]"
          :disabled="loading"
        >
          {{ loading ? '儲存中…' : '確認變更' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/client.js'
import { setMustChangePassword } from '@/utils/auth.js'

const router = useRouter()
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const submit = async () => {
  if (password.value !== confirmPassword.value) {
    alert('兩次輸入的密碼不相符')
    return
  }

  loading.value = true
  try {
    const { data } = await api.post('/api/auth/change-password', {
      password: password.value,
      confirmPassword: confirmPassword.value,
    })
    setMustChangePassword(false)
    alert(data.message)
    router.push('/dashboard')
  } catch (e) {
    alert(e.response?.data?.message || '變更失敗')
  } finally {
    loading.value = false
  }
}
</script>
