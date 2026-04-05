<template>
  <div class="flex flex-col gap-6">
    <div class="bg-white border rounded p-5 shadow-sm border-l-4 border-l-[#337ab7]">
      <h2 class="text-xl font-bold text-gray-800 mb-2">{{ homeworkData.title }}</h2>
      <div class="text-[15px] text-gray-600 flex gap-6">
        <span>截止日期：{{ homeworkData.deadlineText }}</span>
        <span>
          狀態：
          <span :class="homeworkData.isGraded ? 'text-green-600 font-bold' : homeworkData.isSubmitted ? 'text-blue-600 font-bold' : 'text-orange-500 font-bold'">
            {{ homeworkData.isGraded ? '已批改' : homeworkData.isSubmitted ? '已繳交' : '未繳交' }}
          </span>
        </span>
      </div>
    </div>


    <div v-if="homeworkData.isGraded" class="bg-green-50 border border-green-200 rounded p-5 shadow-sm">
      <h3 class="text-lg font-bold text-green-800 mb-4 border-b border-green-200 pb-2">批改結果</h3>
      <div class="flex flex-col gap-4">
        <div>
          <span class="text-sm font-bold text-green-700 block mb-1">獲得分數：</span>
          <span class="text-3xl font-black text-green-600">{{ homeworkData.score }}</span>
        </div>
        <div>
          <span class="text-sm font-bold text-green-700 block mb-1">老師評語：</span>
          <p class="text-green-900 whitespace-pre-line">{{ homeworkData.feedback || '（無評語）' }}</p>
        </div>
      </div>
    </div>

    <div  class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">作業題目內容</div>

      <div class="p-5 space-y-8">
        <div v-for="(q, index) in homeworkData.questions" :key="q.id" class="border-b pb-6 last:border-0">
          <h3 class="font-bold text-[#337ab7] mb-2">第 {{ index + 1 }} 題：{{ q.title }}</h3>
          <p class="text-gray-700 whitespace-pre-line mb-4">{{ q.description || '（無題目說明）' }}</p>

          <div v-if="q.hasAttachment && q.filePath" class="mb-4">
            <a :href="`${API_BASE_URL}${q.filePath}`" target="_blank" class="text-sm text-blue-600 hover:underline flex items-center gap-1">
              📎 下載題目附件：{{ q.fileName }}
            </a>
          </div>

          <div v-if="q.answerFormat === 'text'">
            <label class="block text-xs font-bold text-gray-500 mb-1">文字作答</label>
            <textarea
              v-model="answers[index]"
              rows="4"
              :disabled="homeworkData.isGraded"
              placeholder="請在此輸入答案..."
              class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors resize-y"
            ></textarea>
          </div>

          <div v-else>
            <label class="block text-xs font-bold text-gray-500 mb-1">上傳檔案</label>
            <input type="file" accept=".pdf" @change="handleFileChange(index, $event)" :disabled="homeworkData.isGraded" class="block w-full text-xs text-gray-600" />

            <div v-if="homeworkData.isSubmitted && homeworkData.submittedFileName" class="mt-2 text-xs font-bold text-green-600 bg-green-50 p-2 rounded border border-green-200 inline-block">
              已繳交檔案：{{ homeworkData.submittedFileName }}
            </div>
          </div>

          <div v-if="homeworkData.isGraded && homeworkData.gradedDetails && homeworkData.gradedDetails[index]" class="mt-4 bg-green-50 p-4 rounded border border-green-200">
             <div class="font-bold text-green-700 mb-1">此題得分：{{ homeworkData.gradedDetails[index].score || '未給分' }}</div>
             <div class="text-green-800 text-sm whitespace-pre-line">此題評語：<br>{{ homeworkData.gradedDetails[index].feedback || '無' }}</div>
          </div>
        </div>
      </div>

      <div v-if="!homeworkData.isGraded" class="bg-gray-50 px-5 py-4 border-t flex justify-end gap-3">
        <button v-if="homeworkData.isSubmitted" @click="unsubmitHomework" class="bg-red-500 text-white px-8 py-2.5 rounded text-[16px] hover:bg-red-600 transition-colors">
          收回作業
        </button>
        <button v-else @click="submitHomework" class="bg-[#337ab7] text-white px-8 py-2.5 rounded text-[16px] hover:bg-[#285e8e] transition-colors">
          確認送出作業
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const hwId = route.params.hwId
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const studentId = localStorage.getItem('userId') || localStorage.getItem('user') || ''

const homeworkData = ref({
  title: '',
  description: '',
  deadlineText: '-',
  questions: [],
  isGraded: false,
  isSubmitted: false,
  score: null,
  feedback: '',
  submittedFileName: null
})

const answers = ref([]) // 存文字
const files = ref([])   // 存檔案

const loadData = async () => {
  try {
    const [hwRes, listRes, mySubRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/homework/${hwId}`),
      fetch(`${API_BASE_URL}/api/courses/${route.params.id}/homework?userId=${encodeURIComponent(studentId)}&role=student`),
      fetch(`${API_BASE_URL}/api/homework/${hwId}/my-submission?studentId=${encodeURIComponent(studentId)}`)
    ])

    const hw = await hwRes.json()
    const list = await listRes.json()
    const mySub = await mySubRes.json()

    const current = list.find((x) => Number(x.id) === Number(hwId))

    let gradedDetails = []
    try {
      if (mySub?.graded_details) gradedDetails = JSON.parse(mySub.graded_details)
    } catch(e) {}

    homeworkData.value = {
      ...hw,
      deadlineText: hw.deadline ? new Date(hw.deadline).toLocaleString() : '-',
      isSubmitted: Boolean(current?.submissionId),
      isGraded: Boolean(current?.score),
      score: current?.score || null,
      feedback: current?.feedback || '',
      submittedFileName: mySub?.file_name || null,
      gradedDetails: gradedDetails // 新增這行
    }

    if (hw.questions) {
      answers.value = new Array(hw.questions.length).fill('')
      files.value = new Array(hw.questions.length).fill(null)

      if (mySub && mySub.answer_text) {
        try {
          const savedAnswers = JSON.parse(mySub.answer_text)
          for(let i = 0; i < savedAnswers.length; i++) {
            if (savedAnswers[i]) {
              answers.value[i] = savedAnswers[i]
            }
          }
        } catch (e) {
          console.error("解析舊文字答案失敗", e)
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

const handleFileChange = (index, event) => {
  const file = event.target.files[0]
  if (file && file.type !== 'application/pdf') {
    alert('只能上傳 PDF 檔案！')
    event.target.value = ''
    files.value[index] = null
    return
  }
  files.value[index] = file || null
}

const submitHomework = async () => {
  try {
    const formData = new FormData()
    formData.append('studentId', studentId)

    formData.append('answerText', JSON.stringify(answers.value))

    if (files.value.some(f => f !== null)) {
      const firstFile = files.value.find(f => f !== null)
      formData.append('file', firstFile)
    }

    const response = await fetch(`${API_BASE_URL}/api/homework/${hwId}/submit`, {
      method: 'POST',
      body: formData,
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    alert(result.message)
    await loadData()
  } catch (error) {
    alert(error.message)
  }
}

const unsubmitHomework = async () => {
  if (!confirm('確定要收回作業嗎？')) {
    return
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/homework/${hwId}/submit`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.message || '收回失敗')

    alert(result.message)

    answers.value = new Array(answers.value.length).fill('')
    files.value = new Array(files.value.length).fill(null)
    homeworkData.value.submittedFileName = null

    await loadData()
  } catch (error) {
    alert(error.message)
  }
}

onMounted(loadData)
</script>
