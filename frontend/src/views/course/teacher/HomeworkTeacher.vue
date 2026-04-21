<template>
  <div class="flex flex-col gap-6">
    <div class="bg-white border rounded p-5 shadow-sm border-l-4 border-l-[#337ab7]">
      <h2 class="text-xl font-bold text-gray-800 mb-2">{{ homeworkTitle }}</h2>
      <div class="text-[15px] text-gray-600 flex gap-6">
        <span>截止日期：{{ homeworkDeadline }}</span>
        <span class="font-bold text-[#337ab7]">{{ progressText }}</span>
      </div>
    </div>

    <div v-if="homeworkAttachments.length" class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">作業附件（全班統一下載）</div>
      <div class="p-5 space-y-2">
        <a
          v-for="(att, i) in homeworkAttachments"
          :key="i"
          :href="`${API_BASE_URL}${att.file_path || att.filePath}`"
          target="_blank"
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded hover:bg-blue-100"
        >
          📎 {{ att.file_name || att.fileName || '附件' }}
        </a>
      </div>
    </div>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">作業題目與要求</div>
      <div class="p-5 space-y-4">
        <div v-for="(q, index) in questions" :key="q.id || index" class="border rounded-lg p-4 bg-gray-50">
          <h4 class="font-bold text-[#337ab7] mb-2 text-[16px]">{{ q.title }}</h4>
          <p class="text-[15px] text-gray-700 mb-3 whitespace-pre-line">{{ q.description || '（無題目說明）' }}</p>

          <div v-if="q.has_attachment && q.file_path" class="flex items-start gap-2 border-t pt-3 mt-1 border-gray-200">
            <span class="text-[14px] font-bold text-gray-700 mt-1">題目附件：</span>
            <a
              :href="`${API_BASE_URL}${q.file_path}`"
              target="_blank"
              :download="q.file_name"
              class="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-gray-600 text-sm rounded shadow-sm transition-colors"
            >
              {{ q.file_name || '下載附件' }}
            </a>
          </div>
        </div>
        <div v-if="questions.length === 0" class="text-gray-500">目前無題目資料</div>
      </div>
    </div>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700 flex justify-between items-center flex-wrap gap-2">
        <span>學生繳交清單</span>
      </div>

      <table class="w-full text-left text-[15px]">
        <thead class="bg-gray-50 text-gray-700 border-b">
          <tr>
            <th class="p-3 pl-5">學號</th>
            <th class="p-3">繳交時間</th>
            <th class="p-3">成績</th>
            <th class="p-3 pr-5">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="sub in submissions" :key="sub.id" class="hover:bg-blue-50 transition-colors">
            <td class="p-3 pl-5 font-bold text-gray-800">{{ sub.studentId }}</td>
            <td class="p-3 text-gray-500 text-sm">{{ sub.uploadedAt }}</td>
            <td class="p-3">
              <span v-if="sub.score" class="font-bold text-green-600 text-lg">{{ sub.score }}</span>
              <span v-else class="text-red-500 font-bold text-sm">未批改</span>
            </td>
            <td class="p-3 pr-5">
              <div class="flex items-center gap-2">
                <button
                  @click="router.push(`/course/${courseId}/homework/${hwId}/grade/${sub.id}`)"
                  class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-1.5 text-sm font-bold rounded hover:bg-blue-100 transition-colors"
                >
                  {{ sub.score ? '重新批改' : '批改' }}
                </button>
                <button
                  type="button"
                  class="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 text-sm font-bold rounded hover:bg-indigo-100 transition-colors"
                  :disabled="historyLoading"
                  @click.stop="openHistory(sub)"
                >
                  看歷程
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="submissions.length === 0" class="p-6 text-center text-gray-500">目前尚無學生繳交</div>
    </div>

    <div
      v-if="historyModalOpen"
      class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      @click.self="historyModalOpen = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[82vh] overflow-hidden flex flex-col border">
        <div class="px-4 py-3 border-b font-bold text-gray-800 flex justify-between items-center">
          <span>學生 {{ currentHistory?.submission?.studentId || '' }}：評分/修正完整歷程</span>
          <button type="button" class="text-gray-500 hover:text-gray-800 text-xl leading-none" @click="historyModalOpen = false">×</button>
        </div>
        <div class="p-4 overflow-y-auto space-y-3 text-sm">
          <div v-if="historyLoading" class="text-gray-500">讀取中...</div>
          <div v-else-if="!currentHistory?.history?.length" class="text-gray-500">尚無歷程資料</div>
          <div v-else class="space-y-4">
  <div v-for="item in currentHistory.history" :key="item.id" class="border rounded-lg p-4 bg-gray-50 shadow-sm">
    <div class="flex justify-between items-center mb-2 border-b pb-2">
      <span class="text-xs font-bold text-[#337ab7] uppercase tracking-wider">
        ● {{ eventTypeLabel(item.eventType) }}
      </span>
      <span class="text-xs text-gray-400">{{ formatDate(item.createdAt) }}</span>
    </div>

    <div class="text-[13px]">
      <div v-if="item.eventType === 'submit'" class="space-y-1">
        <p v-if="item.payload.hasFile" class="text-green-700">📎 繳交檔案：{{ item.payload.fileName }}</p>
        <p class="text-gray-700 font-medium">文字內容：</p>
        <div class="bg-white p-2 border rounded text-gray-600 italic">{{ item.payload.answerText }}</div>
      </div>

      <div v-else-if="['ai_suggestion', 'student_self_estimate'].includes(item.eventType)" class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="font-bold">預估總分：</span>
          <span class="text-lg text-indigo-600 font-black">{{ item.payload.suggested_score }}</span>
        </div>

        <div v-if="item.payload.perQuestion" class="mt-2 space-y-2">
          <div v-for="q in item.payload.perQuestion" :key="q.questionId" class="bg-indigo-50 p-2 rounded border border-indigo-100">
            <p class="font-bold text-indigo-800">第 {{ q.question_order }} 題評語：</p>
            <p class="text-gray-700">{{ q.reason }}</p>
          </div>
        </div>
        <div v-else>
          <p class="font-bold">AI 理由：</p>
          <p class="text-gray-700">{{ item.payload.reason }}</p>
        </div>
      </div>

      <div v-else-if="item.eventType === 'teacher_grade'" class="space-y-1">
        <p class="font-bold text-green-700">正式評分：{{ item.payload.score }}</p>
        <p class="text-gray-700">評語：{{ item.payload.feedback }}</p>
      </div>

      <div v-else-if="item.eventType === 'unsubmit'" class="text-red-500">
        學生收回了此份作業。
      </div>

      <pre v-else class="text-xs whitespace-pre-wrap break-words text-gray-500">{{ item.payload }}</pre>
    </div>
  </div>
</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const courseId = route.params.id
const hwId = route.params.hwId
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const homeworkTitle = ref('')
const homeworkDeadline = ref('')
const homeworkAttachments = ref([])
const questions = ref([])
const submissions = ref([])
const historyModalOpen = ref(false)
const historyLoading = ref(false)
const currentHistory = ref(null)

const formatDate = (raw) => (raw ? new Date(raw).toLocaleString() : '-')
const progressText = computed(() => {
  const total = submissions.value.length
  const graded = submissions.value.filter((s) => s.score).length
  return `批改進度：${graded} / ${total} 份`
})

const eventTypeLabel = (t) => ({
  submit: '學生送出',
  unsubmit: '學生收回',
  teacher_grade: '教師評分',
  ai_suggestion: 'AI 建議',
  student_self_estimate: '學生自行預估',
}[t] || t)

const loadData = async () => {
  try {
    const [hwRes, subRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/homeworks/${hwId}`),
      fetch(`${API_BASE_URL}/api/homeworks/${hwId}/submissions`),
    ])
    const hw = await hwRes.json()
    const subs = await subRes.json()
    if (!hwRes.ok) throw new Error(hw.message || '讀取作業失敗')
    if (!subRes.ok) throw new Error(subs.message || '讀取繳交資料失敗')

    homeworkTitle.value = hw.title
    homeworkDeadline.value = formatDate(hw.deadline)
    questions.value = hw.questions || []
    const raw = hw.attachments
    if (Array.isArray(raw) && raw.length) homeworkAttachments.value = raw
    else if (hw.attachment_url) homeworkAttachments.value = [{ file_path: hw.attachment_url, file_name: '附件' }]
    else homeworkAttachments.value = []

    submissions.value = subs.map((s) => ({
      ...s,
      uploadedAt: formatDate(s.submittedAt),
    }))
  } catch (error) {
    alert(error.message)
  }
}

const openHistory = async (sub) => {
  historyModalOpen.value = true
  historyLoading.value = true
  currentHistory.value = null
  try {
    const res = await fetch(`${API_BASE_URL}/api/submissions/${sub.id}/history`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || '讀取歷程失敗')
    currentHistory.value = data
  } catch (e) {
    alert(e.message)
    historyModalOpen.value = false
  } finally {
    historyLoading.value = false
  }
}

onMounted(loadData)
</script>
