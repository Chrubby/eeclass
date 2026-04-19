<template>
  <div class="max-w-4xl mx-auto p-4">
    <div class="bg-white p-6 rounded shadow-sm border mb-6">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">{{ room.title }}</h1>
      <p class="text-gray-600 whitespace-pre-line">{{ room.content }}</p>

      <div v-if="room.file_path" class="mt-5 pt-4 border-t border-gray-100">
        <span class="text-sm font-bold text-gray-700 mr-3">附件：</span>
        <a 
          :href="`${API_BASE_URL}/${room.file_path}`" 
          target="_blank"
          class="inline-flex items-center gap-1.5 text-sm font-bold text-[#337ab7] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          檢視 PDF 檔案
        </a>
      </div>
    </div>

    <div class="mb-8">
      <textarea 
        v-model="newPost" 
        class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
        rows="3" 
        placeholder="發表你的看法..."
      ></textarea>
      <button 
        @click="submitThread(null, newPost)" 
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
      <div 
        v-for="rootThread in threadTree" 
        :key="rootThread.id" 
        class="bg-gray-50 p-4 rounded-lg border"
      >
        <ThreadItem 
          :node="rootThread" 
          @submit-reply="submitThread" 
        />
      </div>
      
      <div v-if="threadTree.length === 0" class="text-center text-gray-500 py-10">
        目前尚無留言，成為第一個發表看法的人吧！
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
// 記得引入我們剛剛建立的元件 (路徑請依照你的專案結構調整)
import ThreadItem from './DiscussionThread.vue' 

const route = useRoute()
const roomId = route.params.discussionId 
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const room = ref({})
const allThreads = ref([])
const newPost = ref('')
const isSubmitting = ref(false)

// 核心邏輯：將扁平陣列轉化為無限層級的樹狀結構 (Tree)
const threadTree = computed(() => {
  const map = new Map()
  const roots = []

  // 1. 初始化 map，並為每個節點加上一個空的 children 陣列
  allThreads.value.forEach(t => {
    map.set(t.id, { ...t, children: [] })
  })

  // 2. 建立父子關聯
  allThreads.value.forEach(t => {
    if (t.parent_thread_id) {
      // 如果有 parent_thread_id，就把它塞進父節點的 children 陣列中
      const parent = map.get(t.parent_thread_id)
      if (parent) {
        parent.children.push(map.get(t.id))
      }
    } else {
      // 沒有 parent_thread_id 的就是最頂層的留言
      roots.push(map.get(t.id))
    }
  })

  return roots
})

const fetchData = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/discussions/${roomId}/threads`)
    room.value = res.data.room
    allThreads.value = res.data.threads
  } catch (error) {
    console.error('讀取討論區失敗', error)
  }
}

// 統一處理發送 API 的邏輯 (不論是主留言還是幾層下的子留言，都透過這個 function)
const submitThread = async (parentId, contentText) => {
  if (!contentText || !contentText.trim()) return
  isSubmitting.value = true

  try {
    await axios.post(`${API_BASE_URL}/api/discussions/${roomId}/threads`, {
      user_id: localStorage.getItem('user'),
      content: contentText.trim(),
      parent_thread_id: parentId // 後端原本就支援吃這個參數
    })

    // 如果是全新的主留言，清空主輸入框 (子留言框會在 ThreadItem 內自行清空)
    if (!parentId) {
      newPost.value = ''
    }
    
    await fetchData()
  } catch (error) {
    console.error('發表留言失敗', error)
    alert('發表失敗，請稍後再試！')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchData)
</script>