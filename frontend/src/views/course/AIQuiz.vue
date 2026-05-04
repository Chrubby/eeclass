<template>
  <div class="flex flex-col gap-4">
    <!-- 標題區 -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">AI 出題討論區</h2>
      <span class="text-xs text-gray-500">共 {{ quizzes.length }} 份測驗</span>
    </div>

    <!-- 教師上傳與生成區 -->
    <div class="flex">
      <button
        v-if="['teacher', 'ta'].includes(userRole)"
        @click="goToCreateQuiz"
        class="bg-[#337ab7] text-white px-4 py-1.5 rounded text-sm font-bold tracking-wide hover:bg-[#285e8e] shadow-sm transition-colors flex items-center gap-1 mb-4"
      >
        ＋ 新增測驗
      </button>
    </div>

    <!-- 測驗列表區 -->
    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="flex bg-gray-100 text-sm font-bold text-gray-700 p-3 border-b">
        <div class="flex-1">測驗主題 (來源文件)</div>
        <div class="w-24 text-center">題數</div>
        <div class="w-36 text-center">建立時間</div>
        <div class="w-32 text-center">操作</div>
      </div>
      <ul class="divide-y divide-gray-200">
        <li v-for="quiz in quizzes" :key="quiz.id" class="flex p-3 items-center text-[15px] hover:bg-gray-50 transition-colors">
          <div class="flex-1 truncate pr-4 text-gray-800 font-medium">
            {{ quiz.title }}
            <span class="text-xs text-gray-500 ml-2 font-normal">({{ quiz.sourceFile }})</span>
          </div>
          <div class="w-24 text-center text-gray-600">{{ quiz.questions.length }} 題</div>
          <div class="w-36 text-center text-gray-500 text-sm">{{ formatDate(quiz.createdAt) }}</div>
          <div class="w-32 text-center flex items-center justify-center gap-3">
            <!-- 改為使用 Router 導航 -->
            <button 
              @click="goToQuiz(quiz.id)" 
              class="text-[#337ab7] hover:underline text-sm font-bold"
            >
              作答 / 討論
            </button>
            <button
              v-if="canManage"
              class="text-red-600 hover:underline text-sm font-bold disabled:opacity-50"
              @click="deleteQuiz(quiz.id)"
            >
              刪除
            </button>
          </div>
        </li>
      </ul>
      <div v-if="quizzes.length === 0" class="p-10 text-center text-gray-500">
        目前尚無 AI 生成的測驗，請老師上傳參考資料進行出題。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router' // 引入 Router

const router = useRouter()
const userRole = localStorage.getItem('userRole') || 'teacher'
const canManage = ['teacher', 'ta'].includes(userRole)

const quizzes = ref([])

// 格式化時間
const formatDate = (raw) => {
  const d = new Date(raw)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const goToCreateQuiz = () => {
  router.push(`/course/${courseId}/aiquiz/create`)
}

// 導向獨立的測驗頁面
const goToQuiz = (aiquizId) => {
  // 請確保你的 vue-router 有設定對應的路由，例如: path: '/quiz/:quizId'
  router.push(`/course/${courseId}/aiquiz/${aiquizId}`)
}

// 模擬載入資料
const loadQuizzes = async () => {
  quizzes.value = [
    {
      id: 'q_001',
      title: '第一章：結構力學基礎測驗',
      sourceFile: 'Chapter1_Intro.pdf',
      createdAt: Date.now() - 86400000,
      questions: [
        { id: 'q1_1', questionText: '請簡述應力(Stress)與應變(Strain)的定義及其物理意義。' },
        { id: 'q1_2', questionText: '何謂虎克定律(Hooke\'s Law)？其適用的前提條件為何？' }
      ]
    }
  ]
}

const deleteQuiz = (quizId) => {
  if (!confirm('確定刪除這份測驗？學生的作答紀錄也將一併遺失。')) return
  quizzes.value = quizzes.value.filter(q => q.id !== quizId)
}

onMounted(() => {
  loadQuizzes()
})
</script>