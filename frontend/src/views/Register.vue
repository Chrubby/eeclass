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
            <option value="ta">助教</option>
          </select>
        </div>

        <div class="flex justify-center mt-3">
          <button
            type="submit"
            class="bg-[#337ab7] text-white px-8 py-2.5 rounded text-[16px] tracking-widest hover:bg-[#285e8e] transition-colors"
          >
            註冊
          </button>
        </div>
      </form>

      <!-- Excel 批次建帳：UI 在此；解析與寫入邏輯在 modules/bulk-account-import -->
      <div class="mt-8 border border-dashed border-gray-300 rounded-lg p-4 bg-slate-50">
        <h3 class="text-[16px] font-bold text-gray-800 mb-1">Excel 批次建立帳號</h3>
        <p class="text-xs text-gray-500 mb-3 leading-relaxed">
          上傳含多筆帳號的 Excel（.xlsx）或 CSV，一鍵自動建立。
          <button type="button" class="text-[#337ab7] hover:underline" @click="downloadTemplate">
            下載樣板
          </button>
        </p>
        <div class="flex flex-col gap-2">
          <label class="text-[13px] text-gray-700">
            匯入驗證碼（伺服器有設定時必填）
            <input
              v-model="importCode"
              type="password"
              placeholder="選填 / 依伺服器設定"
              class="mt-1 w-full bg-white border border-gray-300 rounded px-3 py-2 text-[14px] focus:outline-none focus:border-blue-400"
            />
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            class="text-[13px]"
            @change="onBulkFileChange"
          />
          <button
            type="button"
            class="self-start bg-[#337ab7] text-white px-4 py-2 rounded text-[14px] hover:bg-[#285e8e] disabled:opacity-60"
            :disabled="bulkLoading"
            @click="bulkRegister"
          >
            {{ bulkLoading ? '建立中…' : '一鍵建立帳號' }}
          </button>
          <pre
            v-if="bulkReport"
            class="text-[11px] bg-white border border-gray-200 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap text-gray-700"
          >{{ bulkReport }}</pre>
        </div>
      </div>

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
const role = ref("student")

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const importCode = ref("")
const bulkFile = ref(null)
const bulkLoading = ref(false)
const bulkReport = ref("")

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
    role: role.value,
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

const onBulkFileChange = (e) => {
  bulkFile.value = e.target.files?.[0] || null
  bulkReport.value = ""
}

const downloadTemplate = () => {
  const base = import.meta.env.VITE_API_BASE_URL || ""
  window.open(`${base}/api/auth/bulk-register/template`, "_blank")
}

const bulkRegister = async () => {
  if (!bulkFile.value) {
    alert("請先選擇 Excel / CSV 檔案")
    return
  }

  const form = new FormData()
  form.append("file", bulkFile.value)
  if (importCode.value.trim()) {
    form.append("importCode", importCode.value.trim())
  }

  bulkLoading.value = true
  bulkReport.value = ""
  try {
    const { data } = await api.post("/api/auth/bulk-register", form)
    const fails = (data.results || [])
      .filter((r) => !r.ok)
      .slice(0, 40)
      .map((r) => `列 ${r.rowNumber}${r.username ? ` (${r.username})` : ""}：${r.error}`)

    bulkReport.value = [
      `成功：${data.summary?.created ?? 0} 筆`,
      `失敗：${data.summary?.failed ?? 0} 筆`,
      "",
      ...fails,
    ].join("\n")

    alert(data.message || "批次建立完成")
  } catch (error) {
    alert(error.response?.data?.message || error.message || "批次建立失敗")
  } finally {
    bulkLoading.value = false
  }
}
</script>
