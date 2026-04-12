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
        <button
          type="button"
          :disabled="batchLoading || submissions.length === 0"
          class="text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="runBatchAiGrade"
        >
          {{ batchLoading ? '全班預評分中…' : '一鍵全班 AI 預評分' }}
        </button>
      </div>

      <table class="w-full text-left text-[15px]">
        <thead class="bg-gray-50 text-gray-700 border-b">
          <tr>
            <th class="p-3 pl-5">學號</th>
            <th class="p-3">繳交時間</th>
            <th class="p-3">分數</th>
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
              <button
                @click="router.push(`/course/${courseId}/homework/${hwId}/grade/${sub.id}`)"
                class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-1.5 text-sm font-bold rounded hover:bg-blue-100 transition-colors"
              >
                {{ sub.score ? '重新批改' : '批改' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="submissions.length === 0" class="p-6 text-center text-gray-500">目前尚無學生繳交</div>
    </div>

    <div
      v-if="batchModalOpen"
      class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      @click.self="batchModalOpen = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col border">
        <div class="px-4 py-3 border-b font-bold text-gray-800 flex justify-between items-center">
          <span>全班 AI 預評分結果</span>
          <button type="button" class="text-gray-500 hover:text-gray-800 text-xl leading-none" @click="batchModalOpen = false">×</button>
        </div>
        <div class="overflow-y-auto p-3 text-sm space-y-2">
          <div
            v-for="row in batchResults"
            :key="row.submissionId"
            class="border rounded p-2"
          >
            <div class="font-bold text-[#337ab7]">
              學號 {{ row.studentId }}
              <span v-if="row.error" class="text-red-600 text-xs ml-2">{{ row.error }}</span>
              <span v-else class="text-indigo-600 text-xs ml-2">建議分：{{ row.suggested_score }}</span>
            </div>
            <p v-if="!row.error && row.reason" class="text-gray-600 text-xs mt-1">{{ row.reason }}</p>
            <div v-if="!row.error && row.perQuestion && row.perQuestion.length" class="mt-2 pl-2 border-l-2 border-indigo-200 space-y-1">
              <div v-for="pq in row.perQuestion" :key="pq.questionId" class="text-[11px] text-gray-700">
                <span class="font-bold text-indigo-800">子題 {{ pq.question_order ?? pq.questionId }}</span>
                <span v-if="pq.error" class="text-red-600 ml-1">{{ pq.error }}</span>
                <span v-else class="ml-1">建議 {{ pq.suggested_score }} / {{ pq.max_score }}</span>
              </div>
            </div>
            <p v-else-if="!row.error && row.feedback" class="text-gray-700 text-xs mt-1 whitespace-pre-line">{{ row.feedback }}</p>
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
const batchLoading = ref(false)
const batchModalOpen = ref(false)
const batchResults = ref([])

const formatDate = (raw) => (raw ? new Date(raw).toLocaleString() : '-')
const progressText = computed(() => {
  const total = submissions.value.length
  const graded = submissions.value.filter((s) => s.score).length
  return `批改進度：${graded} / ${total} 份`
})

const loadData = async () => {
  try {
    const [hwRes, subRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/homework/${hwId}`),
      fetch(`${API_BASE_URL}/api/homework/${hwId}/submissions`),
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

const runBatchAiGrade = async () => {
  if (!submissions.value.length) return
  batchLoading.value = true
  batchResults.value = []
  try {
    const res = await fetch(`${API_BASE_URL}/api/homework/${hwId}/ai-grade-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || '批次預評分失敗')
    batchResults.value = data.results || []
    batchModalOpen.value = true
  } catch (e) {
    alert(e.message)
  } finally {
    batchLoading.value = false
  }
}

onMounted(loadData)
</script>
