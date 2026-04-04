<template>
  <!-- AI 提醒或聊天按鈕 -->
  <div class="fixed bottom-4 right-4 flex flex-col items-end space-y-2">
    <div v-if="reminder" class="w-80 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg cursor-pointer hover:bg-yellow-100 transition"
         @click="open = true">
      <div class="font-semibold text-yellow-800 mb-1">課程助教提醒</div>
      <div class="text-sm text-yellow-900 whitespace-pre-line" v-html="renderMarkdown(reminder)"></div>
      <div class="text-xs text-yellow-700 mt-1 text-right">點擊與 AI 對話</div>
    </div>

    <button v-else class="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition"
            @click="open = true">
      AI 對話
    </button>
  </div>

  <!-- 聊天視窗 -->
  <div v-if="open" class="fixed bottom-20 right-4 w-96 h-[500px] bg-white border rounded-lg shadow-xl flex flex-col overflow-hidden">
    <!-- 標題 -->
    <div class="flex justify-between items-center bg-gray-100 px-4 py-2 border-b">
      <span class="font-semibold text-gray-800">課程助教 AI</span>
      <button @click="open = false" class="text-gray-500 hover:text-gray-800 transition">✕</button>
    </div>

    <!-- 聊天歷史 -->
    <div class="flex-1 p-4 overflow-y-auto space-y-2" ref="chatContainer">
      <template v-for="(msg, idx) in messagesWithDateSeparators" :key="idx">
        <div v-if="msg.isDateSeparator" class="text-center text-gray-400 text-xs my-2">{{ msg.date }}</div>

        <div v-else class="flex flex-col">
          <div
            :class="[
              'p-2 rounded-lg max-w-[75%] shadow-sm break-words',
              msg.role === 'user' ? 'bg-blue-100 self-end text-gray-800' : 'bg-gray-100 self-start text-gray-800'
            ]"
            v-html="renderMarkdown(msg.message)"
          ></div>
          <div class="text-[10px] text-gray-400 mt-0.5" :class="msg.role === 'user' ? 'self-end' : 'self-start'">
            {{ formatTime(msg.created_at) }}
          </div>
        </div>
      </template>

      <div v-if="loading" class="text-gray-400">AI 正在輸入...</div>
    </div>

    <!-- 輸入框 -->
    <div class="flex p-2 border-t bg-gray-50">
      <input
        type="text"
        v-model="input"
        @keydown.enter="handleSend"
        class="flex-1 border rounded px-2 py-1 mr-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
        placeholder="輸入訊息..."
        :disabled="loading"
      />
      <button
        class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition disabled:opacity-50"
        @click="handleSend"
        :disabled="loading"
      >
        發送
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  courseCode: String,
  studentCode: String
})

const open = ref(false)
const messages = ref([])
const input = ref('')
const loading = ref(false)
const chatContainer = ref(null)
const reminder = ref('')

// 格式化時間 HH:MM
const formatTime = (iso) => {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

// Markdown 渲染
const renderMarkdown = (text) => marked.parse(text || '', { breaks: true })

// 日期分隔條
const messagesWithDateSeparators = computed(() => {
  const result = []
  let lastDate = null
  for (const msg of messages.value) {
    const msgDate = new Date(msg.created_at).toDateString()
    if (lastDate !== msgDate) {
      result.push({ isDateSeparator: true, date: msgDate })
      lastDate = msgDate
    }
    result.push(msg)
  }
  return result
})

// 抓提醒
const fetchReminder = async () => {
  const courseCode = props.courseCode?.trim()
  const studentCode = props.studentCode?.trim()
  if (!courseCode || !studentCode) return

  try {
    const res = await fetch('/api/ai/remind-homework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_code: courseCode, student_code: studentCode })
    })
    const data = await res.json()
    console.log(data)
    reminder.value = data.reply || '⚠ 無法取得作業提醒'
  } catch (err) {
    console.error(err)
    reminder.value = '⚠ 無法取得作業提醒'
  }
}

// 抓聊天歷史
const fetchChatHistory = async () => {
  const courseCode = props.courseCode?.trim()
  const studentCode = props.studentCode?.trim()
  if (!courseCode || !studentCode) return

  try {
    const res = await fetch(`/api/ai-chat/by-code/${courseCode}/${studentCode}`)
    const data = await res.json()
    messages.value = (data.chats || []).map(m => ({
      role: m.role,
      message: m.message,
      created_at: m.created_at || new Date().toISOString()
    }))
    scrollToBottom()
  } catch (err) {
    console.error(err)
  }
}

// 開啟聊天視窗
watch(open, val => {
  if (val) {
    fetchReminder()
    fetchChatHistory()
  }
})

// 監聽 props 變化，兩個都有值才抓
watch(
  () => [props.courseCode, props.studentCode],
  ([courseCode, studentCode]) => {
    if (courseCode && studentCode) {
      fetchReminder()
      fetchChatHistory()
    }
  },
  { immediate: true }
)

// 發送訊息
const handleSend = async () => {
  if (!input.value.trim()) return
  const now = new Date().toISOString()
  const userMessage = { role: 'user', message: input.value, created_at: now }
  messages.value.push(userMessage)
  scrollToBottom()
  const msgToSend = input.value
  input.value = ''
  loading.value = true

  try {
    const res = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_code: props.courseCode,
        student_code: props.studentCode,
        message: msgToSend
      })
    })
    const data = await res.json()
    const aiMessage = { role: 'assistant', message: data.reply, created_at: new Date().toISOString() }
    messages.value.push(aiMessage)
    scrollToBottom()
  } catch (err) {
    console.error(err)
    const errMessage = { role: 'assistant', message: '無法取得 AI 回覆，請稍後再試。', created_at: new Date().toISOString() }
    messages.value.push(errMessage)
    scrollToBottom()
  } finally {
    loading.value = false
  }
}

// 自動捲到底
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}
</script>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(0,0,0,0.2);
  border-radius: 3px;
}
</style>