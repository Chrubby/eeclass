<template>
  <div class="flex flex-col gap-6">

    <div class="bg-blue-50 border border-blue-200 rounded p-5 flex justify-between items-center shadow-sm">
      <div>
        <h2 class="text-xl font-bold text-[#337ab7] mb-1">正在批改：學號 {{ studentData.id }}</h2>
        <p class="text-sm text-gray-600">繳交時間：{{ studentData.uploadedAt }}</p>
      </div>
      <div v-if="gradingForm.score" class="text-right">
        <span class="block text-sm text-gray-500 mb-1">目前成績</span>
        <span class="text-2xl font-black text-green-600">{{ gradingForm.score }}</span>
      </div>
    </div>

    <div class="flex gap-6 items-start">

      <div class="flex-1 flex flex-col gap-5">
        <div class="bg-white border rounded shadow-sm overflow-hidden">
          <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">學生作答內容</div>

          <div class="p-5 space-y-6">
            <div v-for="(ans, index) in studentAnswers" :key="ans.id" class="border rounded-lg p-5 bg-gray-50">
              <h4 class="font-bold text-[#337ab7] mb-2 text-[16px]">第 {{ index + 1 }} 題：{{ ans.questionTitle }}</h4>
              <p class="text-[14px] text-gray-600 mb-4 whitespace-pre-line border-b pb-3 border-gray-200">{{ ans.questionDescription }}</p>

              <div class="mt-3">
                <span class="text-[14px] font-bold text-gray-800 block mb-2">學生的回答：</span>

                <div v-if="ans.format === 'file'" class="bg-white p-4 border border-gray-200 rounded flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-700 font-bold">{{ ans.fileName || '未上傳檔案' }}</span>
                  </div>
                  <a v-if="ans.filePath" :href="`${API_BASE_URL}${ans.filePath}`" :download="ans.fileName" class="text-[#337ab7] hover:underline text-sm font-bold bg-blue-50 px-3 py-1 rounded border border-blue-200">
                    下載附件
                  </a>
                </div>

                <div v-else-if="ans.format === 'text'" class="bg-white p-4 border border-gray-200 rounded text-[15px] text-gray-700 whitespace-pre-line font-mono">
                  {{ ans.textAnswer || '（未作答）' }}
                </div>
              </div>

              <div class="mt-5 border-t border-gray-200 pt-4 flex flex-col gap-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-[13px] text-gray-500">此題滿分：<span class="font-bold text-gray-800">{{ ans.maxScore }}</span>（100 ÷ 子題數，餘數配於前幾題）</span>
                  <div class="flex items-center gap-3">
                    <span class="text-[14px] font-bold text-gray-700">此題得分：</span>
                    <input
                      v-model="ans.score"
                      type="number"
                      min="0"
                      :max="ans.maxScore"
                      step="0.5"
                      class="w-24 border border-gray-300 rounded px-2 py-1 text-center text-blue-600 font-bold focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-[14px] font-bold text-gray-700">此題評語：</span>
                  <textarea
                    v-model="ans.feedback"
                    rows="2"
                    placeholder="針對這題給點建議..."
                    class="border border-gray-300 rounded p-2 text-sm w-full outline-none focus:border-blue-400"
                  ></textarea>
                </div>

              </div>

            </div>
          </div>
        </div>
      </div>

      <div class="w-[320px] shrink-0 sticky top-6 flex flex-col gap-4">
        <div class="bg-white border rounded shadow-sm overflow-hidden">
          <div class="bg-[#337ab7] text-white px-5 py-3 font-bold text-center">評分與回饋</div>

          <form @submit.prevent="submitGrade" class="p-5 flex flex-col gap-4">
            <div>
              <div class="flex justify-between items-end mb-1">
                <label class="block text-sm font-bold text-gray-700">總分 <span class="text-red-500">*</span></label>
                <span class="text-[11px] text-[#337ab7] font-bold">系統會自動加總各題分數</span>
              </div>
              <input
                v-model="gradingForm.score"
                type="text"
                placeholder="例如: 85 或 A"
                required
                class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xl font-bold text-center text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
              />
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">給學生的整體評語</label>
              <textarea
                v-model="gradingForm.feedback"
                rows="6"
                placeholder="寫些鼓勵或建議的話吧..."
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

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const courseId = route.params.id
const hwId = route.params.hwId
const submissionId = route.params.submissionId
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const goBack = () => router.push(`/course/${courseId}/homework/${hwId}`)

const studentData = ref({
  id: '',
  uploadedAt: ''
})

function perQuestionMaxScores(n) {
  if (!n || n < 1) return [100]
  const base = Math.floor(100 / n)
  const rem = 100 - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0))
}

const studentAnswers = ref([])

const gradingForm = ref({
  score: '',
  feedback: ''
})

watch(
  () => studentAnswers.value,
  (newAnswers) => {
    const isAnyQuestionGraded = newAnswers.some(ans => Number(ans.score) > 0)

    if (isAnyQuestionGraded) {
      const total = newAnswers.reduce((sum, ans) => sum + (Number(ans.score) || 0), 0)
      gradingForm.value.score = String(total)
    }
  },
  { deep: true }
)

const loadData = async () => {
  try {
    const [subRes, hwRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/submissions/${submissionId}`),
      fetch(`${API_BASE_URL}/api/homeworks/${hwId}`)
    ])

    if (!subRes.ok || !hwRes.ok) throw new Error('讀取資料失敗')

    const subData = await subRes.json()
    const hwData = await hwRes.json()

    studentData.value = {
      id: subData.studentId,
      uploadedAt: subData.submittedAt ? new Date(subData.submittedAt).toLocaleString() : '-'
    }

    gradingForm.value.score = subData.score || ''
    gradingForm.value.feedback = subData.feedback || ''

    let parsedAnswers = []
    try {
      if (subData.answerText) {
        parsedAnswers = JSON.parse(subData.answerText)
      }
    } catch (e) {
      console.error("解析學生答案失敗", e)
    }

    let gradedDetails = []
    try {
      if (subData.graded_details) gradedDetails = JSON.parse(subData.graded_details)
    } catch (e) {
      console.error("解析每題評分失敗", e)
    }

    const qs = hwData.questions || []
    const maxScores = perQuestionMaxScores(qs.length)
    studentAnswers.value = qs.map((q, index) => {
      const detail = gradedDetails[index] || {}
      return {
        id: q.id || index,
        questionId: q.id,
        questionTitle: q.title,
        questionDescription: q.description,
        format: q.answerFormat || q.answer_format,
        textAnswer: parsedAnswers[index] || '',
        fileName: (q.answerFormat || q.answer_format) === 'file' ? subData.file_name : null,
        filePath: (q.answerFormat || q.answer_format) === 'file' ? subData.file_path : null,
        score: detail.score || '',
        feedback: detail.feedback || '',
        maxScore: maxScores[index] ?? 100,
      }
    })

  } catch (error) {
    alert(error.message)
    console.error(error)
  }
}

const submitGrade = async () => {
  try {
    const payload = {
      score: String(gradingForm.value.score),
      feedback: gradingForm.value.feedback,
      // 1. 名字改成 gradedDetails，對齊後端 server.js
      // 2. 拿掉 JSON.stringify，因為後端已經有寫轉 JSON 的功能了
      gradedDetails: studentAnswers.value.map(ans => ({
        score: ans.score,
        feedback: ans.feedback
      }))
    }

    const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.message || '評分失敗')

    alert('批改儲存成功')
    goBack()
  } catch (error) {
    alert(error.message)
    console.error(error)
  }
}

onMounted(loadData)
</script>
