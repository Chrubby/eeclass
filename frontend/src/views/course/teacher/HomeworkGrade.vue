<template>
  <div class="flex flex-col gap-6">

    <div class="bg-blue-50 border border-blue-200 rounded p-5 flex justify-between items-center shadow-sm">
      <div>
        <h2 class="text-xl font-bold text-[#337ab7] mb-1">正在批改：{{ studentData.name || '未命名' }}（{{ studentData.id }}）</h2>
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
                  <button
                    v-if="ans.filePath"
                    type="button"
                    class="text-[#337ab7] hover:underline text-sm font-bold bg-blue-50 px-3 py-1 rounded border border-blue-200 disabled:opacity-60"
                    :disabled="downloadingAnswerId === ans.questionId"
                    @click="onDownloadAnswer(ans)"
                  >
                    {{ downloadingAnswerId === ans.questionId ? '下載中...' : '下載附件' }}
                  </button>
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

                <div class="bg-indigo-50 border border-indigo-200 rounded p-3 text-sm">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold text-indigo-800">AI 建議評分（僅老師可見）</span>
                    <button
                      type="button"
                      class="px-3 py-1 rounded bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-60"
                      :disabled="aiLoadingId === ans.questionId || aiLoadingAll"
                      @click="aiGradeQuestion(ans)"
                    >
                      {{ aiLoadingId === ans.questionId ? 'AI 評分中...' : (ans.ai ? '重新評分' : 'AI 建議評分') }}
                    </button>
                  </div>
                  <p v-if="ans.aiError" class="mt-2 text-red-600">{{ ans.aiError }}</p>
                  <div v-else-if="ans.ai" class="mt-2 space-y-1 text-gray-700">
                    <p>建議分數：<span class="font-black text-indigo-700">{{ ans.ai.suggested_score }}</span> / {{ ans.maxScore }}</p>
                    <p v-if="ans.ai.reason" class="whitespace-pre-line"><span class="font-bold">評分理由：</span>{{ ans.ai.reason }}</p>
                    <p v-if="ans.ai.feedback" class="whitespace-pre-line"><span class="font-bold">建議評語：</span>{{ ans.ai.feedback }}</p>
                    <button type="button" class="mt-1 text-xs font-bold text-indigo-700 hover:underline" @click="applyAi(ans)">
                      套用建議分數與評語
                    </button>
                  </div>
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

        <div class="bg-white border rounded shadow-sm p-4 flex flex-col gap-3 text-sm">
          <div class="font-bold text-indigo-800">AI 評分助手</div>
          <p class="text-xs text-gray-500">依各題老師設定的評分 Prompt 產生建議，僅供參考，不會自動儲存。</p>
          <button
            type="button"
            class="w-full bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700 disabled:opacity-60"
            :disabled="aiLoadingAll || Boolean(aiLoadingId)"
            @click="aiGradeAll"
          >
            {{ aiLoadingAll ? 'AI 評分中...' : '全部題目 AI 建議評分' }}
          </button>
          <div v-if="aiTotal !== null" class="text-gray-700">
            AI 建議總分：<span class="font-black text-indigo-700 text-lg">{{ aiTotal }}</span>
            <button type="button" class="block mt-1 text-xs font-bold text-indigo-700 hover:underline" @click="applyAllAi">
              全部套用
            </button>
          </div>
          <button
            type="button"
            class="w-full border border-[#337ab7] text-[#337ab7] font-bold py-2 rounded hover:bg-blue-50 disabled:opacity-60"
            :disabled="pdfDownloading"
            @click="downloadMergedPdf"
          >
            {{ pdfDownloading ? '產生中...' : '下載此份合併 PDF' }}
          </button>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/client.js'
import { downloadFile, downloadApi } from '@/utils/files.js'

const route = useRoute()
const router = useRouter()
const courseId = route.params.id
const hwId = route.params.hwId
const submissionId = route.params.submissionId

const goBack = () => router.push(`/course/${courseId}/homework/${hwId}`)

const downloadingAnswerId = ref(null)
const onDownloadAnswer = async (ans) => {
  downloadingAnswerId.value = ans.questionId
  try {
    await downloadFile(ans.filePath, ans.fileName)
  } catch (e) {
    alert(e.response?.data?.message || '下載失敗，請確認檔案是否存在')
  } finally {
    downloadingAnswerId.value = null
  }
}

const studentData = ref({
  id: '',
  uploadedAt: ''
})

const aiLoadingId = ref(null)
const aiLoadingAll = ref(false)
const pdfDownloading = ref(false)

const aiTotal = computed(() => {
  const graded = studentAnswers.value.filter((ans) => ans.ai)
  if (!graded.length) return null
  return graded.reduce((sum, ans) => sum + (Number(ans.ai.suggested_score) || 0), 0)
})

const aiGradeQuestion = async (ans) => {
  aiLoadingId.value = ans.questionId
  ans.aiError = ''
  try {
    const { data } = await api.post(
      `/api/submissions/${submissionId}/questions/${ans.questionId}/ai-grade`,
      { homeworkId: hwId },
    )
    ans.ai = data
  } catch (e) {
    ans.aiError = e.response?.data?.message || 'AI 評分失敗'
  } finally {
    aiLoadingId.value = null
  }
}

const aiGradeAll = async () => {
  aiLoadingAll.value = true
  try {
    const { data } = await api.post(`/api/submissions/${submissionId}/ai-grade`, { homeworkId: hwId })
    for (const item of data.perQuestion || []) {
      const ans = studentAnswers.value.find((a) => a.questionId === item.questionId)
      if (!ans) continue
      if (item.error) {
        ans.ai = null
        ans.aiError = item.error
      } else {
        ans.ai = item
        ans.aiError = ''
      }
    }
  } catch (e) {
    alert(e.response?.data?.message || 'AI 評分失敗')
  } finally {
    aiLoadingAll.value = false
  }
}

const applyAi = (ans) => {
  if (!ans.ai) return
  ans.score = String(ans.ai.suggested_score)
  if (ans.ai.feedback) ans.feedback = ans.ai.feedback
}

const applyAllAi = () => studentAnswers.value.forEach(applyAi)

const downloadMergedPdf = async () => {
  pdfDownloading.value = true
  try {
    await downloadApi(`/api/submissions/${submissionId}/pdf`, `${studentData.value.id || 'submission'}-合併作答.pdf`)
  } catch (e) {
    alert(e.response?.data?.message || '下載失敗')
  } finally {
    pdfDownloading.value = false
  }
}

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
      api.get(`/api/submissions/${submissionId}`),
      api.get(`/api/homeworks/${hwId}`)
    ])

    const subData = subRes.data
    const hwData = hwRes.data

    studentData.value = {
      id: subData.studentId,
      name: subData.studentName || '',
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

    let storedFiles = []
    try {
      storedFiles = subData.files_json ? JSON.parse(subData.files_json) : []
    } catch {
      storedFiles = []
    }
    const qs = hwData.questions || []
    const maxScores = perQuestionMaxScores(qs.length)
    studentAnswers.value = qs.map((q, index) => {
      const detail = gradedDetails[index] || {}
      const isFile = (q.answerFormat || q.answer_format) === 'file'
      const stored = storedFiles[index]
      const legacy = index === 0 ? { file_name: subData.file_name, file_path: subData.file_path } : null
      const file = stored?.file_path ? stored : legacy
      return {
        id: q.id || index,
        questionId: q.id,
        questionTitle: q.title,
        questionDescription: q.description,
        format: q.answerFormat || q.answer_format,
        textAnswer: parsedAnswers[index] || '',
        fileName: isFile ? file?.file_name || null : null,
        filePath: isFile ? file?.file_path || null : null,
        score: detail.score || '',
        feedback: detail.feedback || '',
        maxScore: maxScores[index] ?? 100,
        ai: null,
        aiError: '',
      }
    })

  } catch (error) {
    alert(error.response?.data?.message || error.message)
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

    await api.post(`/api/submissions/${submissionId}/grade`, payload)

    alert('批改儲存成功')
    goBack()
  } catch (error) {
    alert(error.response?.data?.message || error.message)
    console.error(error)
  }
}

onMounted(loadData)
</script>
