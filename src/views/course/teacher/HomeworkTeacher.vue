<template>
  <div class="flex flex-col gap-6">
    <div class="bg-white border rounded p-5 shadow-sm border-l-4 border-l-[#337ab7]">
      <h2 class="text-xl font-bold text-gray-800 mb-2">{{ homeworkTitle }}</h2>
      <div class="text-[15px] text-gray-600">批改進度：12 / 45 份</div>
    </div>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-100 text-gray-700">
          <tr>
            <th class="p-3">學號 / 姓名</th>
            <th class="p-3">繳交時間</th>
            <th class="p-3">分數</th>
            <th class="p-3">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="sub in submissions" :key="sub.id" class="hover:bg-blue-50 transition-colors">
            <td class="p-3 font-medium text-gray-700">{{ sub.studentId }} - {{ sub.studentName }}</td>
            <td class="p-3 text-gray-500">{{ sub.uploadedAt }}</td>
            <td class="p-3">
              <span v-if="sub.score" class="text-green-600 font-bold">{{ sub.score }}</span>
              <span v-else class="text-gray-400">未批改</span>
            </td>
            <td class="p-3">
              <button class="bg-blue-50 text-[#337ab7] px-4 py-1.5 rounded border border-blue-200 hover:bg-[#337ab7] hover:text-white transition-colors">
                批改
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 為了示範，保留您的原始數據結構
const homeworkTitle = ref('期中專案報告與系統分析')

const submissions = ref([
  { id: 1, studentId: '112502562', studentName: '王小明', uploadedAt: '2026-04-09 14:20', score: 88 },
  { id: 2, studentId: '112502563', studentName: '李小華', uploadedAt: '2026-04-10 09:15', score: null },
])
</script>