<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, inject, onMounted } from 'vue'
import api from '@/api/client.js'

const route = useRoute()
const router = useRouter()
const courseCode = route.params.id

const students = ref([])
const fileInput = ref(null)
const isUploading = ref(false)
const syncResult = ref(null)
const refreshCourseInfo = inject('refreshCourseInfo', () => {})

const user = ref({
  name: '',
  user_id: '',
  role: '',
})

//驗證登入身分與權限
const loadUser = async () => {
  const stored = localStorage.getItem("user")
  if (!stored) {
    router.push('/')
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

// 判斷是否為管理員、教師或助教（決定是否顯示上傳按鈕）
const canManage = computed(() => ['admin', 'teacher', 'ta'].includes(user.value.role))
// 指定／取消助教只有授課老師與管理員可以做，助教自己不行
const canAssignTa = computed(() => ['admin', 'teacher'].includes(user.value.role))
const togglingTa = ref('')

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

  if (!confirm('同步後，名冊上有、但這份名單上沒有的學生會改為「已退選」（資料保留，之後名單再出現就會恢復）。確定要同步嗎？')) {
    event.target.value = ''
    return
  }

  const formData = new FormData()
  formData.append("file", file) // 對應後端 multer 的欄位名稱

  isUploading.value = true
  syncResult.value = null

  try {
    const res = await api.post(`/api/courses/${courseCode}/studentlist`, formData)

    syncResult.value = res.data
    await fetchStudents() // 重新整理
    refreshCourseInfo() // 名單可能帶入新的授課老師／助教
  } catch (error) {
    if (error.response && error.response.data) {
      alert(error.response.data.message || "上傳失敗")
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
    ta: '助教',
    student: '修課學生',
    external: '校外加選',
    auditor: '旁聽生',
    dropped: '已退選'
  }
  return map[role] || role || '修課學生'
}

const formatDate = (raw) => new Date(raw).toLocaleDateString()

// 勾選：把這位學生升為這門課的助教；取消勾選則變回一般修課學生
const toggleTa = async (student, checked) => {
  togglingTa.value = student.student_id
  try {
    await api.post(`/api/courses/${courseCode}/studentlist/update`, {
      studentId: student.student_id,
      role: checked ? 'ta' : 'student'
    })
    refreshCourseInfo() // 側欄的助教名單要跟著更新
  } catch (err) {
    alert(err.response?.data?.message || "更新助教身分失敗")
  } finally {
    await fetchStudents()
    togglingTa.value = ''
  }
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
      accept=".xlsx" 
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

    <!-- 同步結果 -->
    <div v-if="syncResult" class="mb-4 p-4 bg-gray-50 border rounded text-sm flex flex-col gap-2">
      <p>
        新加入 <b class="text-green-700">{{ syncResult.added.length }}</b> 人、
        恢復修課 <b class="text-green-700">{{ syncResult.reactivated.length }}</b> 人、
        未變動 <b>{{ syncResult.unchanged }}</b> 人、
        改為退選 <b class="text-orange-600">{{ syncResult.withdrawn.length }}</b> 人
        <template v-if="syncResult.updated.length">
          、身分更新 <b>{{ syncResult.updated.length }}</b> 人
        </template>
        <template v-if="syncResult.teachersAdded.length">
          、新增授課老師 <b class="text-green-700">{{ syncResult.teachersAdded.length }}</b> 人
        </template>
        <template v-if="syncResult.skipped.length">
          、略過 <b class="text-red-600">{{ syncResult.skipped.length }}</b> 列
        </template>
      </p>
      <p v-if="syncResult.withdrawn.length" class="text-orange-700">
        改為退選：{{ syncResult.withdrawn.map((p) => `${p.name}（${p.username}）`).join('、') }}
      </p>
      <div v-if="syncResult.skipped.length" class="text-red-700">
        <p class="font-bold">以下各列需要留意（尚未建立帳號的人請先由管理員建立）：</p>
        <ul class="list-disc list-inside space-y-1">
          <li v-for="row in syncResult.skipped" :key="row.rowNumber">
            第 {{ row.rowNumber }} 列 {{ row.name || '' }}{{ row.username ? `（${row.username}）` : '' }}：{{ row.reason }}
          </li>
        </ul>
      </div>
    </div>

    <!-- 資料表格區塊 -->
    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <!-- 表格標題列 -->
      <div class="flex bg-gray-100 text-sm font-bold text-gray-700 p-3 border-b">
        <div class="w-32">學號</div>
        <div class="flex-1 min-w-[6rem]">姓名</div>
        <div class="w-64">電子郵件</div>
        <div class="w-32 text-center">身分</div>
        <div v-if="canAssignTa" class="w-14 text-center">助教</div>
      </div>

      <!-- 學生列表 -->
      <ul v-if="students.length" class="divide-y divide-gray-200">
        <li
          v-for="student in students"
          :key="student.id"
          class="flex p-3 items-center text-[15px] hover:bg-gray-50"
          :class="student.role === 'dropped' ? 'opacity-50' : ''"
        >
          <div class="w-32 font-medium text-gray-800 break-all pr-2">{{ student.student_id }}</div>
          <div class="flex-1 min-w-[6rem] truncate pr-4 text-gray-800">{{ student.name }}</div>
          <div class="w-64 text-gray-500 text-sm truncate">{{ student.email || '-' }}</div>
          <div class="w-32 text-center text-sm text-gray-600">
            <span :class="student.role === 'ta' ? 'font-bold text-[#337ab7]' : ''">{{ formatRole(student.role) }}</span>
            <div v-if="student.role === 'dropped' && student.withdrawn_at" class="text-xs text-gray-500">{{ formatDate(student.withdrawn_at) }}</div>
          </div>
          <div v-if="canAssignTa" class="w-14 text-center">
            <input
              v-if="student.role !== 'dropped'"
              type="checkbox"
              class="w-4 h-4 cursor-pointer align-middle"
              :checked="student.role === 'ta'"
              :disabled="togglingTa === student.student_id"
              :title="student.role === 'ta' ? '取消助教' : '設為這門課的助教'"
              @change="toggleTa(student, $event.target.checked)"
            />
          </div>
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