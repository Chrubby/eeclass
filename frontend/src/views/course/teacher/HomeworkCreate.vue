<template>
  <div class="flex flex-col gap-6">

    <div class="bg-white border rounded shadow-sm overflow-hidden">

      <div class="p-6 flex flex-col gap-5">
        <div>
          <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
            作業名稱 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.title"
            type="text"
            placeholder="例如：第一次平時作業或期中專案"
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
          />
        </div>

        <div>
          <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
            截止日期與時間 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.deadline"
            type="datetime-local"
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
          />
        </div>

        <div>
          <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
            作業整體說明 (選填)
          </label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="請輸入作業的配分方式或詳細說明..."
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors resize-y"
          ></textarea>
        </div>

        <div>
          <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
            統一附件 <span class="text-gray-500 font-normal text-sm">（選填，供全班學生下載，可複選）</span>
          </label>
          <input
            type="file"
            multiple
            @change="onHomeworkFilesChange"
            class="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <ul v-if="homeworkFiles.length" class="mt-2 text-xs text-green-700 space-y-0.5 list-disc list-inside">
            <li v-for="(f, i) in homeworkFiles" :key="i">{{ f.name }}</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700 flex justify-between items-center">
        <span>題目設定</span>
        <span class="text-sm font-normal text-gray-500">目前共 {{ form.questions.length }} 題</span>
      </div>

      <div class="p-6 flex flex-col gap-6">

        <div
          v-for="(q, index) in form.questions"
          :key="index"
          class="border border-gray-200 rounded-lg p-5 bg-gray-50 relative"
        >
          <button
            v-if="form.questions.length > 1"
            @click="removeQuestion(index)"
            class="absolute top-4 right-4 text-red-400 hover:text-red-600 font-bold text-sm"
          >
            X 移除此題
          </button>

          <h4 class="font-bold text-[#337ab7] mb-4 text-[16px] border-b pb-2">第 {{ index + 1 }} 題</h4>

          <div class="flex flex-col gap-4">

            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">
                題目標題 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="q.title"
                type="text"
                placeholder="清輸入標題..."
                class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
              />
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">
                題目說明
              </label>
              <textarea
                v-model="q.description"
                rows="3"
                placeholder="請輸入這道題目的詳細說明..."
                class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors resize-y"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">
                學生作答形式 <span class="text-red-500">*</span>
              </label>
              <div class="flex gap-4">
                <label class="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input type="radio" v-model="q.answerFormat" value="file" class="cursor-pointer" />
                  上傳檔案 (PDF)
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input type="radio" v-model="q.answerFormat" value="text" class="cursor-pointer" />
                  文字輸入框
                </label>
              </div>
            </div>

            <details class="border border-indigo-100 rounded-lg bg-indigo-50/40 overflow-hidden">
              <summary class="cursor-pointer select-none px-3 py-2 text-sm font-bold text-indigo-800 bg-indigo-100/80">
                AI Prompt 配置（分開評分與解惑）
              </summary>
              <div class="p-3 space-y-2 border-t border-indigo-100 bg-white">
                <p class="text-[11px] text-gray-500">
                  以下兩個欄位會分別提供給「評分 AI」與「學生解惑 AI」，學生端不會看到原文。
                </p>
                <label class="block text-xs font-bold text-indigo-900 mb-1">
                  評分 Prompt（grading_prompt）
                </label>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    class="text-[11px] px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    @click.prevent="applyPromptTemplate(index, 'grading', 'strict')"
                  >
                    範本：嚴格評分
                  </button>
                  <button
                    type="button"
                    class="text-[11px] px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    @click.prevent="applyPromptTemplate(index, 'grading', 'logic')"
                  >
                    範本：邏輯導向
                  </button>
                </div>
                <textarea
                  v-model="q.gradingPrompt"
                  rows="4"
                  placeholder="例如：著重概念完整性；若缺邊界條件需扣點；允許等第制參考…（提供評分 AI）"
                  class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800 focus:border-indigo-400 focus:outline-none resize-y"
                />
                <label class="block text-xs font-bold text-indigo-900 mb-1 mt-2">
                  解惑 Prompt（discussion_prompt）
                </label>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    class="text-[11px] px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    @click.prevent="applyPromptTemplate(index, 'discussion', 'socratic')"
                  >
                    範本：蘇格拉底式引導
                  </button>
                  <button
                    type="button"
                    class="text-[11px] px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    @click.prevent="applyPromptTemplate(index, 'discussion', 'logic')"
                  >
                    範本：只提示方向
                  </button>
                </div>
                <textarea
                  v-model="q.discussionPrompt"
                  rows="4"
                  placeholder="例如：不得直接給答案；用提問方式引導學生找出盲點…（提供解惑 AI）"
                  class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800 focus:border-indigo-400 focus:outline-none resize-y"
                />
              </div>
            </details>

          </div>
        </div>

        <button
          type="button"
          @click="addQuestion"
          class="w-full py-3 border-2 border-dashed border-[#337ab7] text-[#337ab7] font-bold rounded-lg hover:bg-blue-50 transition-colors flex justify-center items-center gap-2"
        >
          ＋ 新增一道題目
        </button>

      </div>
    </div>

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

const router = useRouter()
const route = useRoute()
const courseId = route.params.id

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const teacherId = localStorage.getItem('userId') || localStorage.getItem('user') || ''

/** 作業層級附件（後端欄位 homework_files） */
const homeworkFiles = ref([])

const form = ref({
  title: '',
  deadline: '',
  description: '',
  questions: [
    {
      title: '',
      description: '',
      answerFormat: 'file',
      gradingPrompt: '',
      discussionPrompt: '',
    }
  ]
})

const goBack = () => {
  router.push(`/course/${courseId}/homework`)
}

// 動態新增題目
const addQuestion = () => {
  form.value.questions.push({
    title: '',
    description: '',
    answerFormat: 'file',
    gradingPrompt: '',
    discussionPrompt: '',
  })
}

const onHomeworkFilesChange = (event) => {
  const list = event.target.files ? Array.from(event.target.files) : []
  homeworkFiles.value = list
}

const PROMPT_TEMPLATES = {
  socratic:
    '以蘇格拉底式提問引導思考：不直接給答案；若推理跳步請追問「依據是什麼」；鼓勸學生自行檢驗邊界案例。',
  strict:
    '嚴格對照題意：完全正確才給滿分；每缺一小項扣固定比例；錯誤類型需標註（概念／計算／格式）。此段僅供教師與 AI 評分參考，勿對學生揭露細則。',
  logic:
    '僅就邏輯與結構點評：是否自洽、前提是否充分、結論是否過度推論；不暗示具體得分或配分。',
}

const applyPromptTemplate = (index, target, key) => {
  const t = PROMPT_TEMPLATES[key]
  if (!t) return
  const field = target === 'discussion' ? 'discussionPrompt' : 'gradingPrompt'
  const cur = form.value.questions[index][field] || ''
  form.value.questions[index][field] = cur ? `${cur}\n\n${t}` : t
}

const removeQuestion = (index) => {
  if (confirm('確定要移除這道題目嗎？')) {
    form.value.questions.splice(index, 1)
  }
}

// 提交表單給後端
const submitAssignment = async () => {
  if (!form.value.title || !form.value.deadline) {
    alert('請填寫作業名稱與截止日期！')
    return
  }

  const hasEmptyQuestion = form.value.questions.some(q => !q.title)
  if (hasEmptyQuestion) {
    alert('每道題目都必須填寫「題目標題」！')
    return
  }

  const formData = new FormData()

  formData.append('title', form.value.title)

  // 轉換時間格式給 MySQL
  const formattedDeadline = form.value.deadline.replace('T', ' ') + ':00'
  formData.append('deadline', formattedDeadline)

  formData.append('description', form.value.description || '')
  formData.append('teacherId', teacherId)

  const questionsData = form.value.questions.map(q => ({
    title: q.title,
    description: q.description,
    answerFormat: q.answerFormat,
    aiPrompt: q.gradingPrompt || '',
    gradingPrompt: q.gradingPrompt || '',
    discussionPrompt: q.discussionPrompt || '',
  }))
  formData.append('questions', JSON.stringify(questionsData))

  homeworkFiles.value.forEach((file) => {
    formData.append('homework_files', file)
  })

  try {
    const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}/homeworks`, {
      method: 'POST',
      body: formData
    })

    const text = await response.text()
    if (!text) throw new Error('伺服器沒有回傳任何資料 (後端可能崩潰了)')

    const result = JSON.parse(text)

    if (!response.ok) throw new Error(result.message || '作業發布失敗')

    alert('作業發布成功！')
    goBack()

  } catch (error) {
    alert('發布失敗：' + error.message)
    console.error("詳細錯誤:", error)
  }
}
</script>
