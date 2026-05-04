<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">
        課程作業清單
      </h2>
    </div>

    <button
      v-if="['teacher', 'ta'].includes(userRole)"
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
          <div class="w-40 text-center text-gray-500 text-sm">{{ hw.deadlineText }}</div>
          <div class="w-32 text-center text-sm">
            <span
              :class="hw.isGraded ? 'text-green-600' : hw.isSubmitted ? 'text-blue-600' : 'text-red-500'"
            >
              {{ hw.statusText }}
            </span>
          </div>
          <div class="w-24 text-center text-lg" :class="hw.score ? 'text-green-600' : 'text-gray-400'">
            {{ hw.scoreText }}
          </div>
        </li>
      </ul>
      <div v-if="isLoading" class="p-6 text-center text-gray-500">讀取中...</div>
      <div v-else-if="homeworkList.length === 0" class="p-6 text-center text-gray-500">目前尚無作業</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const courseId = route.params.id

const userRole = ref(localStorage.getItem('userRole') || 'student')
const userId = localStorage.getItem('userId') || localStorage.getItem('user') || ''
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const isLoading = ref(false)

const homeworkList = ref([])

const formatDate = (raw) => {
  if (!raw) return '-'
  return new Date(raw).toLocaleString()
}

const loadHomeworkList = async () => {
  if (!userId) return
  isLoading.value = true
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/courses/${courseId}/homeworks?userId=${encodeURIComponent(userId)}&role=${userRole.value}`,
    )
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || '讀取作業失敗')
    homeworkList.value = result.map((item) => ({
      ...item,
      deadlineText: formatDate(item.deadline),
      isSubmitted: Boolean(item.submissionId),
      isGraded: Boolean(item.score),
      scoreText: item.score || '-',
      statusText:
        ['teacher', 'ta'].includes(userRole.value)
          ? `已繳交 ${item.submitCount || 0} / 已批改 ${item.gradedCount || 0}`
          : item.score
            ? '已批改'
            : item.submissionId
              ? '待批改'
              : '未繳交',
    }))
  } catch (error) {
    alert(error.message)
  } finally {
    isLoading.value = false
  }
}

const goToDetail = (hwId) => {
  router.push(`/course/${courseId}/homework/${hwId}`)
}

const goToCreateHomework = () => {
  router.push(`/course/${courseId}/homework/create`)
}

onMounted(loadHomeworkList)
</script>
