<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">
        課程考試
      </h2>
      <span class="text-xs text-gray-500">管理期中考、期末考與測驗時程</span>
    </div>

    <button
      v-if="canManage"
      type="button"
      class="bg-[#337ab7] text-white px-4 py-1.5 rounded text-sm font-bold tracking-wide hover:bg-[#285e8e] shadow-sm transition-colors flex items-center gap-1 mb-4"
      @click="onCreateExam"
    >
      ＋ 新增考試
    </button>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="flex bg-gray-100 text-sm font-bold text-gray-700 p-3 border-b">
        <div class="flex-1">考試名稱</div>
        <div class="w-24 text-center">類型</div>
        <div class="w-40 text-center">開始時間</div>
        <div class="w-40 text-center">結束時間</div>
        <div class="w-24 text-center">狀態</div>
        <div v-if="canManage" class="w-28 text-center">操作</div>
      </div>

      <ul v-if="exams.length" class="divide-y divide-gray-200">
        <li
          v-for="exam in exams"
          :key="exam.id"
          class="flex p-3 items-center text-[15px] hover:bg-gray-50"
        >
          <div class="flex-1 truncate pr-4 font-medium text-gray-800">{{ exam.title }}</div>
          <div class="w-24 text-center text-gray-600 text-sm">{{ exam.type }}</div>
          <div class="w-40 text-center text-gray-500 text-sm">{{ exam.startAt }}</div>
          <div class="w-40 text-center text-gray-500 text-sm">{{ exam.endAt }}</div>
          <div class="w-24 text-center text-sm">
            <span :class="statusClass(exam.status)">{{ exam.statusLabel }}</span>
          </div>
          <div v-if="canManage" class="w-28 text-center text-sm text-[#337ab7]">—</div>
        </li>
      </ul>

      <div v-else class="p-12 text-center text-gray-500">
        <p class="mb-2">目前尚無排定的考試。</p>
        <p v-if="canManage" class="text-sm text-gray-400">
          教師可點選「新增考試」設定考試名稱、類型與開放時間（功能開發中）。
        </p>
        <p v-else class="text-sm text-gray-400">請留意課程公告，考試資訊將由授課教師發布。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getRoleFromToken } from '@/utils/auth.js'

const userRole = computed(() => getRoleFromToken())
const canManage = computed(() => ['teacher', 'ta'].includes(userRole.value))

const exams = ref([])

const statusClass = (status) => {
  const map = {
    upcoming: 'text-orange-600',
    open: 'text-green-600',
    closed: 'text-gray-500',
  }
  return map[status] || 'text-gray-600'
}

const onCreateExam = () => {
  alert('新增考試功能開發中，敬請期待。')
}
</script>
