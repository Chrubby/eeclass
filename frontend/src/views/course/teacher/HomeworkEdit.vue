<template>
  <div class="flex flex-col gap-6">
    <div v-if="loading" class="text-center text-gray-500 py-10">讀取作業資料中...</div>

    <template v-else>
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
            <label class="block text-[15px] font-bold text-gray-700 mb-1.5">作業整體說明 (選填)</label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="請輸入作業的配分方式或詳細說明..."
              class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors resize-y"
            ></textarea>
          </div>

          <div>
            <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
              統一附件 <span class="text-gray-500 font-normal text-sm">（選填，上傳新檔會取代舊附件）</span>
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
              type="button"
              @click="removeQuestion(index)"
              class="absolute top-4 right-4 text-red-400 hover:text-red-600 font-bold text-sm"
            >
              X 移除此題
            </button>

            <h4 class="font-bold text-[#337ab7] mb-4 text-[16px] border-b pb-2">第 {{ index + 1 }} 題</h4>

            <div class="flex flex-col gap-4">
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">題目標題 <span class="text-red-500">*</span></label>
                <input
                  v-model="q.title"
                  type="text"
                  class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800"
                />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">題目說明</label>
                <textarea
                  v-model="q.description"
                  rows="3"
                  class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-2">學生作答形式 <span class="text-red-500">*</span></label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-1.5 text-sm">
                    <input v-model="q.answerFormat" type="radio" value="file" />
                    上傳檔案 (PDF)
                  </label>
                  <label class="flex items-center gap-1.5 text-sm">
                    <input v-model="q.answerFormat" type="radio" value="text" />
                    文字輸入框
                  </label>
                </div>
              </div>

              <details class="border border-indigo-100 rounded-lg bg-indigo-50/40 overflow-hidden">
                <summary class="cursor-pointer px-3 py-2 text-sm font-bold text-indigo-800">AI Prompt 配置</summary>
                <div class="p-3 space-y-2 border-t border-indigo-100 bg-white">
                  <label class="block text-xs font-bold text-indigo-900 mb-1">評分 Prompt</label>
                  <textarea v-model="q.gradingPrompt" rows="3" class="w-full border rounded px-2 py-1 text-xs" />
                  <label class="block text-xs font-bold text-indigo-900 mb-1">解惑 Prompt</label>
                  <textarea v-model="q.discussionPrompt" rows="3" class="w-full border rounded px-2 py-1 text-xs" />
                </div>
              </details>
            </div>
          </div>

          <button
            type="button"
            @click="addQuestion"
            class="w-full py-3 border-2 border-dashed border-[#337ab7] text-[#337ab7] font-bold rounded-lg hover:bg-blue-50"
          >
            ＋ 新增一道題目
          </button>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-2">
        <button type="button" @click="goBack" class="px-6 py-2.5 rounded font-bold text-gray-600 border hover:bg-gray-100">取消</button>
        <button
          type="button"
          @click="saveHomework"
          class="bg-[#337ab7] text-white px-10 py-2.5 rounded font-bold tracking-widest hover:bg-[#285e8e]"
        >
          儲存變更
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const courseId = route.params.id
const hwId = route.params.hwId
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const loading = ref(true)
const homeworkFiles = ref([])

const form = ref({
  title: '',
  deadline: '',
  description: '',
  questions: [
    { title: '', description: '', answerFormat: 'file', gradingPrompt: '', discussionPrompt: '' },
  ],
})

function deadlineToInputValue(raw) {
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function mapQuestionFromApi(q) {
  return {
    title: q.title || '',
    description: q.description || '',
    answerFormat: q.answerFormat || q.answer_format || 'file',
    gradingPrompt: q.gradingPrompt || q.ai_prompt || q.aiPrompt || '',
    discussionPrompt: q.discussionPrompt || q.discussion_prompt || '',
  }
}

const loadHomework = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/api/homeworks/${hwId}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || '讀取作業失敗')
    const qs = data.questions && data.questions.length
      ? data.questions.map(mapQuestionFromApi)
      : [
          { title: '', description: '', answerFormat: 'file', gradingPrompt: '', discussionPrompt: '' },
        ]
    form.value = {
      title: data.title || '',
      deadline: deadlineToInputValue(data.deadline),
      description: data.description || '',
      questions: qs,
    }
  } catch (e) {
    alert(e.message)
    goBack()
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push(`/course/${courseId}/homework/${hwId}`)
}

const onHomeworkFilesChange = (event) => {
  const list = event.target.files ? Array.from(event.target.files) : []
  homeworkFiles.value = list
}

const addQuestion = () => {
  form.value.questions.push({
    title: '',
    description: '',
    answerFormat: 'file',
    gradingPrompt: '',
    discussionPrompt: '',
  })
}

const removeQuestion = (index) => {
  if (confirm('確定要移除這道題目嗎？')) {
    form.value.questions.splice(index, 1)
  }
}

const saveHomework = async () => {
  if (!form.value.title || !form.value.deadline) {
    alert('請填寫作業名稱與截止日期！')
    return
  }
  if (form.value.questions.some((q) => !q.title)) {
    alert('每道題目都必須填寫「題目標題」！')
    return
  }

  const formData = new FormData()
  formData.append('title', form.value.title)
  const formattedDeadline = form.value.deadline.replace('T', ' ') + ':00'
  formData.append('deadline', formattedDeadline)
  formData.append('description', form.value.description || '')

  const questionsData = form.value.questions.map((q) => ({
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
    const response = await fetch(`${API_BASE_URL}/api/homeworks/${hwId}`, {
      method: 'PUT',
      body: formData,
    })
    const text = await response.text()
    if (!text) throw new Error('伺服器沒有回傳資料')
    const result = JSON.parse(text)
    if (!response.ok) throw new Error(result.message || '更新失敗')
    alert('作業已更新！')
    goBack()
  } catch (error) {
    alert('更新失敗：' + error.message)
  }
}

onMounted(loadHomework)
</script>
