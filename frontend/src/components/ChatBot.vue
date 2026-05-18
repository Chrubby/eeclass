<template>
  <!-- AI 提醒或聊天按鈕 -->
  <div class="fixed bottom-4 right-4 flex flex-col items-end space-y-2">
    <!-- 👨‍🏫 teacher：Prompt 管理 -->
    <button
      v-if="['teacher', 'ta'].includes(role)"
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
      v-else-if="!['teacher', 'ta'].includes(role)"
      class="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition"
      @click="open = true"
    >
      AI 對話
    </button>

  </div>
  <!-- 聊天視窗 -->
  <div
    v-if="open"
    class="fixed bottom-20 right-4 w-96 h-[600px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
  >

    <!-- Header -->
    <div class="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
      <div class="flex justify-between items-center">
        <div>
          <div class="font-semibold text-base">
            課程助教 AI
          </div>

          <div class="text-xs text-blue-100 mt-0.5">
            Course AI Assistant
          </div>
        </div>

        <button
          @click="open = false"
          class="text-white/80 hover:text-white transition text-lg"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 可滾動內容 -->
    <div class="flex-1 overflow-y-auto bg-gray-50">

      <!-- Teacher Settings -->
      <div
        v-if="['teacher', 'ta'].includes(role)"
        class="p-4 space-y-5"
      >

        <!-- 區塊標題 -->
        <div>
          <div class="text-sm font-semibold text-gray-800">
            AI Prompt 設定
          </div>

          <div class="text-xs text-gray-500 mt-1">
            控制 AI 的聊天、討論與評分行為
          </div>
        </div>

        <!-- Chat Prompt -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">
            Chat Prompt
          </label>

          <textarea
            v-model="chatPrompt"
            rows="4"
            placeholder="例如：你是一位親切且專業的課程助教..."
            class="w-full text-sm border border-gray-300 rounded-xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
          />
        </div>

        <!-- Discussion Prompt -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">
            Discussion Prompt
          </label>

          <textarea
            v-model="discussionPrompt"
            rows="4"
            placeholder="例如：鼓勵學生進行深入討論..."
            class="w-full text-sm border border-gray-300 rounded-xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
          />
        </div>

        <!-- Grading Prompt -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">
            Grading Prompt
          </label>

          <textarea
            v-model="gradingPrompt"
            rows="4"
            placeholder="例如：依據完整性與邏輯性進行評分..."
            class="w-full text-sm border border-gray-300 rounded-xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
          />
        </div>

        <!-- AI 權限 -->
        <div class="pt-2 border-t border-gray-200">
          <div class="text-sm font-semibold text-gray-800 mb-3">
            AI 可存取資料
          </div>

          <div class="space-y-2">

            <label
              class="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer"
            >
              <input
                type="checkbox"
                v-model="sendAnnouncements"
                class="mt-1"
              />

              <div>
                <div class="text-sm font-medium text-gray-700">
                  公告資料
                </div>

                <div class="text-xs text-gray-500">
                  AI 可讀取課程公告內容
                </div>
              </div>
            </label>

            <label
              class="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer"
            >
              <input
                type="checkbox"
                v-model="sendAssignments"
                class="mt-1"
              />

              <div>
                <div class="text-sm font-medium text-gray-700">
                  作業資料
                </div>

                <div class="text-xs text-gray-500">
                  AI 可讀取作業與截止時間
                </div>
              </div>
            </label>

            <label
              class="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer"
            >
              <input
                type="checkbox"
                v-model="sendStudentInfo"
                class="mt-1"
              />

              <div>
                <div class="text-sm font-medium text-gray-700">
                  學生資訊
                </div>

                <div class="text-xs text-gray-500">
                  AI 可讀取學生基本資訊
                </div>
              </div>
            </label>

            <label
              class="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer"
            >
              <input
                type="checkbox"
                v-model="sendGrades"
                class="mt-1"
              />

              <div>
                <div class="text-sm font-medium text-gray-700">
                  成績資料
                </div>

                <div class="text-xs text-gray-500">
                  AI 可分析學生學習表現
                </div>
              </div>
            </label>

          </div>
        </div>

        <!-- 儲存按鈕 -->
        <div class="flex justify-end pt-2">
          <button
            class="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm px-5 py-2 rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition"
            @click="savePrompt"
          >
            儲存設定
          </button>
        </div>

      </div>

      <!-- Chat Messages -->
      <div
        v-if="!['teacher', 'ta'].includes(role)"
        class="p-4 space-y-3"
        ref="chatContainer"
      >

        <template
          v-for="(msg, idx) in messagesWithDateSeparators"
          :key="idx"
        >

          <!-- 日期 -->
          <div
            v-if="msg.isDateSeparator"
            class="flex justify-center"
          >
            <div class="text-[11px] text-gray-400 bg-white px-3 py-1 rounded-full border">
              {{ msg.date }}
            </div>
          </div>

          <!-- 訊息 -->
          <div
            v-else
            class="flex flex-col"
            :class="msg.role === 'user' ? 'items-end' : 'items-start'"
          >

            <div
              :class="[
                'px-4 py-2 rounded-2xl max-w-[80%] text-sm shadow-sm break-words',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
              ]"
              v-html="renderMarkdown(msg.message)"
            ></div>

            <div class="text-[10px] text-gray-400 mt-1 px-1">
              {{ formatTime(msg.created_at) }}
            </div>

          </div>

        </template>

        <!-- loading -->
        <div
          v-if="loading"
          class="flex items-center gap-2 text-sm text-gray-400"
        >
          <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
          <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-100"></div>
          <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-200"></div>

          <span>AI 正在思考中...</span>
        </div>

      </div>

    </div>

    <!-- Input -->
    <div
      v-if="!['teacher', 'ta'].includes(role)"
      class="shrink-0 border-t border-gray-200 bg-white p-3"
    >

      <div class="flex items-center gap-2">

        <input
          type="text"
          v-model="input"
          @keydown.enter="handleSend"
          placeholder="輸入訊息..."
          :disabled="loading"
          class="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
        />

        <button
          @click="handleSend"
          :disabled="loading"
          class="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          發送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { marked } from 'marked'
import api from '@/api/client.js'

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
const sendGrades = ref(false)

const courseAiBase = () => `/api/courses/${props.courseCode?.trim() || ''}`

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
    const { data } = await api.post(`${courseAiBase()}/ai-assistant/remind`, {
      courseCode,
      studentCode,
    })

    reminder.value = data.reply || '⚠ 無法取得作業提醒'
  } catch {
    reminder.value = '⚠ 無法取得作業提醒'
  }
}

/* ======================
   Chat history（teacher 不打）
====================== */
const fetchChatHistory = async () => {
  if (['teacher', 'ta'].includes(props.role)) return

  const courseCode = props.courseCode?.trim()
  const studentCode = props.studentCode?.trim()

  if (!courseCode || !studentCode) return

  try {
    const { data } = await api.get(
      `${courseAiBase()}/ai-assistant/history/${courseCode}/${studentCode}`,
    )

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
    await api.put(`${courseAiBase()}/ai-prompts`, {
      chat_prompt: chatPrompt.value,
      discussion_prompt: discussionPrompt.value,
      grading_prompt: gradingPrompt.value,
      send_announcements: sendAnnouncements.value,
      send_assignments: sendAssignments.value,
      send_student_info: sendStudentInfo.value,
      send_grades: sendGrades.value
    })

    alert("✅ Prompt 更新成功")
    open.value = false

  } catch (err) {
    console.error(err)
    alert("❌ 更新失敗：" + (err.response?.data?.message || err.message))
  }
}

// ======================
// fetchTeacherPrompt
// ======================
const fetchTeacherPrompt = async () => {
  if (!['teacher', 'ta'].includes(props.role)) return

  try {
    const { data } = await api.get(`${courseAiBase()}/ai-prompts`)

    chatPrompt.value = data?.chat_prompt || ''
    discussionPrompt.value = data?.discussion_prompt || ''
    gradingPrompt.value = data?.grading_prompt || ''
    sendAnnouncements.value = !!data?.send_announcements
    sendAssignments.value = !!data?.send_assignments
    sendStudentInfo.value = !!data?.send_student_info
    sendGrades.value = !!data?.send_grades

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
  if (['teacher', 'ta'].includes(props.role)) return

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
    const { data } = await api.post(`${courseAiBase()}/ai-assistant/ask`, {
      courseCode: props.courseCode,
      studentCode: props.studentCode,
      userMessage: msgToSend
    })

    messages.value.push({
      role: 'assistant',
      message: data.reply || data.message || '已收到',
      created_at: new Date().toISOString()
    })

    scrollToBottom()
  } catch {
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
