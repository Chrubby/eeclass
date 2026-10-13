<template>
  <div class="flex flex-col gap-6 mt-6 px-4">
  <div class="bg-white p-6 border">
    <h3 class="text-sm font-bold border-b border-dashed pb-2 mb-4">建立帳號</h3>

    <p class="text-gray-500 text-[13px] mb-5">
      系統不開放自行註冊，所有帳號都由管理員建立。這裡一次建立一個帳號；整班的學生與授課老師可用下方的 Excel 名單批次建立。助教不是另一種帳號，而是由授課老師在課程的「學生名冊」把學生勾選為該課助教。
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
          <option value="student">學生</option>
          <option value="teacher">教師</option>
          <option value="admin">管理員</option>
        </select>
      </div>

      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">信箱</label>
        <input v-model="email" type="email" placeholder="name@example.com（選填）" maxlength="100" :class="inputClass" />
        <p class="text-gray-500 text-xs mt-1">課程通知會寄到這個信箱，對方之後也能在個人資訊自行填寫。</p>
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

  <div class="bg-white p-6 border">
    <h3 class="text-sm font-bold border-b border-dashed pb-2 mb-4">批次建立帳號（Excel）</h3>

    <p class="text-gray-500 text-[13px] mb-5 leading-relaxed">
      上傳學員名單 .xlsx，需包含「姓名」「帳號」「信箱」欄位。沒有帳號的人會以信箱作為帳號；
      備註欄寫「授課老師」會建立教師帳號，其餘（包含註記「助教」的人）都是學生帳號。已存在的帳號會直接略過。
      這裡只建立帳號，要把名單加入課程請到該課程的「學生名冊」頁匯入。
    </p>

    <form @submit.prevent="importAccounts" class="flex flex-col gap-4 max-w-md">
      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">
          Excel 檔案 <span class="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept=".xlsx"
          required
          class="block w-full text-[14px] text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:border file:border-gray-300 file:rounded file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 file:cursor-pointer"
          @change="importFile = $event.target.files[0] || null"
        />
      </div>

      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">
          初始密碼 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="importPassword"
          type="text"
          placeholder="所有新帳號共用，至少8個字元"
          required
          minlength="8"
          :class="inputClass"
        />
        <p class="text-gray-500 text-xs mt-1">每個新帳號首次登入後都會被要求變更密碼。</p>
      </div>

      <p v-if="importError" class="text-red-600 text-[14px]">{{ importError }}</p>

      <div class="mt-2">
        <button
          type="submit"
          :disabled="importing"
          class="bg-[#337ab7] text-white px-8 py-2.5 rounded text-[16px] tracking-widest hover:bg-[#285e8e] transition-colors disabled:opacity-60"
        >
          {{ importing ? '匯入中…' : '匯入' }}
        </button>
      </div>
    </form>

    <div v-if="importResult" class="mt-6">
      <p class="text-[14px] mb-3">
        <span v-if="importResult.title" class="text-gray-500">{{ importResult.title }}：</span>
        新建 <b class="text-green-700">{{ importResult.created.length }}</b> 筆、
        略過 <b class="text-gray-700">{{ importResult.skipped.length }}</b> 筆、
        失敗 <b class="text-red-600">{{ importResult.failed.length }}</b> 筆
      </p>

      <div class="overflow-x-auto border rounded">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-100 text-gray-700 text-left">
              <th class="px-3 py-2 font-bold w-14">列</th>
              <th class="px-3 py-2 font-bold">帳號</th>
              <th class="px-3 py-2 font-bold">姓名</th>
              <th class="px-3 py-2 font-bold w-16">身分</th>
              <th class="px-3 py-2 font-bold">結果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in importRows" :key="row.rowNumber" class="border-t">
              <td class="px-3 py-2 text-gray-500">{{ row.rowNumber }}</td>
              <td class="px-3 py-2 break-all">{{ row.username || '—' }}</td>
              <td class="px-3 py-2">{{ row.name || '—' }}</td>
              <td class="px-3 py-2">{{ ROLE_LABELS[row.role] || '—' }}</td>
              <td class="px-3 py-2" :class="OUTCOME_CLASSES[row.outcome]">{{ row.detail }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import api from '@/api/client.js'

const ROLE_LABELS = { student: '學生', teacher: '教師' }
const OUTCOME_CLASSES = { created: 'text-green-700', skipped: 'text-gray-500', failed: 'text-red-600' }

const importFile = ref(null)
const importPassword = ref('')
const importing = ref(false)
const importError = ref('')
const importResult = ref(null)

const importRows = computed(() => {
  if (!importResult.value) return []
  const { created, skipped, failed } = importResult.value
  return [
    ...created.map((row) => ({ ...row, outcome: 'created', detail: '已建立' })),
    ...skipped.map((row) => ({ ...row, outcome: 'skipped', detail: `略過：${row.reason}` })),
    ...failed.map((row) => ({ ...row, outcome: 'failed', detail: `失敗：${row.reason}` })),
  ].sort((a, b) => a.rowNumber - b.rowNumber)
})

const importAccounts = async () => {
  importError.value = ''
  importResult.value = null
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    formData.append('initialPassword', importPassword.value)
    const { data } = await api.post('/api/auth/accounts/import', formData)
    importResult.value = data
  } catch (error) {
    importError.value = error.response?.data?.message || '匯入失敗'
  } finally {
    importing.value = false
  }
}

const inputClass =
  'w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors'

const username = ref('')
const name = ref('')
const role = ref('student')
const email = ref('')
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
      email: email.value.trim(),
      password: password.value,
      confirmPassword: confirmPassword.value,
    })
    isError.value = false
    message.value = `${data.message}（帳號：${data.username}）`
    username.value = ''
    name.value = ''
    email.value = ''
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
