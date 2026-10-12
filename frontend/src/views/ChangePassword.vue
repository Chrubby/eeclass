<template>
  <div class="flex justify-center mt-16">
    <div class="w-full max-w-md px-4 bg-white border rounded shadow-sm p-6">
      <h1 class="text-xl font-bold text-gray-800 mb-2 text-center">請變更密碼</h1>
      <p class="text-sm text-gray-600 mb-6 text-center">
        首次登入或帳號安全政策要求，請先設定您的新密碼後再使用系統。
      </p>
      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <label class="text-sm text-gray-700 font-bold">通知信箱</label>
        <input
          v-model="email"
          name="email"
          type="text"
          inputmode="email"
          autocomplete="email"
          placeholder="name@example.com"
          maxlength="100"
          class="w-full border border-gray-300 rounded px-3 py-2 text-[15px] focus:outline-none focus:border-blue-400"
        />
        <p v-if="emailError" class="text-sm text-red-600 -mt-2">{{ emailError }}</p>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/client.js'
import { setMustChangePassword } from '@/utils/auth.js'

const router = useRouter()
const email = ref('')
const emailError = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

onMounted(async () => {
  try {
    const res = await api.get('/api/auth/me')
    email.value = res.data.email || ''
  } catch (e) {
    console.error('讀取信箱失敗', e)
  }
})

const submit = async (event) => {
  const rawEmail = String(new FormData(event.target).get('email') ?? email.value).trim()
  email.value = rawEmail
  emailError.value = ''

  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) || rawEmail.length > 100) {
    emailError.value = rawEmail ? '請輸入有效的信箱' : '請填寫信箱'
    return
  }
  if (password.value !== confirmPassword.value) {
    alert('兩次輸入的密碼不相符')
    return
  }

  loading.value = true
  try {
    await api.post('/api/auth/email', { email: rawEmail })
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
