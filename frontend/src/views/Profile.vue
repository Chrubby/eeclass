<template>
  <div class="max-w-lg mx-auto bg-white border rounded shadow-sm p-6">
    <h1 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3 mb-6">個人資訊</h1>

    <div class="flex flex-col items-center mb-8">
      <div class="w-24 h-24 rounded-full bg-gray-200 overflow-hidden mb-3 flex items-center justify-center">
        <img
          v-if="avatarDisplayUrl"
          :src="avatarDisplayUrl"
          alt="頭貼"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-gray-400 text-sm">尚無頭貼</span>
      </div>
      <label class="text-sm text-[#337ab7] hover:underline cursor-pointer">
        <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" class="hidden" @change="onAvatarChange" />
        更換頭貼
      </label>
      <p v-if="avatarUploading" class="text-xs text-gray-500 mt-1">上傳中…</p>
    </div>

    <dl class="text-sm space-y-3 mb-8 border-b pb-6">
      <div class="flex">
        <dt class="w-24 text-gray-500">帳號</dt>
        <dd class="font-medium">{{ profile.username }}</dd>
      </div>
      <div class="flex">
        <dt class="w-24 text-gray-500">姓名</dt>
        <dd>{{ profile.name || '—' }}</dd>
      </div>
      <div class="flex">
        <dt class="w-24 text-gray-500">身分</dt>
        <dd>{{ roleLabel }}</dd>
      </div>
    </dl>

    <h2 class="text-sm font-bold text-gray-700 mb-3">變更密碼</h2>
    <form @submit.prevent="changePassword" class="flex flex-col gap-3">
      <input
        v-if="!profile.must_change_password"
        v-model="currentPassword"
        type="password"
        placeholder="目前密碼"
        required
        class="w-full border border-gray-300 rounded px-3 py-2 text-[15px] focus:outline-none focus:border-blue-400"
      />
      <input
        v-model="newPassword"
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
        class="bg-[#337ab7] text-white px-4 py-2 rounded text-sm font-bold hover:bg-[#285e8e] self-start"
        :disabled="pwdLoading"
      >
        {{ pwdLoading ? '儲存中…' : '更新密碼' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api/client.js'
import { setMustChangePassword } from '@/utils/auth.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const profile = ref({
  username: '',
  name: '',
  role: '',
  avatar_url: null,
  must_change_password: false,
})

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const pwdLoading = ref(false)
const avatarUploading = ref(false)

const roleLabels = {
  student: '學生',
  teacher: '教師',
  ta: '助教',
}

const roleLabel = computed(() => roleLabels[profile.value.role] || profile.value.role)

const avatarDisplayUrl = computed(() => {
  const url = profile.value.avatar_url
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
})

const loadProfile = async () => {
  const res = await api.get('/api/auth/me')
  profile.value = {
    username: res.data.username || '',
    name: res.data.user?.name || '',
    role: res.data.role || '',
    avatar_url: res.data.avatar_url || null,
    must_change_password: Boolean(res.data.must_change_password),
  }
}

const onAvatarChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  avatarUploading.value = true
  try {
    const formData = new FormData()
    formData.append('avatar', file)
    const { data } = await api.post('/api/auth/avatar', formData)
    profile.value.avatar_url = data.avatar_url
    alert(data.message || '頭貼已更新')
  } catch (e) {
    alert(e.response?.data?.message || '上傳失敗')
  } finally {
    avatarUploading.value = false
    event.target.value = ''
  }
}

const changePassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    alert('兩次輸入的新密碼不相符')
    return
  }

  pwdLoading.value = true
  try {
    const payload = {
      password: newPassword.value,
      confirmPassword: confirmPassword.value,
    }
    if (!profile.value.must_change_password) {
      payload.currentPassword = currentPassword.value
    }
    const { data } = await api.post('/api/auth/change-password', payload)
    setMustChangePassword(false)
    profile.value.must_change_password = false
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    alert(data.message)
  } catch (e) {
    alert(e.response?.data?.message || '變更失敗')
  } finally {
    pwdLoading.value = false
  }
}

onMounted(loadProfile)
</script>
