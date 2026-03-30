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

            <div class="grid grid-cols-2 gap-6">
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

              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">
                  題目附件 <span class="text-gray-500 font-normal">(選填，提供給學生下載)</span>
                </label>
                <input
                  type="file"
                  @change="handleQuestionFile(index, $event)"
                  class="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                <div v-if="q.attachment" class="text-xs text-green-600 mt-1">
                  已選擇：{{ q.attachment.name }}
                </div>
              </div>
            </div>

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

const form = ref({
  title: '',
  deadline: '',
  description: '',
  questions: [
    {
      title: '',
      description: '',
      answerFormat: 'file',
      attachment: null
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
    attachment: null
  })
}

const removeQuestion = (index) => {
  if (confirm('確定要移除這道題目嗎？')) {
    form.value.questions.splice(index, 1)
  }
}

const handleQuestionFile = (index, event) => {
  const file = event.target.files[0]
  if (file) {
    form.value.questions[index].attachment = file
  } else {
    form.value.questions[index].attachment = null
  }
}

// 提交表單給後端
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

  // 🛑 修正 1：把時間格式 "YYYY-MM-DDThh:mm" 轉成 MySQL 專用的 "YYYY-MM-DD hh:mm:00"
  const formattedDeadline = form.value.deadline.replace('T', ' ') + ':00'
  formData.append('deadline', formattedDeadline)

  formData.append('description', form.value.description || '')
  formData.append('teacherId', teacherId)

  const questionsData = form.value.questions.map(q => ({
    title: q.title,
    description: q.description,
    answerFormat: q.answerFormat,
    hasAttachment: !!q.attachment
  }))
  formData.append('questions', JSON.stringify(questionsData))

  form.value.questions.forEach((q, index) => {
    if (q.attachment) {
      formData.append(`file_${index}`, q.attachment)
    }
  })

  try {
    // 🛑 修正 2：強制指定打給 localhost:5000，避開前端代理
    const response = await fetch(`http://localhost:5000/api/courses/${courseId}/homework`, {
      method: 'POST',
      body: formData
    })

    // 先讀取純文字，避免因為空字串導致 JSON 解析崩潰
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

  const hasEmptyQuestion = form.value.questions.some(q => !q.title)
  if (hasEmptyQuestion) {
    alert('每道題目都必須填寫「題目標題」！')
    return
  }

  const formData = new FormData()

  formData.append('title', form.value.title)
  formData.append('deadline', form.value.deadline)
  formData.append('description', form.value.description || '')
  formData.append('teacherId', teacherId)

  const questionsData = form.value.questions.map(q => ({
    title: q.title,
    description: q.description,
    answerFormat: q.answerFormat,
    hasAttachment: !!q.attachment
  }))
  formData.append('questions', JSON.stringify(questionsData))

  form.value.questions.forEach((q, index) => {
    if (q.attachment) {
      formData.append(`file_${index}`, q.attachment)
    }
  })

  try {
    const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}/homework`, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.message || '作業發布失敗')

    alert('作業發布成功！')
    goBack()
  } catch (error) {
    alert(error.message)
  }
}
</script>
