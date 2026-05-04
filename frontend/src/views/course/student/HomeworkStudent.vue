<template>
  <div class="flex flex-col gap-6">
    <div class="bg-white border rounded p-5 shadow-sm border-l-4 border-l-[#337ab7]">
      <h2 class="text-xl font-bold text-gray-800 mb-2">{{ homeworkData.title }}</h2>
      <div class="text-[15px] text-gray-600 flex flex-wrap gap-6">
        <span>截止日期：{{ homeworkData.deadlineText }}</span>
        <span>
          狀態：
          <span :class="homeworkData.isGraded ? 'text-green-600 font-bold' : homeworkData.isSubmitted ? 'text-blue-600 font-bold' : 'text-orange-500 font-bold'">
            {{ homeworkData.isGraded ? '已批改' : homeworkData.isSubmitted ? '已繳交' : '未繳交' }}
          </span>
        </span>
      </div>
      <p
        v-if="isPastDeadline && !homeworkData.isGraded && !homeworkData.isSubmitted"
        class="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2"
      >
        已超過繳交截止時間，無法再送出作業。
      </p>

      <div v-if="homeworkAttachments.length" class="mt-4 pt-4 border-t border-gray-200">
        <span class="text-sm font-bold text-gray-700 block mb-2">老師提供的附件（請下載參考）</span>
        <ul class="space-y-2">
          <li v-for="(att, i) in homeworkAttachments" :key="i">
            <a
              :href="`${API_BASE_URL}${attachmentHref(att)}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-blue-600 hover:underline font-medium"
            >
              📎 {{ attachmentName(att) }}
            </a>
          </li>
        </ul>
      </div>
    </div>


    <div v-if="homeworkData.isGraded" class="bg-green-50 border border-green-200 rounded p-5 shadow-sm">
      <h3 class="text-lg font-bold text-green-800 mb-4 border-b border-green-200 pb-2">批改結果</h3>
      <div class="flex flex-col gap-4">
        <div>
          <span class="text-sm font-bold text-green-700 block mb-1">獲得分數：</span>
          <span class="text-3xl font-black text-green-600">{{ homeworkData.score }}</span>
        </div>
        <div>
          <span class="text-sm font-bold text-green-700 block mb-1">老師評語：</span>
          <p class="text-green-900 whitespace-pre-line">{{ homeworkData.feedback || '（無評語）' }}</p>
        </div>
        <div v-if="homeworkData.questions && homeworkData.questions.length" class="border-t border-green-200 pt-4">
          <span class="text-sm font-bold text-green-800 block mb-2">各題得分清單（每題滿分依題數分配，總和為 100）</span>
          <div class="overflow-x-auto rounded border border-green-200 bg-white">
            <table class="w-full text-sm text-left">
              <thead class="bg-green-100/80 text-green-900">
                <tr>
                  <th class="p-2 pl-3">題次</th>
                  <th class="p-2">滿分</th>
                  <th class="p-2">得分</th>
                  <th class="p-2 pr-3">評語</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-green-100">
                <tr v-for="(q, index) in homeworkData.questions" :key="q.id || index">
                  <td class="p-2 pl-3 font-medium text-gray-800">第 {{ index + 1 }} 題</td>
                  <td class="p-2 text-gray-600">{{ questionMaxScores[index] ?? '—' }}</td>
                  <td class="p-2 font-bold text-green-700">{{ (homeworkData.gradedDetails && homeworkData.gradedDetails[index] && homeworkData.gradedDetails[index].score) || '—' }}</td>
                  <td class="p-2 pr-3 text-gray-700 whitespace-pre-line">{{ (homeworkData.gradedDetails && homeworkData.gradedDetails[index] && homeworkData.gradedDetails[index].feedback) || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="homeworkData.isSubmitted && !homeworkData.isGraded" class="bg-indigo-50 border border-indigo-200 rounded p-5 shadow-sm">
      <h3 class="text-lg font-bold text-indigo-800 mb-3 border-b border-indigo-200 pb-2">AI 預估評分</h3>
      <div class="mb-3">
        <button
          type="button"
          class="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
          :disabled="estimating"
          @click="estimateMyScore"
        >
          {{ estimating ? '預估中...' : '產生我的預估評分' }}
        </button>
      </div>
      <div v-if="homeworkData.aiEstimatedScore !== null && homeworkData.aiEstimatedScore !== undefined">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p class="text-xs text-indigo-700">最後一次 AI 預估分數（僅供參考，不代表最終成績）</p>
          <p class="text-3xl font-black text-indigo-600 mt-1">{{ homeworkData.aiEstimatedScore }}</p>
        </div>
        <p class="text-xs text-indigo-700">{{ homeworkData.aiEstimatedAt ? `更新時間：${homeworkData.aiEstimatedAt}` : '' }}</p>
      </div>
      <p v-if="homeworkData.aiEstimatedReason" class="text-sm text-indigo-900 bg-white border border-indigo-100 rounded p-3 mt-3 whitespace-pre-line">
        {{ homeworkData.aiEstimatedReason }}
      </p>
      </div>
      <p v-else class="text-sm text-indigo-700">尚未產生預估評分，請先點擊上方按鈕。</p>
    </div>

    <div  class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">作業題目內容</div>

      <div class="p-5 space-y-8">
        <div v-for="(q, index) in homeworkData.questions" :key="q.id" class="border-b pb-6 last:border-0">
          <h3 class="font-bold text-[#337ab7] mb-2">第 {{ index + 1 }} 題：{{ q.title }}</h3>
          <p class="text-xs text-gray-500 mb-1">此題滿分：{{ questionMaxScores[index] ?? '—' }}（全班同一配分規則：100 ÷ 子題數，餘數配在前幾題）</p>
          <p class="text-gray-700 whitespace-pre-line mb-4">{{ q.description || '（無題目說明）' }}</p>

          <div v-if="legacyQuestionAttachment(q)" class="mb-4">
            <a :href="`${API_BASE_URL}${q.filePath || q.file_path}`" target="_blank" class="text-sm text-blue-600 hover:underline flex items-center gap-1">
              📎 下載題目附件（舊版）：{{ q.fileName || q.file_name }}
            </a>
          </div>

          <div v-if="q.answerFormat === 'text'">
            <label class="block text-xs font-bold text-gray-500 mb-1">文字作答</label>
            <textarea
              v-model="answers[index]"
              rows="4"
              :disabled="answerInputsDisabled"
              placeholder="請在此輸入答案..."
              class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors resize-y"
            ></textarea>
          </div>

          <div v-else>
            <label class="block text-xs font-bold text-gray-500 mb-1">上傳檔案</label>
            <input type="file" accept=".pdf" @change="handleFileChange(index, $event)" :disabled="answerInputsDisabled" class="block w-full text-xs text-gray-600" />

            <div v-if="homeworkData.isSubmitted && homeworkData.submittedFileName" class="mt-2 text-xs font-bold text-green-600 bg-green-50 p-2 rounded border border-green-200 inline-block">
              已繳交檔案：{{ homeworkData.submittedFileName }}
            </div>
          </div>

          <div v-if="homeworkData.isGraded && homeworkData.gradedDetails && homeworkData.gradedDetails[index]" class="mt-4 bg-green-50 p-4 rounded border border-green-200">
             <div class="font-bold text-green-700 mb-1">此題得分：{{ homeworkData.gradedDetails[index].score || '未給分' }}</div>
             <div class="text-green-800 text-sm whitespace-pre-line">此題評語：<br>{{ homeworkData.gradedDetails[index].feedback || '無' }}</div>
          </div>
        </div>
      </div>

      <div v-if="!homeworkData.isGraded" class="bg-gray-50 px-5 py-4 border-t flex justify-end gap-3">
        <button v-if="homeworkData.isSubmitted" @click="unsubmitHomework" class="bg-red-500 text-white px-8 py-2.5 rounded text-[16px] hover:bg-red-600 transition-colors">
          收回作業
        </button>
        <button
          v-else
          :disabled="isPastDeadline"
          @click="submitHomework"
          class="bg-[#337ab7] text-white px-8 py-2.5 rounded text-[16px] hover:bg-[#285e8e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          確認送出作業
        </button>
      </div>
    </div>
  </div>

  <!-- AI 助教（浮動） -->
  <button
    v-if="homeworkData.questions && homeworkData.questions.length"
    type="button"
    class="fixed bottom-6 right-6 z-40 bg-indigo-600 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center text-2xl hover:bg-indigo-700 border-2 border-white"
    aria-label="開啟 AI 助教"
    @click="chatOpen = true"
  >
    💬
  </button>

  <div
    v-if="chatOpen"
    class="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-6"
    @click.self="chatOpen = false"
  >
    <div
      class="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col border border-gray-200 overflow-hidden max-h-[85vh]"
      @click.stop
    >
      <div class="bg-indigo-700 text-white px-4 py-3 flex justify-between items-center">
        <span class="font-bold text-sm">AI 助教</span>
        <button type="button" class="text-white/90 hover:text-white text-lg leading-none" @click="chatOpen = false">×</button>
      </div>
      <div ref="chatScrollRef" class="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 text-sm min-h-[220px] max-h-[45vh]">
        <div
          v-for="(m, i) in chatMessages"
          :key="i"
          :class="m.role === 'user' ? 'text-right' : 'text-left'"
        >
          <span
            :class="[
              'inline-block max-w-[90%] rounded-lg px-3 py-2 whitespace-pre-wrap break-words',
              m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800',
            ]"
          >{{ m.content }}</span>
        </div>
        <div v-if="chatLoading" class="text-xs text-gray-500">AI 思考中…</div>
      </div>
      <div class="p-2 border-t bg-white flex gap-2">
        <input
          v-model="chatInput"
          type="text"
          class="flex-1 border rounded px-2 py-1.5 text-sm"
          placeholder="輸入訊息…（未選題號前請先回覆數字）"
          @keydown.enter.prevent="sendChat"
        />
        <button
          type="button"
          class="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-bold shrink-0 disabled:opacity-50"
          :disabled="chatLoading"
          @click="sendChat"
        >
          送出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const hwId = route.params.hwId
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const studentId = localStorage.getItem('userId') || localStorage.getItem('user') || ''

function perQuestionMaxScores(n) {
  if (!n || n < 1) return [100]
  const base = Math.floor(100 / n)
  const rem = 100 - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0))
}

const homeworkData = ref({
  title: '',
  description: '',
  deadlineText: '-',
  deadlineRaw: null,
  questions: [],
  isGraded: false,
  isSubmitted: false,
  score: null,
  feedback: '',
  submittedFileName: null,
  attachments: [],
  attachment_url: null,
})

const isPastDeadline = computed(() => {
  const d = homeworkData.value.deadlineRaw
  if (!d) return false
  return new Date() > new Date(d)
})

/** 已批改、或已過期且尚未繳交時，不可編輯作答區 */
const answerInputsDisabled = computed(
  () => homeworkData.value.isGraded || (isPastDeadline.value && !homeworkData.value.isSubmitted),
)

const questionMaxScores = computed(() => perQuestionMaxScores(homeworkData.value.questions?.length || 0))

const homeworkAttachments = computed(() => {
  const raw = homeworkData.value.attachments
  if (Array.isArray(raw) && raw.length) return raw
  const u = homeworkData.value.attachment_url
  if (u) return [{ file_path: u, file_name: '附件' }]
  return []
})

const attachmentHref = (att) => att?.file_path || att?.filePath || ''
const attachmentName = (att) => att?.file_name || att?.fileName || '下載'

const legacyQuestionAttachment = (q) =>
  (q.hasAttachment || q.has_attachment) && (q.filePath || q.file_path)

const answers = ref([]) // 存文字
const files = ref([])   // 存檔案
const estimating = ref(false)

const chatOpen = ref(false)
const chatInput = ref('')
const chatLoading = ref(false)
const chatMessages = ref([
  {
    role: 'assistant',
    content: '您好！我是 AI 助教。請問您想諮詢第幾子題？請回覆題號數字（例如 1）。',
  },
])
/** 選定子題後，只把此陣列送給後端以節省 token 並避免題號前後文干擾 */
const chatApiMessages = ref([])
const activeQuestionId = ref(null)
const chatScrollRef = ref(null)

const scrollChatToBottom = async () => {
  await nextTick()
  const el = chatScrollRef.value
  if (el) el.scrollTop = el.scrollHeight
}

watch(chatMessages, () => scrollChatToBottom(), { deep: true })

const sendChat = async () => {
  const text = chatInput.value.trim()
  if (!text || chatLoading.value) return
  chatInput.value = ''
  chatMessages.value.push({ role: 'user', content: text })

  if (!activeQuestionId.value) {
    const n = Number.parseInt(text, 10)
    const qs = homeworkData.value.questions || []
    if (Number.isInteger(n) && n >= 1 && n <= qs.length) {
      const q = qs[n - 1]
      activeQuestionId.value = q.id
      const line = `已選擇第 ${n} 題：${q.title}。請描述您的疑惑；我不會透露評分標準或分數。`
      chatMessages.value.push({ role: 'assistant', content: line })
      chatApiMessages.value = []
      return
    }
    chatMessages.value.push({
      role: 'assistant',
      content: `請輸入 1 到 ${qs.length || 1} 之間的題號數字。`,
    })
    return
  }

  chatApiMessages.value.push({ role: 'user', content: text })
  chatLoading.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/api/homeworks/${hwId}/questions/${activeQuestionId.value}/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatApiMessages.value }), // body 只需要傳 messages
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'AI 回覆失敗')
    const reply = data.reply || '（無回覆）'
    chatApiMessages.value.push({ role: 'assistant', content: reply })
    chatMessages.value.push({ role: 'assistant', content: reply })
  } catch (e) {
    chatMessages.value.push({
      role: 'assistant',
      content: `抱歉，暫時無法取得 AI 回覆：${e.message}`,
    })
    chatApiMessages.value.pop()
  } finally {
    chatLoading.value = false
  }
}

const loadData = async () => {
  try {
    const [hwRes, listRes, mySubRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/homeworks/${hwId}`),
      fetch(`${API_BASE_URL}/api/courses/${route.params.id}/homeworks?userId=${encodeURIComponent(studentId)}&role=student`),
      fetch(`${API_BASE_URL}/api/homeworks/${hwId}/submissions/me?studentId=${encodeURIComponent(studentId)}`)
    ])

    const hw = await hwRes.json()
    const list = await listRes.json()
    const mySub = await mySubRes.json()

    const current = list.find((x) => Number(x.id) === Number(hwId))

    let gradedDetails = []
    try {
      if (mySub?.graded_details) gradedDetails = JSON.parse(mySub.graded_details)
    } catch(e) {}

    homeworkData.value = {
      ...hw,
      deadlineRaw: hw.deadline || null,
      deadlineText: hw.deadline ? new Date(hw.deadline).toLocaleString() : '-',
      isSubmitted: Boolean(current?.submissionId),
      isGraded: Boolean(current?.score),
      score: current?.score || null,
      feedback: current?.feedback || '',
      submittedFileName: mySub?.file_name || null,
      gradedDetails: gradedDetails,
      aiEstimatedScore: mySub?.ai_estimated_score ?? null,
      aiEstimatedReason: mySub?.ai_estimated_reason || '',
      aiEstimatedAt: mySub?.ai_estimated_at ? new Date(mySub.ai_estimated_at).toLocaleString() : '',
    }

    if (hw.questions) {
      answers.value = new Array(hw.questions.length).fill('')
      files.value = new Array(hw.questions.length).fill(null)

      if (mySub && mySub.answer_text) {
        try {
          const savedAnswers = JSON.parse(mySub.answer_text)
          for(let i = 0; i < savedAnswers.length; i++) {
            if (savedAnswers[i]) {
              answers.value[i] = savedAnswers[i]
            }
          }
        } catch (e) {
          console.error("解析舊文字答案失敗", e)
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

const handleFileChange = (index, event) => {
  const file = event.target.files[0]
  if (file && file.type !== 'application/pdf') {
    alert('只能上傳 PDF 檔案！')
    event.target.value = ''
    files.value[index] = null
    return
  }
  files.value[index] = file || null
}

const submitHomework = async () => {
  if (isPastDeadline.value) {
    alert('已超過繳交截止時間，無法繳交作業')
    return
  }
  const hasFile = files.value.some((f) => f != null)
  const hasText = (answers.value || []).some((a) => String(a || '').trim() !== '')
  if (!hasFile && !hasText) {
    alert('不能繳交空內容')
    return
  }
  try {
    const formData = new FormData()
    formData.append('studentId', studentId)

    formData.append('answerText', JSON.stringify(answers.value))

    if (files.value.some(f => f !== null)) {
      const firstFile = files.value.find(f => f !== null)
      formData.append('file', firstFile)
    }

    const response = await fetch(`${API_BASE_URL}/api/homeworks/${hwId}/submissions`, {
      method: 'POST',
      body: formData,
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    alert(result.message)
    await loadData()
  } catch (error) {
    alert(error.message)
  }
}

const estimateMyScore = async () => {
  if (!homeworkData.value.isSubmitted) {
    alert('請先送出作業後再進行預估評分')
    return
  }
  estimating.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/api/homeworks/${hwId}/self-estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || '預估評分失敗')
    homeworkData.value.aiEstimatedScore = data.suggested_score
    homeworkData.value.aiEstimatedReason = data.reason || ''
    homeworkData.value.aiEstimatedAt = new Date().toLocaleString()
  } catch (error) {
    alert(error.message)
  } finally {
    estimating.value = false
  }
}

const unsubmitHomework = async () => {
  if (!confirm('確定要收回作業嗎？')) {
    return
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/homeworks/${hwId}/submissions/me`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.message || '收回失敗')

    alert(result.message)

    answers.value = new Array(answers.value.length).fill('')
    files.value = new Array(files.value.length).fill(null)
    homeworkData.value.submittedFileName = null

    await loadData()
  } catch (error) {
    alert(error.message)
  }
}

onMounted(loadData)
</script>
