<template>
  <div class="flex flex-col gap-6">

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-5 py-3 border-b font-bold text-gray-700">
        作業基本資訊
      </div>
      
      <form @submit.prevent="submitAssignment" class="p-6 flex flex-col gap-5">
        
        <div>
          <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
            作業名稱 <span class="text-red-500">*</span>
          </label>
          <input 
            v-model="form.title" 
            type="text" 
            placeholder="例如：第一次平時作業或期中專案"
            required
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
          />
        </div>

        <div>
          <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
            截止日期與時間 <span class="text-red-500">*</span>
          </label>
          <input 
            v-model="form.deadline" 
            type="datetime-local" 
            required
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors"
          />
        </div>

        <div>
          <label class="block text-[15px] font-bold text-gray-700 mb-1.5">
            作業說明
          </label>
          <textarea 
            v-model="form.description" 
            rows="5"
            placeholder="請輸入作業的詳細規定、配分方式或注意事項..."
            class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors resize-y"
          ></textarea>
        </div>

        <div class="bg-gray-50 p-4 border border-dashed border-gray-300 rounded flex flex-col gap-2">
          <label class="text-[15px] font-bold text-gray-700">
            提供給學生的附件 <span class="text-gray-500 text-xs font-normal">(選填，例如：題目 PDF、參考資料)</span>
          </label>
          <input 
            type="file" 
            @change="handleFileUpload"
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <div v-if="form.file" class="text-sm text-green-600 mt-1 flex items-center gap-1">
            已選擇檔案：{{ form.file.name }}
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-4 pt-4 border-t">
          <button 
            type="button" 
            @click="goBack"
            class="px-6 py-2 rounded text-[15px] text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button 
            type="submit" 
            class="bg-[#337ab7] text-white px-8 py-2 rounded text-[15px] tracking-wide hover:bg-[#285e8e] shadow-sm transition-colors"
          >
            發布作業
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const courseId = route.params.id

// 表單資料狀態
const form = ref({
  title: '',
  deadline: '',
  description: '',
  file: null
})

const goBack = () => {
  router.push(`/course/${courseId}/homework`)
}

// 處理檔案上傳
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    form.value.file = file
  } else {
    form.value.file = null
  }
}

// 提交表單
const submitAssignment = () => {
  console.log('準備發布的作業資料：', {
    courseId: courseId,
    title: form.value.title,
    deadline: form.value.deadline,
    description: form.value.description,
    fileName: form.value.file ? form.value.file.name : '無附件'
  })

  alert('作業發布成功！')
  goBack()
}
</script>