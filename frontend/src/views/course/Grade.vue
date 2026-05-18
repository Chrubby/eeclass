<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">
        成績查詢
      </h2>
      <span class="text-xs text-gray-500">檢視各項評量成績與總成績</span>
    </div>

    <div v-if="canManage" class="flex gap-2 mb-4">
      <button
        type="button"
        class="bg-[#337ab7] text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-[#285e8e] shadow-sm"
        @click="onExport"
      >
        匯出成績表
      </button>
      <button
        type="button"
        class="border border-[#337ab7] text-[#337ab7] px-4 py-1.5 rounded text-sm font-bold hover:bg-blue-50"
        @click="onEditWeights"
      >
        設定成績權重
      </button>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="bg-white border rounded p-4 shadow-sm"
      >
        <p class="text-xs text-gray-500 mb-1">{{ card.label }}</p>
        <p class="text-2xl font-bold text-gray-800">{{ card.value }}</p>
        <p class="text-xs text-gray-400 mt-1">權重 {{ card.weight }}</p>
      </div>
    </div>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="flex bg-gray-100 text-sm font-bold text-gray-700 p-3 border-b">
        <div class="flex-1">評量項目</div>
        <div class="w-24 text-center">權重</div>
        <div class="w-24 text-center">得分</div>
        <div class="w-32 text-center">狀態</div>
        <div class="flex-1 text-center">備註</div>
      </div>

      <ul v-if="gradeItems.length" class="divide-y divide-gray-200">
        <li
          v-for="item in gradeItems"
          :key="item.id"
          class="flex p-3 items-center text-[15px]"
        >
          <div class="flex-1 font-medium text-gray-800">{{ item.name }}</div>
          <div class="w-24 text-center text-gray-600">{{ item.weight }}%</div>
          <div class="w-24 text-center font-bold text-[#337ab7]">{{ item.score }}</div>
          <div class="w-32 text-center text-sm">{{ item.status }}</div>
          <div class="flex-1 text-center text-gray-500 text-sm truncate">{{ item.note }}</div>
        </li>
      </ul>

      <div v-else class="p-12 text-center text-gray-500">
        <p class="mb-2">尚無成績資料。</p>
        <p v-if="canManage" class="text-sm text-gray-400">
          教師可於作業批改、考試結束後彙整成績；匯出與權重設定功能開發中。
        </p>
        <p v-else class="text-sm text-gray-400">
          作業與考試成績公布後將顯示於此，請留意課程公告。
        </p>
      </div>
    </div>

    <div class="mt-6 bg-blue-50 border border-blue-100 rounded p-4 text-sm text-gray-700">
      <p class="font-bold text-[#337ab7] mb-1">說明</p>
      <ul class="list-disc ml-5 space-y-1 text-gray-600">
        <li>作業成績來自「作業」頁面之批改結果。</li>
        <li>考試與平時成績將於對應評量完成後納入計算。</li>
        <li>總成績為各項目依權重加總，最終以教師公布為準。</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getRoleFromToken } from '@/utils/auth.js'

const userRole = computed(() => getRoleFromToken())
const canManage = computed(() => ['teacher', 'ta'].includes(userRole.value))

const gradeItems = ref([])

const summaryCards = [
  { label: '總成績', value: '—', weight: '100%' },
  { label: '作業', value: '—', weight: '—' },
  { label: '考試', value: '—', weight: '—' },
  { label: '平時 / AI Quiz', value: '—', weight: '—' },
]

const onExport = () => {
  alert('匯出成績表功能開發中，敬請期待。')
}

const onEditWeights = () => {
  alert('成績權重設定功能開發中，敬請期待。')
}
</script>
