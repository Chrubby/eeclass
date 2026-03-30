<template>
  <div class="flex flex-col gap-6">
    <div class="bg-white border rounded p-5 shadow-sm border-l-4 border-l-[#337ab7]">
      <h2 class="text-xl font-bold text-gray-800 mb-2">{{ homeworkTitle }}</h2>
      <div class="text-[15px] text-gray-600 flex gap-6">
        <span>截止日期：{{ homeworkDeadline }}</span>
        <span class="font-bold text-[#337ab7]">{{ progressText }}</span>
      </div>
    </div>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">作業題目與要求</div>
      <div class="p-5 space-y-4">
        <div v-for="(q, index) in questions" :key="q.id || index" class="border rounded-lg p-4 bg-gray-50">
          <h4 class="font-bold text-[#337ab7] mb-2 text-[16px]">{{ q.title }}</h4>
          <p class="text-[15px] text-gray-700 mb-3 whitespace-pre-line">{{ q.description || '（無題目說明）' }}</p>

          <div v-if="q.hasAttachment && q.filePath" class="flex items-start gap-2 border-t pt-3 mt-1 border-gray-200">
            <span class="text-[14px] font-bold text-gray-700 mt-1">題目附件：</span>
            <a
              :href="`${API_BASE_URL}${q.filePath}`"
              target="_blank"
              class="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-gray-600 text-sm rounded shadow-sm transition-colors"
            >
              {{ q.fileName || '下載附件' }}
            </a>
          </div>
        </div>
        <div v-if="questions.length === 0" class="text-gray-500">目前無題目資料</div>
      </div>
    </div>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700 flex justify-between items-center">
        <span>學生繳交清單</span>
      </div>

      <table class="w-full text-left text-[15px]">
        <thead class="bg-gray-50 text-gray-700 border-b">
          <tr>
            <th class="p-3 pl-5">學號 / 姓名</th>
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
const questions = ref([])
const submissions = ref([])

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
    submissions.value = subs.map((s) => ({
      ...s,
      uploadedAt: formatDate(s.submittedAt),
    }))
  } catch (error) {
    alert(error.message)
  }
}

onMounted(loadData)
</script>
