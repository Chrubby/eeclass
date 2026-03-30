<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">
        討論區
      </h2>
    </div>

    <button
      v-if="user.role === 'teacher'"
      @click="showAddModal = true"
      class="bg-[#337ab7] text-white px-4 py-1.5 rounded text-sm font-bold tracking-wide hover:bg-[#285e8e] shadow-sm transition-colors flex items-center gap-1 mb-4"
    >
      ＋ 新增討論主題
    </button>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="flex bg-gray-100 text-sm font-bold text-gray-700 p-3 border-b">
        <div class="flex-1">主題標題</div>
        <div class="w-32 text-center">發布者</div>
        <div class="w-32 text-center">發布日期</div>
      </div>

      <ul class="divide-y divide-gray-200">
        <li 
          v-for="item in discussions" 
          :key="item.id" 
          class="flex p-3 hover:bg-blue-50 cursor-pointer transition-colors items-center text-[15px]"
          @click="goToDetail(item.id)"
        >
          <div class="flex-1 text-[#337ab7] hover:underline truncate pr-4">
            {{ item.title }}
          </div>
          <div class="w-32 text-center text-gray-600 text-sm">{{ item.author || '教授' }}</div>
          <div class="w-32 text-center text-gray-500 text-sm">{{ formatDate(item.date) }}</div>
        </li>
      </ul>

      <div v-if="discussions.length === 0" class="p-10 text-center text-gray-500">
        目前尚無討論資料
      </div>
    </div>

    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded shadow-lg w-[450px] text-sm" @click.stop>
            <h3 class="font-bold mb-4 text-lg text-gray-800">新增討論主題</h3>
            
            <div class="mb-4">
            <label class="block text-gray-700 font-bold mb-1">主題名稱</label>
            <input
                v-model="newDiscussion.title"
                placeholder="例如：第一週課程內容提問"
                class="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
            </div>

            <div class="mb-4">
            <label class="block text-gray-700 font-bold mb-1">內容</label>
            <textarea
                v-model="newDiscussion.content"
                placeholder="請輸入此討論區的說明或規則..."
                class="border p-2 w-full rounded h-32 focus:ring-2 focus:ring-blue-500 outline-none"
            ></textarea>
            </div>

            <div class="flex justify-end gap-2 mt-2">
            <button @click="showAddModal = false" class="px-4 py-2 border rounded hover:bg-gray-50 transition">
                取消
            </button>
            <button 
                @click="createDiscussion" 
                class="px-4 py-2 bg-[#337ab7] text-white rounded hover:bg-[#285e8e] transition font-bold"
            >
                確認建立
            </button>
            </div>
        </div>
        </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 環境變數與參數
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const courseCode = route.params.id

// 狀態管理
const discussions = ref([])
const showAddModal = ref(false)
const user = ref({
  user_id: '',
  role: '',
  name: ''
})

const newDiscussion = ref({
  title: '',
  content: ''
})

// 取得使用者資訊
const loadUser = async () => {
  const stored = localStorage.getItem("user")
  if (!stored) {
    router.push('/login')
    return
  }
  user.value.user_id = stored

  try {
    const res = await axios.get(`${API_BASE_URL}/api/user_inf`, {
      params: { user_id: user.value.user_id }
    })
    user.value.role = res.data.role
    if (res.data.user) {
      user.value.name = res.data.user.name
    }
  } catch (err) {
    console.error('取得使用者資訊失敗', err)
  }
}

// 取得討論列表
const fetchDiscussions = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/courses/${courseCode}/discussions`)
    discussions.value = res.data
  } catch (err) {
    console.error("載入討論區失敗", err)
  }
}

// 建立討論主題
const createDiscussion = async () => {
  if (!newDiscussion.value.title.trim()) {
    alert('請填寫標題')
    return
  }

  try {
    await axios.post(`${API_BASE_URL}/api/discussions/create`, {
      course_code: courseCode,
      title: newDiscussion.value.title,
      content: newDiscussion.value.content
    })
    
    alert('討論主題建立成功')
    showAddModal.value = false
    newDiscussion.value.title = ''
    newDiscussion.value.content = ''
    fetchDiscussions()
  } catch (err) {
    console.error('建立討論主題失敗', err)
    alert('建立失敗，請稍後再試')
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`
}

const goToDetail = (id) => {
  router.push(`/course/${courseCode}/discussion/${id}`)
}

onMounted(async () => {
  await loadUser()
  fetchDiscussions()
})
</script>