<template>
  <div class="max-w-4xl mx-auto p-4">
    <div class="bg-white p-6 rounded shadow-sm border mb-6">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">{{ room.title }}</h1>
      <p class="text-gray-600 whitespace-pre-line">{{ room.content }}</p>
    </div>

    <div class="mb-8">
      <textarea 
        v-model="newPost" 
        class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
        rows="3" 
        placeholder="發表你的看法..."
      ></textarea>
      <button 
        @click="submitThread(null)" 
        :disabled="isSubmitting"
        class="mt-2 text-white px-6 py-2 rounded font-bold transition-colors"
        :class="{
          'bg-gray-400 cursor-not-allowed opacity-70': isSubmitting,
          'bg-[#337ab7] hover:bg-[#285e8e]': !isSubmitting
        }"
      >
        {{ isSubmitting ? '發表中，請稍候...' : '發表留言' }}
      </button>
    </div>

    <div class="space-y-6">
      <div v-for="mainThread in mainThreads" :key="mainThread.id" class="bg-gray-50 p-4 rounded-lg border">
        <div class="flex items-center gap-2 mb-2">
          <span class="font-bold text-gray-800">{{ mainThread.author_name }}</span>
          <span :class="roleClass(mainThread.role)" class="text-xs px-2 py-0.5 rounded font-bold">
            {{ roleText(mainThread.role) }}
          </span>
          <span class="text-gray-400 text-xs">{{ formatDate(mainThread.created_at) }}</span>
        </div>
        
        <p class="text-gray-700 mb-4 whitespace-pre-line">{{ mainThread.content }}</p>

        <div class="ml-8 border-l-2 pl-4 space-y-4">
          <div v-for="reply in getReplies(mainThread.id)" :key="reply.id" class="text-sm">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-bold">{{ reply.author_name }}</span>
              <span :class="roleClass(reply.role)" class="text-[10px] px-1.5 py-0.5 rounded font-bold">
                {{ roleText(reply.role) }}
              </span>
              <span class="text-gray-400 text-[10px]">{{ formatDate(reply.created_at) }}</span>
            </div>
            <p class="text-gray-600 whitespace-pre-line">{{ reply.content }}</p>
          </div>

          <div class="flex gap-2 mt-2">
            <input 
              v-model="replyTexts[mainThread.id]" 
              class="flex-1 text-sm border p-1.5 rounded focus:ring-1 focus:ring-blue-500 outline-none" 
              placeholder="回覆此留言..."
              @keyup.enter="submitThread(mainThread.id)"
            />
            <button 
              @click="submitThread(mainThread.id)" 
              :disabled="isSubmitting"
              class="text-sm font-bold transition-colors"
              :class="{
                'text-gray-400 cursor-not-allowed': isSubmitting,
                'text-blue-600 hover:text-blue-800': !isSubmitting
              }"
            >
              {{ isSubmitting ? '送出中...' : '送出' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const roomId = route.params.discussionId // 假設路由為 /discussion/:discussionId
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const room = ref({})
const allThreads = ref([])
const newPost = ref('')
const replyTexts = ref({})
const isSubmitting = ref(false)

// 過濾出主留言（沒有 parent_thread_id 的）
const mainThreads = computed(() => allThreads.value.filter(t => !t.parent_thread_id))

// 取得特定留言的回覆
const getReplies = (parentId) => allThreads.value.filter(t => t.parent_thread_id === parentId)

const fetchData = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/discussions/${roomId}/threads`)
    room.value = res.data.room
    allThreads.value = res.data.threads
  } catch (error) {
    console.error('讀取討論區失敗', error)
  }
}

const submitThread = async (parentId) => {
  const content = parentId ? replyTexts.value[parentId] : newPost.value
  
  // 防呆：如果內容為空則不執行
  if (!content || !content.trim()) return

  // 凍結按鈕，防止重複連點
  isSubmitting.value = true

  try {
    await axios.post(`${API_BASE_URL}/api/discussions/${roomId}/threads`, {
      user_id: localStorage.getItem('user'),
      content: content.trim(),
      parent_thread_id: parentId
    })

    // 發送成功後清空對應的輸入框
    if (parentId) {
      replyTexts.value[parentId] = ''
    } else {
      newPost.value = ''
    }
    
    // 重新拉取最新留言
    await fetchData()
  } catch (error) {
    console.error('發表留言失敗', error)
    alert('發表失敗，請稍後再試！')
  } finally {
    // 無論成功或失敗，最後一定要把按鈕解凍
    isSubmitting.value = false
  }
}

// 判斷身分文字
const roleText = (role) => {
  if (role === 'teacher') return '老師'
  if (role === 'ta') return '助教'
  if (role === 'ai') return 'AI 助手' // 加上 AI 判斷
  return '學生'
}

// 判斷身分標籤樣式
const roleClass = (role) => {
  if (role === 'teacher') return 'bg-red-100 text-red-600'
  if (role === 'ta') return 'bg-orange-100 text-orange-600'
  if (role === 'ai') return 'bg-purple-100 text-purple-600' // 讓 AI 有專屬顏色
  return 'bg-blue-100 text-blue-600'
}

const formatDate = (date) => new Date(date).toLocaleString()

onMounted(fetchData)
</script>