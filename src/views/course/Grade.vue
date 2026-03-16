<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">
        成績
      </h2>
    </div>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      
      <div class="flex bg-gray-100 text-sm font-bold text-gray-700 p-3 border-b">
        <div class="flex-1">標題</div>
        <div class="w-32 text-center">發布者</div>
        <div class="w-32 text-center">發布日期</div>
      </div>

      <ul class="divide-y divide-gray-200">
        <li 
          v-for="item in announcements" 
          :key="item.id" 
          class="flex p-3 hover:bg-blue-50 cursor-pointer transition-colors items-center text-[15px]"
        >
          <div class="flex-1 text-[#337ab7] hover:underline truncate pr-4">
            <span v-if="item.isNew" class="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded mr-2">NEW</span>
            {{ item.title }}
          </div>
          <div class="w-32 text-center text-gray-600 text-sm">{{ item.author }}</div>
          <div class="w-32 text-center text-gray-500 text-sm">{{ item.date }}</div>
        </li>
      </ul>

      <div v-if="announcements.length === 0" class="p-10 text-center text-gray-500">
        目前尚無公告資料
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 假資料：公告列表
const announcements = ref([
  { 
    id: 1, 
    title: '歡迎修習本課程！第一週上課注意事項與大綱', 
    author: '教授', 
    date: '2026-03-16',
    isNew: true
  },
  { 
    id: 2, 
    title: '請各位同學於下週前完成分組名單填寫', 
    author: '助教', 
    date: '2026-03-10',
    isNew: false
  },
  { 
    id: 3, 
    title: '課程參考書目已更新至圖書館指定參考書區', 
    author: '系統管理員', 
    date: '2026-02-25',
    isNew: false
  }
])
</script>