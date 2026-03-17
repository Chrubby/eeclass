<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">
        課程作業清單
      </h2>
    </div>

    <button 
        v-if="userRole === 'teacher'"
        @click="goToCreateHomework"
        class="bg-[#337ab7] text-white px-4 py-1.5 rounded text-sm font-bold tracking-wide hover:bg-[#285e8e] shadow-sm transition-colors flex items-center gap-1 mb-4"
      >
        ＋ 新增作業
      </button>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="flex bg-gray-100 text-sm font-bold text-gray-700 p-3 border-b">
        <div class="flex-1">作業名稱</div>
        <div class="w-40 text-center">截止日期</div>
        <div class="w-32 text-center">狀態</div>
        <div class="w-24 text-center">成績</div>
      </div>

      <ul class="divide-y divide-gray-200">
        <li 
          v-for="hw in homeworkList" 
          :key="hw.id" 
          @click="goToDetail(hw.id)"
          class="flex p-3 hover:bg-blue-50 cursor-pointer transition-colors items-center text-[15px]"
        >
          <div class="flex-1 text-[#337ab7] hover:underline truncate pr-4">
            {{ hw.title }}
          </div>
          <div class="w-40 text-center text-gray-500 text-sm">{{ hw.deadline }}</div>
          <div class="w-32 text-center text-sm">
            <span v-if="hw.isGraded" class="text-green-600">已批改</span>
            <span v-else-if="hw.isSubmitted" class="text-blue-600">待批改</span>
            <span v-else class="text-red-500">未繳交</span>
          </div>
          <div class="w-24 text-center text-lg" :class="hw.score !== null ? 'text-green-600' : 'text-gray-400'">
            {{ hw.score !== null ? hw.score : '-' }}
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const courseId = route.params.id

// Test!!! 將值改為 student 或是 teacher 檢視不同頁面
const userRole = ref('teacher')

const homeworkList = ref([
  { id: 'hw1', title: '期中專案報告與系統分析', deadline: '2026-04-10 23:59', isSubmitted: true, isGraded: true, score: 88 },
  { id: 'hw2', title: '第三次平時作業：SQL Query 實作', deadline: '2026-05-01 23:59', isSubmitted: true, isGraded: true, score: 'A-' },
  { id: 'hw3', title: '期末專題實作 (第一階段)', deadline: '2026-06-15 23:59', isSubmitted: true, isGraded: false, score: null },
  { id: 'hw4', title: '課後心得回饋', deadline: '2026-06-30 23:59', isSubmitted: false, isGraded: false, score: null }
])

const goToDetail = (hwId) => {
  router.push(`/course/${courseId}/homework/${hwId}`)
}

const goToCreateHomework = () => {
  router.push(`/course/${courseId}/homework/create`)
}
</script>