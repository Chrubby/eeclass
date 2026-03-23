<template>
  <div class="flex flex-col gap-6">

    <div class="bg-white border rounded p-5 shadow-sm border-l-4 border-l-[#337ab7]">
      <h2 class="text-xl font-bold text-gray-800 mb-2">{{ homeworkTitle }}</h2>
      <div class="text-[15px] text-gray-600 flex gap-6">
        <span>截止日期：2026-05-01 23:59</span>
        <!-- Fake -->
        <span class="font-bold text-[#337ab7]">批改進度：12 / 45 份</span>
      </div>
    </div>
    
    <!-- 顯示作業題目與要求 -->
    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">
        作業題目與要求
      </div>
      <div class="p-5 space-y-4">
        <div v-for="(q, index) in questions" :key="q.id" class="border rounded-lg p-4 bg-gray-50">
          <h4 class="font-bold text-[#337ab7] mb-2 text-[16px]">{{ q.title }}</h4>
          <p class="text-[15px] text-gray-700 mb-3 whitespace-pre-line">{{ q.description }}</p>

          <div v-if="q.attachment" class="flex items-start gap-2 border-t pt-3 mt-1 border-gray-200">
            <span class="text-[14px] font-bold text-gray-700 mt-1">題目附件：</span>
            <a 
              :href="'#'" 
              class="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-gray-600 text-sm rounded shadow-sm transition-colors"
              download
            >
              {{ q.attachment }}
              <span class="text-xs text-gray-400"></span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- 學生繳交清單 -->
    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700 flex justify-between items-center">
        <span>學生繳交清單</span>
      </div>
      
      <table class="w-full text-left text-[15px]">
        <thead class="bg-gray-50 text-gray-700 border-b">
          <tr>
            <th class="p-3 pl-5">學號 / 姓名</th>
            <th class="p-3">繳交時間</th>
            <th class="p-3">分數</th>
            <th class="p-3 pr-5">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="sub in submissions" :key="sub.id" class="hover:bg-blue-50 transition-colors">
            <td class="p-3 pl-5 font-bold text-gray-800">{{ sub.studentId }} - {{ sub.studentName }}</td>
            <td class="p-3 text-gray-500 text-sm">{{ sub.uploadedAt }}</td>
            <td class="p-3">
              <span v-if="sub.score" class="font-bold text-green-600 text-lg">{{ sub.score }}</span>
              <span v-else class="text-red-500 font-bold text-sm">未批改</span>
            </td>
            <td class="p-3 pr-5">
              <button 
                @click="router.push(`/course/${courseId}/homework/${hwId}/grade/${sub.id}`)"
                class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-1.5 text-sm font-bold rounded hover:bg-blue-100 transition-colors"
              >
                {{ sub.score ? '重新批改' : '批改' }}
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
const courseId = route.params.id
const hwId = route.params.hwId

const goBack = () => router.push(`/course/${courseId}/homework`)

const homeworkTitle = ref('第三次平時作業：SQL Query 實作')

const questions = ref([
  {
    id: 'q1',
    title: '資料表建立 (CREATE TABLE)',
    description: '請依照前次作業的 ER Model，寫出建立資料表的 SQL 語法。\n請將結果匯出成 PDF 格式上傳。',
    attachment: 'ER_Model_Reference.pdf'
  },
  {
    id: 'q2',
    title: '資料查詢 (SELECT 與 JOIN)',
    description: '請寫出能找出「所有在 2026 年修過資料庫課程的學生名單」的 SQL 語法。',
    attachment: null
  }
])

const submissions = ref([
  { id: 1, studentId: '112500000', studentName: '王小明', uploadedAt: '2026-04-09 14:20', score: 'A+' },
  { id: 2, studentId: '112500001', studentName: '李小華', uploadedAt: '2026-04-10 09:15', score: null },
  { id: 3, studentId: '112500002', studentName: '陳大文', uploadedAt: '2026-04-10 23:10', score: null },
])
</script>