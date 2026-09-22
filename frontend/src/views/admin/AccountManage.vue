<template>
  <div class="bg-white p-6 border">
    <h3 class="text-sm font-bold border-b border-dashed pb-2 mb-4">建立帳號</h3>

    <p class="text-gray-500 text-[13px] mb-5">
      管理員可建立教師與其他管理員帳號。學生請自行於註冊頁面註冊，助教則由教師於課程名單中指定。
    </p>

    <form @submit.prevent="submit" class="flex flex-col gap-4 max-w-md">
      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">
          帳號 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="username"
          type="text"
          placeholder="帳號"
          required
          :class="inputClass"
        />
      </div>

      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">
          姓名 <span class="text-red-500">*</span>
        </label>
        <input v-model="name" type="text" placeholder="姓名" required :class="inputClass" />
      </div>

      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">
          身份 <span class="text-red-500">*</span>
        </label>
        <select v-model="role" required :class="inputClass">
          <option value="teacher">教師</option>
          <option value="admin">管理員</option>
        </select>
      </div>

      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">
          初始密碼 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="password"
          type="text"
          placeholder="密碼長度至少8個字元"
          required
          :class="inputClass"
        />
        <p class="text-gray-500 text-xs mt-1">對方首次登入後會被要求變更密碼。</p>
      </div>

      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">
          密碼確認 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="confirmPassword"
          type="text"
          placeholder="密碼確認"
          required
          :class="inputClass"
        />
      </div>

      <p v-if="message" :class="isError ? 'text-red-600' : 'text-green-600'" class="text-[14px]">
        {{ message }}
      </p>

      <div class="mt-2">
        <button
          type="submit"
          :disabled="submitting"
          class="bg-[#337ab7] text-white px-8 py-2.5 rounded text-[16px] tracking-widest hover:bg-[#285e8e] transition-colors disabled:opacity-60"
        >
          建立
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api/client.js'

const inputClass =
  'w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors'

const username = ref('')
const name = ref('')
const role = ref('teacher')
const password = ref('')
const confirmPassword = ref('')

const message = ref('')
const isError = ref(false)
const submitting = ref(false)

const submit = async () => {
  if (password.value !== confirmPassword.value) {
    isError.value = true
    message.value = '兩次輸入的密碼不相符'
    return
  }

  submitting.value = true
  try {
    const { data } = await api.post('/api/auth/accounts', {
      username: username.value.trim(),
      name: name.value.trim(),
      role: role.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    })
    isError.value = false
    message.value = `${data.message}（帳號：${data.username}）`
    username.value = ''
    name.value = ''
    password.value = ''
    confirmPassword.value = ''
  } catch (error) {
    isError.value = true
    message.value = error.response?.data?.message || '建立帳號失敗'
  } finally {
    submitting.value = false
  }
}
</script>
