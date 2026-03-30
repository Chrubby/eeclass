<template>
  <div class="flex flex-col gap-6">

    <div class="bg-white border rounded p-5 shadow-sm border-l-4 border-l-[#337ab7]">
      <h2 class="text-xl font-bold text-gray-800 mb-2">{{ homeworkData.title }}</h2>
      <div class="text-[15px] text-gray-600 flex gap-6">
        <span>截止日期：{{ homeworkData.deadline }}</span>
        <span>
          狀態：
          <span :class="homeworkData.isGraded ? 'text-green-600 font-bold' : 'text-orange-500 font-bold'">
            {{ homeworkData.isGraded ? '已批改' : '未批改' }}
          </span>
        </span>
      </div>
    </div>

    <!-- 老師評分 (isGraded == true 才會顯示) -->
    <div v-if="homeworkData.isGraded" class="flex flex-col gap-4">
      
      <div class="bg-blue-50 border border-blue-200 rounded p-5 shadow-sm">
        <div class="flex justify-between items-end mb-3 border-b border-blue-200 pb-2">
          <h3 class="text-lg font-bold text-[#337ab7] flex items-center gap-2">老師批改結果</h3>
          <div class="text-3xl font-black text-[#337ab7]">
            <template v-if="!isNaN(homeworkData.score)">
              {{ homeworkData.score }} <span class="text-lg text-[#337ab7] font-normal">/ 100 分</span>
            </template>
            <template v-else>
              {{ homeworkData.score }} <span class="text-lg text-[#337ab7] font-normal"> 級分</span>
            </template>
          </div>
        </div>
        <div class="bg-white p-4 rounded border border-blue-100 text-[15px] text-gray-700 leading-relaxed">
          <span class="font-bold text-gray-800 block mb-1">老師評語：</span>
          {{ homeworkData.feedback }}
        </div>
      </div>

      <!-- AI評分 (aiFeedback不為空才會顯示) -->
      <div v-if="homeworkData.aiFeedback" class="bg-indigo-50 border border-indigo-200 rounded p-5 shadow-sm">
        <div class="flex justify-between items-end mb-3 border-b border-indigo-200 pb-2">
          <h3 class="text-lg font-bold text-indigo-800 flex items-center gap-2">AI 助教回饋</h3>
          <div class="text-2xl font-black text-indigo-600">
            <template v-if="!isNaN(homeworkData.aiScore)">
              {{ homeworkData.aiScore }} <span class="text-base text-indigo-700 font-normal">/ 100 分</span>
            </template>
            <template v-else>
              {{ homeworkData.aiScore }} <span class="text-base text-indigo-700 font-normal"> 級分</span>
            </template>
          </div>
        </div>
        <div class="bg-white p-4 rounded border border-indigo-100 text-[15px] text-indigo-900 leading-relaxed">
          <span class="font-bold text-indigo-800 block mb-1">AI 建議與分析：</span>
          {{ homeworkData.aiFeedback }}
        </div>
      </div>

    </div>

    <!-- 作業內容與作答區 -->
    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">作業內容與作答區</div>
      
      <div class="p-5 space-y-6">
        <div v-for="(q, index) in questions" :key="q.id" class="border rounded-lg p-5 bg-gray-50">
          
          <h4 class="font-bold text-[#337ab7] mb-2 text-lg">{{ q.title }}</h4>
          <p class="text-[15px] text-gray-700 mb-4 whitespace-pre-line">{{ q.description }}</p>

          <div v-if="q.attachment" class="mb-5 flex items-start gap-2">
            <span class="text-[14px] font-bold text-gray-700 mt-1">題目附件：</span>
            <a 
              :href="'#'"
              class="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-gray-600 text-sm rounded shadow-sm transition-colors"
              download
            >
              {{ q.attachment }}
            </a>
          </div>

          <div v-if="q.answerFormat === 'file'" class="bg-white p-4 border border-dashed border-gray-300 rounded flex flex-col gap-3">
            <label class="text-[15px] font-bold text-gray-700">
              上傳作答檔案 <span class="text-red-500 text-xs font-normal">(僅限 PDF)</span>
            </label>
            <input 
              type="file" 
              accept="application/pdf"
              @change="handleFileUpload(q.id, $event)"
              :disabled="homeworkData.isGraded"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div v-if="q.uploadedFile" class="text-[14px] text-green-600 flex items-center gap-1 mt-1">
              已準備上傳：{{ q.uploadedFile.name }}
            </div>
            <div v-else-if="q.previousFile" class="text-[14px] text-gray-500 flex items-center gap-1 mt-1">
              已繳交檔案：<a href="#" class="text-blue-600 hover:underline">{{ q.previousFile }}</a>
            </div>
          </div>

          <div v-else-if="q.answerFormat === 'text'">
            <label class="block text-[15px] font-bold text-gray-700 mb-2">文字作答區</label>
            <textarea 
              v-model="q.textAnswer" 
              rows="6"
              :disabled="homeworkData.isGraded"
              placeholder="請在此輸入您的作答內容..."
              class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors resize-y disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            ></textarea>
          </div>

        </div>
      </div>
      
      <div class="bg-gray-50 px-5 py-4 border-t flex justify-end">
        <button 
          @click="submitHomework" 
          :disabled="homeworkData.isGraded"
          class="bg-[#337ab7] text-white px-8 py-2.5 rounded text-[16px] tracking-widest hover:bg-[#285e8e] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {{ homeworkData.isGraded ? '已結算，無法再修改' : '確認送出作業' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const courseId = route.params.id
const hwId = route.params.hwId 

// Fake
const homeworkData = ref({
  title: '第三次平時作業：SQL Query 實作', 
  deadline: '2026-05-01 23:59', 
  isGraded: true, // Test!!! 改為 true 可以看到成績 false 可以檢視學生繳交作業時的畫面
  score: '100', 
  feedback: 'Query 寫得非常精簡漂亮，效能很好！',
  aiScore: '90', //AI成績
  aiFeedback: '邏輯大致正確，SQL 語法使用得當，建議加上別名（Alias）以增加後續維護與查詢的可讀性。整體表現優異。' //AI評語
})

// Fake
const questions = ref([
  {
    id: 'q1',
    title: '資料表建立 (CREATE TABLE)',
    description: '請依照前次作業的 ER Model，寫出建立資料表的 SQL 語法。\n請將結果匯出成 PDF 格式上傳。',
    attachment: 'ER_Model_Reference.pdf',
    answerFormat: 'file',
    uploadedFile: null,
    previousFile: '123456.pdf'
  },
  {
    id: 'q2',
    title: '資料查詢 (SELECT 與 JOIN)',
    description: '請寫出能找出「所有在 2026 年修過資料庫課程的學生名單」的 SQL 語法。',
    attachment: null,
    answerFormat: 'text',
    textAnswer: 'SELECT s.name, s.student_id \nFROM students s \nJOIN enrollments e ON s.id = e.student_id \nJOIN courses c ON e.course_id = c.id \nWHERE c.course_name = "資料庫" AND c.academic_year = "2026";',
    uploadedFile: null,
    previousFile: null
  }
])

const handleFileUpload = (questionId, event) => {
  const file = event.target.files[0]
  if (!file) return

  if (file.type !== 'application/pdf') {
    alert('檔案格式不符(僅接受pdf)')
    event.target.value = '' 
    return
  }

  const question = questions.value.find(q => q.id === questionId)
  if (question) {
    question.uploadedFile = file
  }
}

const submitHomework = () => {
  // 強制完整作答
  const isAllAnswered = questions.value.every(q => {
    if (q.answerFormat === 'file') {
      return q.uploadedFile || q.previousFile
    } else if (q.answerFormat === 'text') {
      return q.textAnswer && q.textAnswer.trim() !== ''
    }
    return true
  })
  
  if (!isAllAnswered) {
    alert('所有題目都必須作答（上傳檔案或填寫文字）')
    return
  }

  console.log('準備送出的資料：', questions.value.map(q => ({
    questionId: q.id,
    answerFormat: q.answerFormat,
    answerContent: q.answerFormat === 'file' 
      ? (q.uploadedFile ? q.uploadedFile.name : '保留原檔案') 
      : q.textAnswer
  })))

  alert('作業繳交成功')
}
</script>