<template>
  <div class="bg-white border rounded shadow-sm p-5 animate-fade-in max-w-4xl mx-auto">
    
    <!-- 標題與返回按鈕 -->
    <div class="flex justify-between items-center mb-6 border-b pb-3">
      <h3 class="text-xl font-bold text-gray-800">{{ quiz?.title || '載入中...' }}</h3>
      <button 
        @click="goBack" 
        class="text-sm text-gray-500 hover:text-gray-800 font-bold transition-colors"
      >
        ← 返回列表
      </button>
    </div>

    <div v-if="quiz">
      <!-- ==================== 👨‍🏫 教師視角 (查看所有學生作答) ==================== -->
      <div v-if="isTeacher" class="space-y-8 animate-fade-in">
        <div class="bg-blue-50 border border-[#337ab7] text-[#337ab7] px-4 py-3 rounded font-bold flex items-center gap-2">
          <span>教師檢視模式：您可在此查看所有學生的作答與討論情況。</span>
        </div>

        <div v-for="(q, index) in quiz.questions" :key="q.id" class="border border-gray-200 rounded-lg overflow-hidden">
          <!-- 題目區塊 -->
          <div class="bg-gray-100 p-4 border-b border-gray-200">
            <h4 class="font-bold text-[#337ab7]">Q{{ index + 1 }}. {{ q.questionText }}</h4>
          </div>
          
          <!-- 所有學生作答列表 -->
          <div class="p-4 bg-white">
            <div class="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-[#337ab7] rounded-full"></span> 全班作答紀錄 (共 {{ q.allAnswers?.length || 0 }} 筆)
            </div>
            
            <div class="space-y-3">
              <div v-for="ans in q.allAnswers" :key="ans.id" class="bg-gray-50 border border-gray-100 p-3 rounded text-sm flex flex-col gap-1.5 hover:bg-blue-50/50 transition-colors">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-gray-800">{{ ans.studentName }} <span class="text-xs text-gray-500 font-normal ml-1">({{ ans.studentId }})</span></span>
                  <span class="text-xs text-gray-400">{{ ans.submitTime }}</span>
                </div>
                <p class="text-gray-700 whitespace-pre-wrap">{{ ans.answerText }}</p>
              </div>
              
              <!-- 若無人作答 -->
              <div v-if="!q.allAnswers || q.allAnswers.length === 0" class="text-gray-400 text-sm italic text-center py-4">
                目前還沒有學生提交此題的答案。
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 🧑‍🎓 學生視角 ==================== -->
      <div v-else>
        <!-- 狀態 A：作答模式 (尚未提交) -->
        <div v-if="!isSubmitted" class="space-y-6">
          <div class="bg-blue-50 text-[#337ab7] px-4 py-3 rounded text-sm font-bold mb-4 flex items-center gap-2">
            提示：完成並送出答案後，即可解鎖並查看其他同學的作答。
          </div>

          <div v-for="(q, index) in quiz.questions" :key="q.id" class="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <p class="font-bold text-gray-800 mb-3">Q{{ index + 1 }}. {{ q.questionText }}</p>
            <textarea 
              v-model="studentAnswers[q.id]" 
              rows="4" 
              class="w-full border border-gray-300 rounded p-3 text-sm focus:ring-2 focus:ring-[#337ab7] focus:border-[#337ab7] focus:outline-none resize-y"
              placeholder="請在此輸入你的答案..."
            ></textarea>
          </div>

          <div class="flex justify-end mt-6 pt-4 border-t">
            <button
              type="button"
              class="px-8 py-2.5 rounded bg-[#337ab7] text-white text-[15px] font-bold hover:bg-[#285e8e] shadow-sm disabled:opacity-50 transition-colors"
              :disabled="saving"
              @click="submitAnswers"
            >
              {{ saving ? '提交中...' : '提交答案並查看討論' }}
            </button>
          </div>
        </div>

        <!-- 狀態 B：觀摩與討論模式 (已提交) -->
        <div v-else class="space-y-8 animate-fade-in">
          <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded font-bold flex items-center justify-between">
            <span>答案已成功提交！現在你可以參考其他同學的見解了。</span>
          </div>

          <div v-for="(q, index) in quiz.questions" :key="q.id" class="border border-gray-200 rounded-lg overflow-hidden">
            <!-- 題目區塊 -->
            <div class="bg-gray-100 p-4 border-b border-gray-200">
              <h4 class="font-bold text-gray-800">Q{{ index + 1 }}. {{ q.questionText }}</h4>
            </div>
            
            <div class="p-5 space-y-5 bg-white">
              <!-- 自己的答案 -->
              <div class="bg-blue-50/50 border border-blue-100 p-4 rounded-lg relative">
                <div class="absolute -top-3 left-4 bg-[#337ab7] text-white text-xs font-bold px-2 py-0.5 rounded">我的作答</div>
                <p class="text-gray-800 text-sm whitespace-pre-wrap mt-1">{{ studentAnswers[q.id] }}</p>
              </div>

              <!-- 其他同學的答案 (不顯示學號，保護隱私) -->
              <div>
                <div class="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2 border-b pb-2">
                  <span class="w-1.5 h-1.5 bg-gray-400 rounded-full"></span> 同學的作答參考
                </div>
                <div class="space-y-3">
                  <div v-for="peer in q.peerAnswers" :key="peer.id" class="bg-gray-50 p-3 rounded text-sm flex flex-col gap-1.5">
                    <span class="font-bold text-gray-700">{{ peer.studentName }}</span>
                    <p class="text-gray-600 whitespace-pre-wrap">{{ peer.answerText }}</p>
                  </div>
                  <!-- 防呆：如果沒有同學作答 -->
                  <div v-if="!q.peerAnswers || q.peerAnswers.length === 0" class="text-gray-400 text-sm italic py-2">
                    目前還沒有其他同學作答這題喔！你是第一個！
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 取得使用者角色 (實務上可能從 Vuex, Pinia 或 localStorage 取得)
const userRole = localStorage.getItem('userRole') || 'student' // 測試時可改為 'teacher'
const isTeacher = computed(() => ['teacher', 'ta'].includes(userRole))

const quiz = ref(null)
const studentAnswers = ref({})
const saving = ref(false)
const isSubmitted = ref(false)

// 返回上一頁
const goBack = () => {
  if (!isTeacher.value && !isSubmitted.value && Object.values(studentAnswers.value).some(ans => ans.trim() !== '')) {
    if (!confirm('你的答案尚未儲存，確定要離開嗎？')) return
  }
  router.push('/quizzes') // 請替換成你實際的路由
}

// 學生提交答案
const submitAnswers = () => {
  saving.value = true
  
  // 模擬打 API 儲存答案
  setTimeout(() => {
    saving.value = false
    isSubmitted.value = true // 切換到討論觀摩模式
  }, 800)
}

// 模擬載入資料
const loadQuizData = () => {
  const quizId = route.params.quizId
  
  // 模擬後端回傳的資料結構
  quiz.value = {
    id: quizId,
    title: '基於 Chapter1_Intro.pdf 的平時測驗',
    questions: [
      { 
        id: 'q1', 
        questionText: '請簡述應力(Stress)與應變(Strain)的定義及其物理意義。',
        // 老師看到的完整資料 (包含學號與時間)
        allAnswers: [
          { id: 'a1', studentName: '陳大明', studentId: '1100001', submitTime: '2026-05-04 10:15', answerText: '應力是單位面積承受的內力；應變是物體受力後的變形比例。' },
          { id: 'a2', studentName: '林小華', studentId: '1100002', submitTime: '2026-05-04 11:20', answerText: '應力(σ = F/A)代表材料內部的抵抗力強度，應變(ε = ΔL/L)則是變形程度。' }
        ],
        // 學生看到的精簡資料 (為了隱私通常不會給學號等詳細資訊)
        peerAnswers: [
          { id: 'p1', studentName: '陳同學', answerText: '應力是單位面積承受的內力；應變是物體受力後的變形比例。' },
          { id: 'p2', studentName: '林同學', answerText: '應力(σ = F/A)代表材料內部的抵抗力強度，應變(ε = ΔL/L)則是變形程度。' }
        ]
      },
      { 
        id: 'q2', 
        questionText: '何謂虎克定律(Hooke\'s Law)？其適用的前提條件為何？',
        allAnswers: [
          { id: 'a3', studentName: '王大寶', studentId: '1100003', submitTime: '2026-05-04 09:30', answerText: '在彈性限度內，應力與應變成正比。前提是材料必須是線性彈性。' }
        ],
        peerAnswers: [
          { id: 'p3', studentName: '王同學', answerText: '在彈性限度內，應力與應變成正比。前提是材料必須是線性彈性。' }
        ]
      }
    ]
  }

  // 只有學生才需要初始化作答欄位
  if (!isTeacher.value) {
    quiz.value.questions.forEach(q => {
      studentAnswers.value[q.id] = ''
    })
  }
}

onMounted(() => {
  loadQuizData()
})
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>