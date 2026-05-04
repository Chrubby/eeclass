<template>
  <!-- AI 提醒或聊天按鈕 -->
  <div class="fixed bottom-4 right-4 flex flex-col items-end space-y-2">
    <!-- 👨‍🏫 teacher：Prompt 管理 -->
    <button
      v-if="role === 'teacher'"
      class="bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition"
      @click="open = true"
    >
      修改 AI Prompt
    </button>

    <!-- 👨‍🎓 student / ta：AI提醒 -->
    <div
      v-else-if="reminder"
      class="w-80 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg cursor-pointer hover:bg-yellow-100 transition"
      @click="open = true"
    >
      <div class="font-semibold text-yellow-800 mb-1">課程助教提醒</div>
      <div class="text-sm text-yellow-900 whitespace-pre-line" v-html="renderMarkdown(reminder)"></div>
      <div class="text-xs text-yellow-700 mt-1 text-right">點擊與 AI 對話</div>
    </div>

    <!-- fallback：AI 對話 -->
    <button
      v-else-if="role !== 'teacher'"
      class="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition"
      @click="open = true"
    >
      AI 對話
    </button>

  </div>

  <!-- 聊天視窗 -->
  <div
    v-if="open"
    class="fixed bottom-20 right-4 w-96 h-[500px] bg-white border rounded-lg shadow-xl flex flex-col overflow-hidden"
  >
    <!-- 標題 -->
    <div class="flex flex-col bg-gray-100 px-4 py-2 border-b">
      <div class="flex justify-between items-center">
        <span class="font-semibold text-gray-800">課程助教 AI</span>
        <button @click="open = false" class="text-gray-500 hover:text-gray-800 transition">✕</button>
      </div>

      <!-- 👨‍🏫 teacher prompt 編輯 -->
      <div v-if="role === 'teacher'" class="mt-2 space-y-2">
        <div class="text-xs text-gray-600">AI Prompt（課程設定）</div>

        <div class="space-y-2">
          <div>
            <div class="text-xs text-gray-600">Chat Prompt</div>
            <textarea
              v-model="chatPrompt"
              class="w-full text-sm border rounded p-2"
              rows="3"
            />
          </div>

          <div>
            <div class="text-xs text-gray-600">Discussion Prompt</div>
            <textarea
              v-model="discussionPrompt"
              class="w-full text-sm border rounded p-2"
              rows="3"
            />
          </div>

          <div>
            <div class="text-xs text-gray-600">Grading Prompt</div>
            <textarea
              v-model="gradingPrompt"
              class="w-full text-sm border rounded p-2"
              rows="3"
            />
          </div>

        </div>

        <!-- 三個布林設定 -->
        <div class="grid grid-cols-1 gap-2 text-sm text-gray-700">
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="sendAnnouncements" />
            傳送公告資料給 AI
          </label>

          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="sendAssignments" />
            傳送作業資料給 AI
          </label>

          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="sendStudentInfo" />
            傳送學生資訊給 AI
          </label>
        </div>

        <div class="flex justify-end mt-1">
          <button
            class="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            @click="savePrompt"
          >
            儲存設定
          </button>
        </div>
      </div>
    </div>

    <!-- 聊天歷史（student/ta 才顯示） -->
    <div
      v-if="role !== 'teacher'"
      class="flex-1 p-4 overflow-y-auto space-y-2"
      ref="chatContainer"
    >
      <template v-for="(msg, idx) in messagesWithDateSeparators" :key="idx">
        <div v-if="msg.isDateSeparator" class="text-center text-gray-400 text-xs my-2">
          {{ msg.date }}
        </div>

        <div v-else class="flex flex-col">
          <div
            :class="[
              'p-2 rounded-lg max-w-[75%] shadow-sm break-words',
              msg.role === 'user'
                ? 'bg-blue-100 self-end text-gray-800'
                : 'bg-gray-100 self-start text-gray-800'
            ]"
            v-html="renderMarkdown(msg.message)"
          ></div>

          <div
            class="text-[10px] text-gray-400 mt-0.5"
            :class="msg.role === 'user' ? 'self-end' : 'self-start'"
          >
            {{ formatTime(msg.created_at) }}
          </div>
        </div>
      </template>

      <div v-if="loading" class="text-gray-400">AI 正在輸入...</div>
    </div>

    <!-- 輸入框（teacher 不顯示） -->
    <div v-if="role !== 'teacher'" class="flex p-2 border-t bg-gray-50">
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

const chatPrompt = ref('')
const discussionPrompt = ref('')
const gradingPrompt = ref('')

/* ======================
   Props（新增 role）
====================== */
const props = defineProps({
  courseCode: String,
  studentCode: String,
  role: {
    type: String,
    default: 'student' // student | ta | teacher
  }
})

/* ======================
   State
====================== */
const open = ref(false)
const messages = ref([])
const input = ref('')
const loading = ref(false)
const chatContainer = ref(null)
const reminder = ref('')
const teacherPrompt = ref('')
const sendAnnouncements = ref(false)
const sendAssignments = ref(false)
const sendStudentInfo = ref(false)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"

/* ======================
   Utils
====================== */
const formatTime = (iso) => {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

const renderMarkdown = (text) => {
  const fixed = (text || '').replace(/\\n/g, '\n')
  return marked.parse(fixed, { breaks: true })
}

/* ======================
   日期分隔
====================== */
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

/* ======================
   Reminder
====================== */
const fetchReminder = async () => {
  const courseCode = props.courseCode?.trim()
  const studentCode = props.studentCode?.trim()

  if (!courseCode || !studentCode) return

  try {
    const res = await fetch(`${API_BASE_URL}/api/courses/ai-assistant/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseCode, studentCode }) // courseCode 已經在網址裡了
    })

    const data = await res.json()
    reminder.value = data.reply || '⚠ 無法取得作業提醒'
  } catch (err) {
    reminder.value = '⚠ 無法取得作業提醒'
  }
}

/* ======================
   Chat history（teacher 不打）
====================== */
const fetchChatHistory = async () => {
  if (props.role === 'teacher') return

  const courseCode = props.courseCode?.trim()
  const studentCode = props.studentCode?.trim()

  if (!courseCode || !studentCode) return

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/courses/ai-assistant/history/${courseCode}/${studentCode}`
    )

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

/* ======================
   Prompt save（teacher）
====================== */
const savePrompt = async () => {
  if (
    !chatPrompt.value.trim() &&
    !discussionPrompt.value.trim() &&
    !gradingPrompt.value.trim()
  ) {
    alert("至少要填一種 AI Prompt")
    return
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/courses/${props.courseCode}/ai-prompts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_prompt: chatPrompt.value,
        discussion_prompt: discussionPrompt.value,
        grading_prompt: gradingPrompt.value,
        role: props.role,
        send_announcements: sendAnnouncements.value,
        send_assignments: sendAssignments.value,
        send_student_info: sendStudentInfo.value
      })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || '更新失敗')
    }

    alert("✅ Prompt 更新成功")
    open.value = false

  } catch (err) {
    console.error(err)
    alert("❌ 更新失敗：" + err.message)
  }
}

// ======================
// fetchTeacherPrompt
// ======================
const fetchTeacherPrompt = async () => {
  if (props.role !== 'teacher') return

  try {
    const res = await fetch(`${API_BASE_URL}/api/courses/${props.courseCode}/ai-prompts`)

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message)
    }

    chatPrompt.value = data?.chat_prompt || ''
    discussionPrompt.value = data?.discussion_prompt || ''
    gradingPrompt.value = data?.grading_prompt || ''
    sendAnnouncements.value = !!data?.send_announcements
    sendAssignments.value = !!data?.send_assignments
    sendStudentInfo.value = !!data?.send_student_info

  } catch (err) {
    console.error('抓 prompt 失敗:', err)

    teacherPrompt.value = ''
    sendAnnouncements.value = false
    sendAssignments.value = false
    sendStudentInfo.value = false
  }
}

/* ======================
   Send message（student/ta）
====================== */
const handleSend = async () => {
console.log(`API_BASE_URL: ${API_BASE_URL}`);
console.log(`courseCode: ${props.courseCode}`);
console.log(`studentCode: ${props.studentCode}`);
  if (props.role === 'teacher') return

  if (!input.value.trim()) return

  const now = new Date().toISOString()

  messages.value.push({
    role: 'user',
    message: input.value,
    created_at: now
  })

  const msgToSend = input.value
  input.value = ''
  loading.value = true

  try {
    const res = await fetch(`${API_BASE_URL}/api/courses/ai-assistant/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseCode: props.courseCode,
        studentCode: props.studentCode, // 後端現在預期收到 studentCode
        userMessage: msgToSend          // 後端現在預期收到 userMessage (依據我們剛剛重構的 Service)
      })
    })

    const data = await res.json()

    messages.value.push({
      role: 'assistant',
      message: data.reply || data.message || '已收到',
      created_at: new Date().toISOString()
    })

    scrollToBottom()
  } catch (err) {
    messages.value.push({
      role: 'assistant',
      message: '無法取得 AI 回覆，請稍後再試。',
      created_at: new Date().toISOString()
    })
  } finally {
    loading.value = false
  }
}

/* ======================
   Scroll
====================== */
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop =
        chatContainer.value.scrollHeight
    }
  })
}

/* ======================
   Watchers
====================== */
watch(open, (val) => {
  if (val) {
    fetchReminder()
    fetchChatHistory()
    fetchTeacherPrompt()
  }
})

watch(
  () => [props.courseCode, props.studentCode],
  ([c, s]) => {
    if (c && s) {
      fetchReminder()
      fetchChatHistory()
    }
  },
  { immediate: true }
)
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
