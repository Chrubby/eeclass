<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">教材區</h2>
      <span class="text-xs text-gray-500">共 {{ materials.length }} 份教材</span>
    </div>

    <div v-if="canManageMaterials" class="bg-white border rounded shadow-sm p-4">
      <h3 class="font-bold text-gray-700 mb-2">上傳教材</h3>
      <div
        class="border-2 border-dashed rounded p-6 text-center transition-colors"
        :class="dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <p class="text-sm text-gray-600">拖曳檔案到此，或</p>
        <label class="inline-block mt-2 cursor-pointer text-sm font-bold text-blue-700 hover:underline">
          點擊選擇檔案
          <input type="file" class="hidden" @change="onPickFile" />
        </label>
        <p v-if="selectedFile" class="mt-2 text-xs text-green-700">已選擇：{{ selectedFile.name }}</p>
      </div>
      <div class="flex justify-end mt-3">
        <button
          type="button"
          class="px-4 py-2 rounded bg-[#337ab7] text-white text-sm font-bold hover:bg-[#285e8e] disabled:opacity-50"
          :disabled="uploading || !selectedFile"
          @click="uploadMaterial"
        >
          {{ uploading ? '上傳中...' : '上傳教材' }}
        </button>
      </div>
    </div>

    <div class="bg-white border rounded shadow-sm overflow-hidden">
      <div class="flex bg-gray-100 text-sm font-bold text-gray-700 p-3 border-b">
        <div class="flex-1">檔名</div>
        <div class="w-36 text-center">上傳時間</div>
        <div class="w-32 text-center">操作</div>
      </div>
      <ul class="divide-y divide-gray-200">
        <li v-for="m in materials" :key="m.id" class="flex p-3 items-center text-[15px]">
          <div class="flex-1 truncate pr-4 text-gray-800">{{ m.fileName }}</div>
          <div class="w-36 text-center text-gray-500 text-sm">{{ formatDate(m.createdAt) }}</div>
          <div class="w-32 text-center flex items-center justify-center gap-2">
            <button
              type="button"
              class="text-blue-600 hover:underline text-sm font-bold disabled:opacity-50"
              :disabled="downloadingId === m.id"
              @click="onDownload(m)"
            >
              {{ downloadingId === m.id ? '下載中...' : '下載' }}
            </button>
            <button
              v-if="canManageMaterials"
              type="button"
              class="text-red-600 hover:underline text-sm font-bold disabled:opacity-50"
              :disabled="deletingId === m.id"
              @click="deleteMaterial(m.id)"
            >
              {{ deletingId === m.id ? '刪除中' : '刪除' }}
            </button>
          </div>
        </li>
      </ul>
      <div v-if="materials.length === 0" class="p-10 text-center text-gray-500">目前尚無教材</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/client.js'
import { getRoleFromToken } from '@/utils/auth.js'
import { downloadFile } from '@/utils/files.js'

const route = useRoute()
const courseId = route.params.id

const canManageMaterials = computed(() => ['teacher', 'ta'].includes(getRoleFromToken()))
const deletingId = ref(null)
const downloadingId = ref(null)

const onDownload = async (m) => {
  downloadingId.value = m.id
  try {
    await downloadFile(m.filePath, m.fileName)
  } catch (e) {
    alert(e.response?.data?.message || '下載失敗，請確認檔案是否存在')
  } finally {
    downloadingId.value = null
  }
}

const materials = ref([])
const selectedFile = ref(null)
const dragOver = ref(false)
const uploading = ref(false)

const formatDate = (raw) => (raw ? new Date(raw).toLocaleString() : '-')

const loadMaterials = async () => {
  try {
    const { data } = await api.get(`/api/courses/${courseId}/materials`)
    materials.value = data.materials || []
  } catch (e) {
    alert(e.response?.data?.message || '讀取教材失敗')
  }
}

const onPickFile = (e) => {
  const file = e.target.files?.[0] || null
  selectedFile.value = file
}

const onDrop = (e) => {
  dragOver.value = false
  selectedFile.value = e.dataTransfer?.files?.[0] || null
}

const uploadMaterial = async () => {
  if (!selectedFile.value) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', selectedFile.value)
    await api.post(`/api/courses/${courseId}/materials`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    selectedFile.value = null
    await loadMaterials()
  } catch (e) {
    alert(e.response?.data?.message || '上傳失敗')
  } finally {
    uploading.value = false
  }
}

const deleteMaterial = async (materialId) => {
  if (!confirm('確定刪除此教材？')) return
  deletingId.value = materialId
  try {
    await api.delete(`/api/courses/${courseId}/materials/${materialId}`)
    await loadMaterials()
  } catch (e) {
    alert(e.response?.data?.message || '刪除失敗')
  } finally {
    deletingId.value = null
  }
}

onMounted(loadMaterials)
</script>
