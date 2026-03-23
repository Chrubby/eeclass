<template>
  <div class="flex flex-col gap-6">
    <div class="bg-blue-50 border border-blue-200 rounded p-5 flex justify-between items-center shadow-sm">
      <div>
        <h2 class="text-xl font-bold text-[#337ab7] mb-1">正在批改：{{ studentData.name }} ({{ studentData.id }})</h2>
        <p class="text-sm text-gray-600">繳交時間：{{ studentData.uploadedAt }}</p>
      </div>
      <div v-if="gradingForm.score" class="text-right">
        <span class="block text-sm text-gray-500 mb-1">目前成績</span>
        <span class="text-2xl font-black text-green-600">{{ gradingForm.score }}</span>
      </div>
    </div>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">學生提交內容</div>
      <div class="p-5">
        <div v-if="submissionType === 'text'" class="whitespace-pre-line text-gray-700">
          {{ submissionContent || '（無文字內容）' }}
        </div>
        <div v-else class="text-gray-700">
          <a v-if="submissionFilePath" :href="`${API_BASE_URL}${submissionFilePath}`" target="_blank" class="text-blue-600 hover:underline">
            下載檔案：{{ submissionFileName || '附件' }}
          </a>
          <span v-else>（未找到檔案）</span>
        </div>
      </div>
    </div>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-[#337ab7] text-white px-5 py-3 font-bold text-center">評分與回饋</div>
      <form @submit.prevent="submitGrade" class="p-5 flex flex-col gap-4">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">分數 (或等第) <span class="text-red-500">*</span></label>
          <input
            v-model="gradingForm.score"
            type="text"
            required
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xl font-bold text-center text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
          />
        </div>
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">給學生的評語</label>
          <textarea
            v-model="gradingForm.feedback"
            rows="6"
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors resize-y"
          ></textarea>
        </div>
        <button
          type="submit"
          class="w-full bg-green-600 text-white font-bold py-2.5 rounded hover:bg-green-700 transition-colors mt-2"
        >
          儲存成績並返回
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const courseId = route.params.id
const hwId = route.params.hwId
const submissionId = route.params.submissionId
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000"

const studentData = ref({
  id: '',
  name: '',
  uploadedAt: ''
})

const gradingForm = ref({
  score: '',
  feedback: ''
})
const submissionType = ref('text')
const submissionContent = ref('')
const submissionFileName = ref('')
const submissionFilePath = ref('')

const loadSubmission = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`)
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || '讀取提交資料失敗')
    studentData.value = {
      id: result.studentId,
      name: result.studentId,
      uploadedAt: result.submittedAt ? new Date(result.submittedAt).toLocaleString() : '-'
    }
    submissionType.value = result.submissionType || 'text'
    submissionContent.value = result.answerText || ''
    submissionFileName.value = result.fileName || ''
    submissionFilePath.value = result.filePath || ''
    gradingForm.value.score = result.score || ''
    gradingForm.value.feedback = result.feedback || ''
  } catch (error) {
    alert(error.message)
  }
}

const submitGrade = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: gradingForm.value.score,
        feedback: gradingForm.value.feedback,
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || '批改失敗')
    alert(result.message)
    router.push(`/course/${courseId}/homework/${hwId}`)
  } catch (error) {
    alert(error.message)
  }
}

onMounted(loadSubmission)
</script>
