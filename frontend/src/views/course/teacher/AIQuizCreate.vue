<template>
  <div class="flex flex-col gap-6">

    <!-- AI 輔助出題設定區 -->
    <div class="bg-white border border-[#337ab7] rounded shadow-sm overflow-hidden">
      <div class="bg-blue-50 px-5 py-3 border-b border-[#337ab7] font-bold text-[#337ab7] flex items-center gap-2">
        <span> AI 測驗出題設定</span>
      </div>

      <div class="p-6 flex flex-col gap-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 上傳參考教材 -->
          <div>
            <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
              上傳測驗教材 (PDF) <span class="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf"
              @change="onReferenceFileChange"
              class="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#337ab7] file:text-white hover:file:bg-[#285e8e] cursor-pointer border border-gray-300 rounded bg-white"
            />
            <p class="mt-1 text-xs text-gray-500">此檔案將提供給 AI 出題，發布後也會直接提供給學生閱讀。</p>
          </div>

          <!-- 指定題數 -->
          <div>
            <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
              指定生成題數 <span class="text-red-500">*</span>
            </label>
            <input
              v-model.number="aiConfig.questionCount"
              type="number"
              min="1"
              max="20"
              class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-[#337ab7] focus:bg-[#eef3fe] transition-colors"
            />
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="button"
            @click="generateAIQuestions"
            :disabled="isGenerating || !aiConfig.file"
            class="bg-[#337ab7] text-white px-6 py-2 rounded text-[15px] font-bold hover:bg-[#285e8e] shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg v-if="isGenerating" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ isGenerating ? 'AI 正在努力閱讀與出題...' : 'AI 出題' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 作業基本設定 -->
    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">
        測驗基本設定
      </div>
      <div class="p-6 flex flex-col gap-5 md:flex-row">
        <div class="flex-1">
          <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
            測驗名稱 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.title"
            type="text"
            placeholder="例如：第一次平時測驗"
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-[#337ab7] focus:bg-[#eef3fe] transition-colors"
          />
        </div>

        <div class="flex-1">
          <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
            截止日期與時間 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.deadline"
            type="datetime-local"
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-[#337ab7] focus:bg-[#eef3fe] transition-colors"
          />
        </div>
      </div>
    </div>

    <!-- 題目設定區 -->
    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700 flex justify-between items-center">
        <span>題目設定 (可手動修改 AI 生成結果)</span>
        <span class="text-sm font-normal text-gray-500">目前共 {{ form.questions.length }} 題</span>
      </div>

      <div class="p-6 flex flex-col gap-6">

        <div
          v-for="(q, index) in form.questions"
          :key="index"
          class="border border-gray-200 rounded-lg p-5 bg-gray-50 relative"
        >
          <button
            @click="removeQuestion(index)"
            class="absolute top-4 right-4 text-red-400 hover:text-red-600 font-bold text-sm"
          >
            X 移除此題
          </button>

          <h4 class="font-bold text-[#337ab7] mb-4 text-[16px] border-b pb-2">第 {{ index + 1 }} 題</h4>

          <div class="flex flex-col gap-4">
            <!-- 題目內容 -->
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">
                題目內容 <span class="text-red-500">*</span>
              </label>
              <textarea
                v-model="q.questionText"
                rows="3"
                placeholder="請輸入題目內容..."
                class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#337ab7] focus:bg-[#eef3fe] transition-colors resize-y"
              ></textarea>
            </div>

            <!-- AI 討論 Prompt -->
            <details class="border border-blue-100 rounded-lg bg-blue-50/40 overflow-hidden" open>
              <summary class="cursor-pointer select-none px-3 py-2 text-sm font-bold text-[#337ab7] bg-blue-50 border-b border-blue-100 hover:bg-blue-100/50 transition-colors">
                AI 討論與回饋設定
              </summary>
              <div class="p-3 bg-white">
                <div class="flex flex-wrap gap-2 mb-2">
                  <button type="button" class="text-xs px-2.5 py-1 rounded border border-[#337ab7] text-[#337ab7] hover:bg-blue-50 transition-colors font-medium" @click.prevent="applyPromptTemplate(index, 'socratic')">範本：蘇格拉底式引導</button>
                  <button type="button" class="text-xs px-2.5 py-1 rounded border border-[#337ab7] text-[#337ab7] hover:bg-blue-50 transition-colors font-medium" @click.prevent="applyPromptTemplate(index, 'direct')">範本：邏輯導向</button>
                </div>
                <textarea
                  v-model="q.discussionPrompt"
                  rows="4"
                  placeholder="告訴 AI 當學生作答後，要如何給予回饋與討論 (例如：先給予肯定，再指出盲點...)"
                  class="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:border-[#337ab7] focus:outline-none focus:bg-[#eef3fe] resize-y"
                ></textarea>
              </div>
            </details>
          </div>
        </div>

        <div v-if="form.questions.length === 0" class="text-center py-6 text-gray-500 text-sm">
          目前沒有任何題目，請點擊上方讓 AI 幫忙出題，或手動新增。
        </div>

        <div class="flex gap-4">
          <button
            type="button"
            @click="addQuestion"
            class="flex-1 py-3 border-2 border-dashed border-[#337ab7] text-[#337ab7] font-bold rounded-lg hover:bg-blue-50 transition-colors flex justify-center items-center gap-2"
          >
            ＋ 手動新增一道題目
          </button>

          <button
            v-if="form.questions.length > 0"
            type="button"
            @click="generateAIQuestions"
            class="flex-1 py-3 border-2 border-dashed border-[#337ab7] text-[#337ab7] font-bold rounded-lg hover:bg-blue-50 transition-colors flex justify-center items-center gap-2"
          >
            ↻ 不滿意？重新請 AI 出題
          </button>
        </div>

      </div>
    </div>

    <!-- 底部按鈕 -->
    <div class="flex justify-end gap-3 mt-2">
      <button
        type="button"
        @click="goBack"
        class="px-6 py-2.5 rounded text-[15px] font-bold text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors"
      >
        取消
      </button>
      <button
        type="button"
        @click="submitAssignment"
        class="bg-[#337ab7] text-white px-10 py-2.5 rounded text-[15px] font-bold tracking-widest hover:bg-[#285e8e] shadow-sm transition-colors"
      >
        確認發布作業
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/client.js'
import { getUsernameFromToken } from '@/utils/auth.js'

const router = useRouter()
const route = useRoute()

const courseId = route.params.id || route.params.courseId
const teacherId = getUsernameFromToken() || localStorage.getItem('user') || ''

const isGenerating = ref(false)
const aiConfig = ref({
  file: null,
  questionCount: 3
})

const form = ref({
  title: '',
  deadline: '',
  questions: []
})

const goBack = () => {
  router.push(`/course/${courseId}/aiquiz`)
}

const onReferenceFileChange = (event) => {
  const file = event.target.files?.[0] || null
  if (file && file.type === 'application/pdf') {
    aiConfig.value.file = file
  } else if (file) {
    alert('請上傳 PDF 格式的檔案')
    event.target.value = ''
  }
}

// 🌐 呼叫 API：讓 AI 讀取 PDF 並產生題目
const generateAIQuestions = async () => {
  if (!aiConfig.value.file) {
    alert('請先上傳一份教材 (PDF)！')
    return
  }

  if (form.value.questions.length > 0) {
    const confirmOverwrite = confirm('重新讓 AI 出題將會覆蓋您目前的題目列表，確定要繼續嗎？')
    if (!confirmOverwrite) return
  }

  isGenerating.value = true

  try {
    const formData = new FormData()
    formData.append('homework_files', aiConfig.value.file)
    formData.append('questionCount', aiConfig.value.questionCount)

    const { data } = await api.post(`/api/courses/${courseId}/aiquizzes/generate`, formData)
    form.value.questions = data.questions

    // 自動帶入作業標題
    if (!form.value.title) {
      form.value.title = `基於 ${aiConfig.value.file.name.replace('.pdf', '')} 的平時測驗`
    }
  } catch (error) {
    console.error("AI 出題失敗:", error)
    alert('AI 出題失敗：' + error.message)
  } finally {
    isGenerating.value = false
  }
}

const addQuestion = () => {
  form.value.questions.push({ questionText: '', discussionPrompt: '' })
}

const removeQuestion = (index) => {
  if (confirm('確定要移除這道題目嗎？')) {
    form.value.questions.splice(index, 1)
  }
}

// 更新快捷範本內容
const PROMPT_TEMPLATES = {
  socratic: '請先判斷學生答得好不好。若觀念有誤，請用引導發問的方式讓學生自行發現問題，不要直接給正解；若回答正確，請給予肯定，並延伸詢問一個相關的進階思考。',
  direct: '請清楚告訴學生回答得好不好。直接點出答案中正確的地方給予肯定，並明確指出哪些觀念有誤或不完整，最後給出具體的改進建議。',
}

const applyPromptTemplate = (index, key) => {
  const t = PROMPT_TEMPLATES[key]
  if (!t) return
  form.value.questions[index].discussionPrompt = t
}

// 🌐 呼叫 API：正式建立並發布測驗
const submitAssignment = async () => {
  if (!form.value.title || !form.value.deadline) {
    alert('請填寫測驗名稱與截止日期！')
    return
  }

  if (form.value.questions.length === 0) {
    alert('請至少設定一道題目！')
    return
  }

  const hasEmptyQuestion = form.value.questions.some(q => !q.questionText.trim())
  if (hasEmptyQuestion) {
    alert('每道題目都必須填寫「題目內容」！')
    return
  }

  const formData = new FormData()
  formData.append('title', form.value.title)
  formData.append('teacherId', teacherId)

  const formattedDeadline = form.value.deadline.replace('T', ' ') + ':00'
  formData.append('deadline', formattedDeadline)

  const questionsData = form.value.questions.map(q => ({
    questionText: q.questionText,
    discussionPrompt: q.discussionPrompt || ''
  }))
  formData.append('questions', JSON.stringify(questionsData))

  if (aiConfig.value.file) {
    formData.append('homework_files', aiConfig.value.file)
  }

  try {
    await api.post(`/api/courses/${courseId}/aiquizzes`, formData)
    alert('測驗發布成功！')
    goBack()
  } catch (error) {
    alert('發布失敗：' + (error.response?.data?.message || error.message))
    console.error('詳細錯誤:', error)
  }
}
</script>
