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
        class="mt-2 bg-[#337ab7] text-white px-6 py-2 rounded font-bold hover:bg-[#285e8e]"
      >
        發表留言
      </button>
    </div>

    <div class="space-y-6">
      <div v-for="mainThread in mainThreads" :key="mainThread.id" class="bg-gray-50 p-4 rounded-lg border">
        <div class="flex items-center gap-2 mb-2">
          <span class="font-bold text-gray-800">{{ mainThread.author_name }}</span>
          <span :class="roleClass(mainThread.role)" class="text-xs px-2 py-0.5 rounded">
            {{ roleText(mainThread.role) }}
          </span>
          <span class="text-gray-400 text-xs">{{ formatDate(mainThread.created_at) }}</span>
        </div>
        
        <p class="text-gray-700 mb-4">{{ mainThread.content }}</p>

        <div class="ml-8 border-l-2 pl-4 space-y-4">
          <div v-for="reply in getReplies(mainThread.id)" :key="reply.id" class="text-sm">
            <div class="flex items-center gap-2">
              <span class="font-bold">{{ reply.author_name }}</span>
              <span :class="roleClass(reply.role)" class="text-[10px] px-1.5 rounded">{{ roleText(reply.role) }}</span>
            </div>
            <p class="text-gray-600">{{ reply.content }}</p>
          </div>

          <div class="flex gap-2 mt-2">
            <input 
              v-model="replyTexts[mainThread.id]" 
              class="flex-1 text-sm border p-1.5 rounded" 
              placeholder="回覆此留言..."
            />
            <button @click="submitThread(mainThread.id)" class="text-blue-600 text-sm font-bold">送出</button>
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

// 過濾出主留言（沒有 parent_thread_id 的）
const mainThreads = computed(() => allThreads.value.filter(t => !t.parent_thread_id))

// 取得特定留言的回覆
const getReplies = (parentId) => allThreads.value.filter(t => t.parent_thread_id === parentId)

const fetchData = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/discussions/${roomId}/threads`)
  room.value = res.data.room
  allThreads.value = res.data.threads
}

const submitThread = async (parentId) => {
  const content = parentId ? replyTexts.value[parentId] : newPost.value
  if (!content) return

  await axios.post(`${API_BASE_URL}/api/discussions/${roomId}/threads`, {
    user_id: localStorage.getItem('user'),
    content: content,
    parent_thread_id: parentId
  })

  if (parentId) replyTexts.value[parentId] = ''
  else newPost.value = ''
  
  fetchData()
}

const roleText = (role) => {
  if (role === 'teacher') return '老師'
  if (role === 'ta') return '助教'
  return '學生'
}

const roleClass = (role) => {
  if (role === 'teacher') return 'bg-red-100 text-red-600'
  if (role === 'ta') return 'bg-orange-100 text-orange-600'
  return 'bg-blue-100 text-blue-600'
}

const formatDate = (date) => new Date(date).toLocaleString()

onMounted(fetchData)
</script>