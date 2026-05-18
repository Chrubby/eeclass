<template>
  <div class="bg-white border rounded shadow-sm p-5 animate-fade-in max-w-4xl mx-auto">
    
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
      <div v-if="isTeacher" class="space-y-8 animate-fade-in">
        <div class="bg-blue-50 border border-[#337ab7] text-[#337ab7] px-4 py-3 rounded font-bold flex items-center gap-2">
          <span>教師檢視模式：您可在此查看所有學生的作答與討論情況。</span>
        </div>

        <div v-for="(q, index) in quiz.questions" :key="q.id" class="border border-gray-200 rounded-lg overflow-hidden">
          <div class="bg-gray-100 p-4 border-b border-gray-200">
            <h4 class="font-bold text-[#337ab7]">Q{{ index + 1 }}. {{ q.questionText }}</h4>
          </div>
          
          <div class="p-4 bg-white">
            <div class="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-[#337ab7] rounded-full"></span> 全班作答紀錄 (共 {{ q.allAnswers?.length || 0 }} 筆)
            </div>
            
            <div class="space-y-6">
              <div v-for="ans in q.allAnswers" :key="ans.id" class="bg-gray-50 border border-gray-100 p-4 rounded text-sm flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-gray-800">{{ ans.studentName }} ({{ ans.studentId }})</span>
                  <span class="text-xs text-gray-400">{{ ans.submitTime }}</span>
                </div>
                <p class="text-gray-700 whitespace-pre-wrap">{{ ans.answerText }}</p>
                
                <div v-if="ans.aiFeedback" class="bg-amber-50/60 border-l-4 border-amber-400 p-2 text-amber-900 italic">
                  <span class="font-bold text-xs block mb-1">AI 助教回饋：</span>
                  {{ ans.aiFeedback }}
                </div>

                <div class="mt-4 border-t border-gray-200 pt-4">
                  <div class="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">討論串</div>
                  <div v-if="ans.comments && ans.comments.length > 0" class="mb-4">
                    <DiscussionThread 
                      v-for="comment in ans.comments" 
                      :key="comment.id" 
                      :node="transformNode(comment)"
                      @submit-reply="(parentId, text) => handleCommentSubmit(ans.id, text, parentId)"
                    />
                  </div>
                  <div class="flex gap-2 mt-2">
                    <input 
                      v-model="newCommentText[ans.id]"
                      class="flex-1 text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="發表意見或提問..."
                      @keyup.enter="handleCommentSubmit(ans.id, newCommentText[ans.id])"
                    />
                    <button 
                      @click="handleCommentSubmit(ans.id, newCommentText[ans.id])"
                      class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-1 rounded text-sm font-bold transition-colors"
                    >
                      留言
                    </button>
                  </div>
                </div>
              </div>
              
              <div v-if="!q.allAnswers || q.allAnswers.length === 0" class="text-gray-400 text-sm italic text-center py-4">
                目前還沒有學生提交此題的答案。
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else>
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

        <div v-else class="space-y-8 animate-fade-in">
          <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded font-bold flex items-center justify-between">
            <span>答案已成功提交！AI 助教已為你的回答提供建議，你也可以參考其他同學的見解。</span>
          </div>

          <div v-for="(q, index) in quiz.questions" :key="q.id" class="border border-gray-200 rounded-lg overflow-hidden">
            <div class="bg-gray-100 p-4 border-b border-gray-200">
              <h4 class="font-bold text-gray-800">Q{{ index + 1 }}. {{ q.questionText }}</h4>
            </div>
            
            <div class="p-5 space-y-6 bg-white">
              
              <div v-if="q.myAnswer" class="bg-blue-50/50 border border-blue-100 p-4 rounded-lg relative">
                <div class="absolute -top-3 left-4 bg-[#337ab7] text-white text-xs font-bold px-2 py-0.5 rounded">我的作答</div>
                <p class="text-gray-800 text-sm whitespace-pre-wrap mt-1">
                  {{ q.myAnswer.answerText }}
                </p>
                <div v-if="q.myAnswer.aiFeedback" class="mt-3 bg-amber-50 border border-amber-200 p-3 rounded text-amber-900 text-sm leading-relaxed relative">
                   <div class="font-bold text-xs mb-1 text-amber-700">AI 助教點評</div>
                  {{ q.myAnswer.aiFeedback }}
                </div>

                <div class="mt-4 border-t border-blue-200 pt-4">
                  <div class="text-xs font-bold text-gray-500 mb-2">討論串</div>
                  <div v-if="q.myAnswer.comments && q.myAnswer.comments.length > 0" class="mb-4">
                    <DiscussionThread 
                      v-for="comment in q.myAnswer.comments" 
                      :key="comment.id" 
                      :node="transformNode(comment)"
                      @submit-reply="(parentId, text) => handleCommentSubmit(q.myAnswer.id, text, parentId)"
                    />
                  </div>
                  <div class="flex gap-2 mt-2">
                    <input 
                      v-model="newCommentText[q.myAnswer.id]"
                      class="flex-1 text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="回覆討論..."
                      @keyup.enter="handleCommentSubmit(q.myAnswer.id, newCommentText[q.myAnswer.id])"
                    />
                    <button 
                      @click="handleCommentSubmit(q.myAnswer.id, newCommentText[q.myAnswer.id])"
                      class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-1 rounded text-sm font-bold transition-colors"
                    >
                      留言
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div class="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2 border-b pb-2">
                  <span class="w-1.5 h-1.5 bg-gray-400 rounded-full"></span> 同學的作答參考
                </div>
                <div class="space-y-6">
                  <div v-for="peer in q.peerAnswers" :key="peer.id" class="bg-gray-50 p-4 rounded text-sm flex flex-col gap-2 border border-gray-100">
                    <span class="font-bold text-gray-700">{{ peer.studentName }}</span>
                    <p class="text-gray-600 whitespace-pre-wrap">{{ peer.answerText }}</p>
                    
                    <div v-if="peer.aiFeedback" class="mt-2 bg-white/50 border border-amber-100 p-2 rounded text-amber-800 text-xs">
                      <span class="font-bold">AI 點評：</span>
                      {{ peer.aiFeedback }}
                    </div>

                    <div class="mt-4 border-t border-gray-200 pt-4">
                      <div class="text-xs font-bold text-gray-500 mb-2">討論串</div>
                      <div v-if="peer.comments && peer.comments.length > 0" class="mb-4">
                        <DiscussionThread 
                          v-for="comment in peer.comments" 
                          :key="comment.id" 
                          :node="transformNode(comment)"
                          @submit-reply="(parentId, text) => handleCommentSubmit(peer.id, text, parentId)"
                        />
                      </div>
                      <div class="flex gap-2 mt-2">
                        <input 
                          v-model="newCommentText[peer.id]"
                          class="flex-1 text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="回覆討論..."
                          @keyup.enter="handleCommentSubmit(peer.id, newCommentText[peer.id])"
                        />
                        <button 
                          @click="handleCommentSubmit(peer.id, newCommentText[peer.id])"
                          class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-1 rounded text-sm font-bold transition-colors"
                        >
                          留言
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-if="!q.peerAnswers || q.peerAnswers.length === 0" class="text-gray-400 text-sm italic py-2">
                    目前還沒有其他同學作答這題。你是第一個！
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
import DiscussionThread from './DiscussionThread.vue' // 確保路徑正確

const route = useRoute()
const router = useRouter()

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const courseId = route.params.id || route.params.courseId
const quizId = route.params.quizId

const userRole = localStorage.getItem('userRole') || 'student'
const studentId = localStorage.getItem('userId') || localStorage.getItem('user') || 'test_student'
const studentName = localStorage.getItem('userName') || '測試學生'
const isTeacher = computed(() => ['teacher', 'ta'].includes(userRole))

const quiz = ref(null)
const studentAnswers = ref({})
const saving = ref(false)
const isSubmitted = ref(false)
const newCommentText = ref({})

const transformNode = (comment) => ({
  id: comment.id,
  author_name: comment.userName,
  role: comment.role,
  content: comment.content,
  created_at: comment.createdAt,
  children: comment.children
})

const goBack = () => {
  if (!isTeacher.value && !isSubmitted.value && Object.values(studentAnswers.value).some(ans => ans.trim() !== '')) {
    if (!confirm('你的答案尚未儲存，確定要離開嗎？')) return
  }
  router.push(`/course/${courseId}/aiquiz`)
}

const loadQuizData = async () => {
  try {
    const url = `${API_BASE_URL}/api/courses/${courseId}/aiquizzes/${quizId}?role=${userRole}&studentId=${studentId}`
    const response = await fetch(url)
    if (!response.ok) throw new Error('無法載入測驗內容')
    
    const data = await response.json()
    quiz.value = data

    if (isTeacher.value) {
      isSubmitted.value = true
    } else {
      const hasSubmitted = quiz.value.questions.some(q => q.myAnswer)
      if (hasSubmitted) {
        isSubmitted.value = true
        quiz.value.questions.forEach(q => {
          if (q.myAnswer) studentAnswers.value[q.id] = q.myAnswer.answerText
        })
      } else {
        quiz.value.questions.forEach(q => {
          studentAnswers.value[q.id] = ''
        })
      }
    }
  } catch (error) {
    console.error("載入失敗:", error)
    alert('載入測驗失敗：' + error.message)
  }
}

const handleCommentSubmit = async (answerId, content, parentId = null) => {
  if (!content || !content.trim()) return

  try {
    const payload = {
      userId: studentId,
      userName: studentName,
      role: userRole,
      content: content.trim(),
      parentId: parentId
    }

    const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}/aiquizzes/answers/${answerId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) throw new Error('留言失敗')

    if (!parentId) newCommentText.value[answerId] = ''
    
    await loadQuizData() 
  } catch (error) {
    alert(error.message)
  }
}

const submitAnswers = async () => {
  const allAnswered = quiz.value.questions.every(q => studentAnswers.value[q.id]?.trim() !== '')
  if (!allAnswered) {
    alert('請作答完所有題目後再提交喔！')
    return
  }

  saving.value = true
  
  try {
    const payload = {
      studentId: studentId,
      studentName: studentName,
      answers: studentAnswers.value
    }

    const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}/aiquizzes/${quizId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) throw new Error('提交失敗')

    await loadQuizData()
    isSubmitted.value = true 
    
  } catch (error) {
    console.error("提交失敗:", error)
    alert('提交失敗：' + error.message)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadQuizData()
})
</script>