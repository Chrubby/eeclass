<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import api from '@/api/client.js'

const route = useRoute()
const router = useRouter()
const courseCode = route.params.id

const students = ref([])
const fileInput = ref(null)
const isUploading = ref(false)
const errorDetails = ref([])

const user = ref({
  name: '',
  user_id: '',
  role: '',
})

//驗證登入身分與權限
const loadUser = async () => {
  const stored = localStorage.getItem("user")
  if (!stored) {
    router.push('/login')
    return
  }

  user.value.user_id = stored

  try {
    const res = await api.get('/api/auth/me')
    user.value.role = res.data.role
  } catch (err) {
    console.error('取得使用者資訊失敗', err)
  }
}

// 判斷是否為教師或助教（決定是否顯示上傳按鈕）
const canManage = computed(() => ['teacher', 'ta'].includes(user.value.role))

//取得該課程目前的學生名冊
const fetchStudents = async () => {
  try {
    const res = await api.get(`/api/courses/${courseCode}/studentlist`)
    // 依據後端回傳格式調整，若直接是陣列就用 res.data
    students.value = Array.isArray(res.data) ? res.data : (res.data.students || [])
  } catch (err) {
    console.error("取得學生名冊失敗", err)
  }
}

// 手動新增/修改學生的 Modal 狀態與表單
const showAddModal = ref(false)
const manualForm = ref({
  studentId: '',
  role: 'student'
})
const isSubmitting = ref(false)

// 3. 觸發隱藏的檔案上傳輸入框
const triggerFileInput = () => {
  fileInput.value.click()
}

// 4. 核心：選擇 Excel 檔案後，透過 api.post 進行同步
const handleFileChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append("file", file) // 對應後端 multer 的欄位名稱

  isUploading.value = true
  errorDetails.value = []

  try {
    const res = await api.post(`/api/courses/${courseCode}/studentlist`, formData)

    alert(res.data.message || "學生名冊同步成功！")
    await fetchStudents() // 重新整理
  } catch (error) {
    // 處理後端傳回的預檢驗錯誤明細
    if (error.response && error.response.data) {
      if (error.response.data.errors) {
        errorDetails.value = error.response.data.errors
      } else {
        alert(error.response.data.message || "上傳失敗")
      }
    } else {
      alert("網路連線異常，請稍後再試")
    }
  } finally {
    isUploading.value = false
    event.target.value = '' // 清空檔案以便重複選取同一個檔案
  }
}

// 身分格式化對應中文
const formatRole = (role) => {
  const map = {
    student: '修課學生',
    external: '校外加選',
    auditor: '旁聽生',
    dropped: '已退選'
  }
  return map[role] || role || '修課學生'
}

// 新增或修改學生身分
const handleManualSubmit = async () => {
  if (!manualForm.value.studentId.trim()) {
    alert("請輸入學號")
    return
  }
  isSubmitting.value = true
  try {
    const res = await api.post(`/api/courses/${courseCode}/studentlist/update`, {
      studentId: manualForm.value.studentId.trim(),
      role: manualForm.value.role
    })
    alert(res.data.message || "學生身分設定成功！")
    showAddModal.value = false
    manualForm.value.studentId = ''
    manualForm.value.role = 'student'
    await fetchStudents()
  } catch (err) {
    alert(err.response?.data?.message || "操作失敗，請檢查學號是否存在")
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  await loadUser()
  await fetchStudents()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">
        學生名冊
      </h2>
    </div>

    <!-- 上傳按鈕（僅老師或助教可操作） -->
    <input 
      type="file" 
      ref="fileInput" 
      accept=".xlsx, .xls" 
      class="hidden" 
      @change="handleFileChange" 
    />
    <div v-if="canManage" class="mb-4 flex gap-2">

      <button
        type="button"
        class="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm font-bold tracking-wide hover:bg-emerald-700 shadow-sm transition-colors"
        @click="showAddModal = true"
      >
        ＋ 新增/修改身分
      </button>
      <button
        type="button"
        class="bg-[#337ab7] text-white px-4 py-1.5 rounded text-sm font-bold tracking-wide hover:bg-[#285e8e] shadow-sm transition-colors flex items-center gap-1 disabled:bg-gray-400"
        @click="triggerFileInput"
        :disabled="isUploading"
      >
        {{ isUploading ? "同步中..." : "＋ 上傳 Excel 學生名冊" }}
      </button>
    </div>

    <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2">新增或修改學生身分</h3>
        
        <form @submit.prevent="handleManualSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">學號</label>
            <input 
              v-model="manualForm.studentId" 
              type="text" 
              placeholder="請輸入學生學號" 
              class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337ab7]"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">身分設定</label>
            <select 
              v-model="manualForm.role" 
              class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337ab7]"
            >
              <option value="student">修課學生</option>
              <option value="external">校外加選</option>
              <option value="auditor">旁聽生</option>
              <option value="dropped">已退選</option>
            </select>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              @click="showAddModal = false"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
            >
              取消
            </button>
            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="px-4 py-2 bg-[#337ab7] text-white rounded text-sm font-medium hover:bg-[#285e8e] disabled:bg-gray-400"
            >
              {{ isSubmitting ? '處理中...' : '確認送出' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 錯誤明細顯示 -->
    <div v-if="errorDetails.length > 0" class="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
      <h3 class="font-bold mb-1">⚠️ 匯入失敗，請修正以下 Excel 錯誤後重新上傳：</h3>
      <ul class="list-disc list-inside space-y-1">
        <li v-for="(err, index) in errorDetails" :key="index">{{ err }}</li>
      </ul>
    </div>

    <!-- 資料表格區塊 -->
    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <!-- 表格標題列 -->
      <div class="flex bg-gray-100 text-sm font-bold text-gray-700 p-3 border-b">
        <div class="w-32">學號</div>
        <div class="flex-1">姓名</div>
        <div class="w-64">電子郵件</div>
        <div class="w-24 text-center">身分</div>
      </div>

      <!-- 學生列表 -->
      <ul v-if="students.length" class="divide-y divide-gray-200">
        <li
          v-for="student in students"
          :key="student.id"
          class="flex p-3 items-center text-[15px] hover:bg-gray-50"
        >
          <div class="w-32 font-medium text-gray-800">{{ student.student_id }}</div>
          <div class="flex-1 truncate pr-4 text-gray-800">{{ student.name }}</div>
          <div class="w-64 text-gray-500 text-sm truncate">{{ student.email || '-' }}</div>
          <div class="w-32 text-center text-sm text-gray-600">{{ formatRole(student.role) }}</div>
        </li>
      </ul>

      <!-- 空白狀態 -->
      <div v-else class="p-12 text-center text-gray-500">
        <p class="mb-2">目前尚無選課學生名冊。</p>
        <p v-if="canManage" class="text-sm text-gray-400">
          可點選「上傳 Excel 學生名冊」批次匯入與更新學生。
        </p>
        <p v-else class="text-sm text-gray-400">請留意課程公告，名冊將由授課教師維護。</p>
      </div>
    </div>
  </div>
</template>