<template>
  <div class="flex flex-col gap-6">

    <div class="bg-blue-50 border border-blue-200 rounded p-5 flex justify-between items-center shadow-sm">
      <div>
        <h2 class="text-xl font-bold text-[#337ab7] mb-1">正在批改：{{ studentData.name }} ({{ studentData.id }})</h2>
        <p class="text-sm text-gray-600">繳交時間：{{ studentData.uploadedAt }}</p>
      </div>
      <div v-if="gradingForm.score" class="text-right">
        <span class="block text-sm text-gray-500 mb-1">目前成績</span>
        <span class="text-2xl font-black text-green-600">{{ gradingForm.score }}</span>
      </div>
    </div>

    <div class="flex gap-6 items-start">
      
      <!-- 作答內容 -->
      <div class="flex-1 flex flex-col gap-5">
        <div class="bg-white border rounded shadow-sm overflow-hidden">
          <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">學生作答內容</div>
          
          <div class="p-5 space-y-6">
            <div v-for="(ans, index) in studentAnswers" :key="ans.id" class="border rounded-lg p-5 bg-gray-50">
              <h4 class="font-bold text-[#337ab7] mb-2 text-[16px]">{{ ans.questionTitle }}</h4>
              <p class="text-[14px] text-gray-600 mb-4 whitespace-pre-line border-b pb-3 border-gray-200">{{ ans.questionDescription }}</p>

              <div class="mt-3">
                <span class="text-[14px] font-bold text-gray-800 block mb-2">學生的回答：</span>
                
                <div v-if="ans.format === 'file'" class="bg-white p-4 border border-gray-200 rounded flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-700">{{ ans.fileName }}</span>
                  </div>
                  <a href="#" download class="text-[#337ab7] hover:underline text-sm font-bold bg-blue-50 px-3 py-1 rounded">
                    下載
                  </a>
                </div>

                <div v-else-if="ans.format === 'text'" class="bg-white p-4 border border-gray-200 rounded text-[15px] text-gray-700 whitespace-pre-line font-mono">
                  {{ ans.textAnswer }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI評分欄 -->
      <div class="w-[320px] shrink-0 sticky top-6 flex flex-col gap-4">
        
        <div class="bg-indigo-50 border border-indigo-200 rounded shadow-sm overflow-hidden">
          <div class="bg-indigo-100 px-5 py-3 font-bold text-indigo-800 text-center border-b border-indigo-200">
            AI 輔助評分
          </div>
          <div class="p-5">
            <button 
              v-if="!aiResult"
              @click="generateAiFeedback"
              :disabled="isGeneratingAi"
              class="w-full bg-indigo-500 text-white font-bold py-2 rounded hover:bg-indigo-600 transition-colors disabled:bg-indigo-300"
            >
              {{ isGeneratingAi ? '處理中...' : '生成 AI 評分' }}
            </button>

            <div v-else class="flex flex-col gap-3">
              <div class="flex justify-between items-center border-b border-indigo-200 pb-2">
                <span class="text-sm font-bold text-indigo-900">AI 評分：</span>
                <span class="text-xl font-black text-indigo-600">{{ aiResult.score }}</span>
              </div>
              <div>
                <span class="text-sm font-bold text-indigo-900 block mb-1">AI 評語：</span>
                <p class="text-[14px] text-indigo-800 bg-white p-3 rounded border border-indigo-100 leading-relaxed">
                  {{ aiResult.feedback }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 老師評分欄 -->
        <div class="bg-white border rounded shadow-sm overflow-hidden">
          <div class="bg-[#337ab7] text-white px-5 py-3 font-bold text-center">評分與回饋</div>
          
          <form @submit.prevent="submitGrade" class="p-5 flex flex-col gap-4">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">分數 (或等第) <span class="text-red-500">*</span></label>
              <input 
                v-model="gradingForm.score" 
                type="text" 
                placeholder="例如: 85 或 A"
                required
                class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xl font-bold text-center text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
              />
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">給學生的評語</label>
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
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const courseId = route.params.id
const hwId = route.params.hwId
const submissionId = route.params.submissionId

const goBack = () => router.push(`/course/${courseId}/homework/${hwId}`)

// Fake
const studentData = ref({
  id: '112500000',
  name: '王小明',
  uploadedAt: '2026-04-09 14:20'
})

// Fake
const studentAnswers = ref([
  {
    id: 'q1',
    questionTitle: '資料表建立 (CREATE TABLE)',
    questionDescription: '請依照前次作業的 ER Model，寫出建立資料表的 SQL 語法。\n請將結果匯出成 PDF 格式上傳。',
    format: 'file',
    fileName: 'HW3_112502562_Q1.pdf'
  },
  {
    id: 'q2',
    questionTitle: '資料查詢 (SELECT 與 JOIN)',
    questionDescription: '請寫出能找出「所有在 2026 年修過資料庫課程的學生名單」的 SQL 語法。',
    format: 'text',
    textAnswer: 'SELECT s.name, s.student_id \nFROM students s \nJOIN enrollments e ON s.id = e.student_id \nJOIN courses c ON e.course_id = c.id \nWHERE c.course_name = "資料庫" AND c.academic_year = "2026";'
  }
])

// 老師的表單資料
const gradingForm = ref({
  score: '',    // TODO：可以帶入舊成績
  feedback: ''  // TODO：可以帶入舊評語
})

// AI 生成狀態與結果
const isGeneratingAi = ref(false)
const aiResult = ref(null)

const generateAiFeedback = /*async*/ () => {
  isGeneratingAi.value = true
  
  // Test 測試前端用
  setTimeout(() => {
    aiResult.value = {
      score: '90',
      feedback: '邏輯大致正確，SQL 語法使用得當，建議加上別名（Alias）以增加後續維護與查詢的可讀性。整體表現優異。'
    }
    isGeneratingAi.value = false
  }, 1200)

  /* 與後端連接 (Gemini寫的，這一段還沒測試) (如果要測試請將上面的 async 註解解除掉)

  aiResult.value = null // 清空前一次的結果（如果有）

  try {
    // 2. 準備要傳給後端的資料 (Payload)
    // 通常後端只需要知道「要批改哪一份作業」，所以傳 submissionId 過去即可。
    // 後端收到 ID 後，會自己去資料庫把題目和學生的答案撈出來，丟給 AI 模型。
    const payload = {
      submission_id: submissionId
    }

    // 3. 呼叫後端 API (這裡以 POST 請求為例，請替換成你實際的後端網址)
    // 假設你的 Python API 網址是 http://localhost:8000/api/ai-grade
    const response = await axios.post('http://localhost:8000/api/ai-grade', payload)

    // 4. 將後端處理完的結果存入前端變數
    // 假設後端回傳的 JSON 長這樣： { "score": 90, "feedback": "邏輯正確..." }
    aiResult.value = {
      score: response.data.score,
      feedback: response.data.feedback
    }

  } catch (error) {
    // 5. 錯誤處理：如果網路斷線、後端當機或 AI API 超時，會跑到這裡
    console.error('AI 評分生成失敗：', error)
    alert('AI 評分伺服器暫時無回應，請稍後再試或改用手動批改。')
    
  } finally {
    // 6. 無論 API 成功或失敗，最後都一定要把載入狀態關掉
    isGeneratingAi.value = false
  }
  */
}

const submitGrade = () => {
  console.log('送出批改：', {
    submissionId: submissionId,
    score: gradingForm.value.score,
    feedback: gradingForm.value.feedback
  })
  
  alert('批改儲存成功')
  goBack()
}
</script>