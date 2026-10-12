<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">修課名單</h2>
      <span v-if="roster" class="text-xs text-gray-500">
        修課中 {{ activeCount }} 人・已退選 {{ withdrawnCount }} 人
      </span>
    </div>

    <p v-if="roster" class="text-sm text-gray-700 -mt-3">
      <span class="text-gray-500">授課老師：</span>
      {{ roster.teachers.map((t) => t.name).join('、') || '—' }}
    </p>

    <div class="border rounded p-4 bg-gray-50">
      <h3 class="text-sm font-bold text-gray-800 mb-2">匯入名單（Excel）</h3>
      <p class="text-[13px] text-gray-500 leading-relaxed mb-3">
        上傳學員名單 .xlsx（需有「姓名」「帳號」「信箱」欄位），名單上的人會加入這門課。
        目前在課程中、但這次名單上沒有的學生會標記為<b class="text-gray-700">已退選</b>，作業等資料都會保留，之後名單再出現就會恢復。
        尚未建立帳號的人會被略過，請先請管理員批次建立帳號。
      </p>

      <form @submit.prevent="importRoster" class="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".xlsx"
          required
          class="text-[14px] text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:border file:border-gray-300 file:rounded file:bg-white file:text-gray-700 hover:file:bg-gray-100 file:cursor-pointer"
          @change="importFile = $event.target.files[0] || null"
        />
        <button
          type="submit"
          :disabled="importing"
          class="bg-[#337ab7] text-white px-5 py-1.5 rounded text-sm font-bold tracking-wide hover:bg-[#285e8e] transition-colors disabled:opacity-60"
        >
          {{ importing ? '匯入中…' : '匯入' }}
        </button>
      </form>

      <p v-if="importError" class="text-red-600 text-[14px] mt-3">{{ importError }}</p>

      <div v-if="importResult" class="mt-4 text-[14px] flex flex-col gap-2">
        <p>
          新加入 <b class="text-green-700">{{ importResult.added.length }}</b> 人、
          恢復修課 <b class="text-green-700">{{ importResult.reactivated.length }}</b> 人、
          未變動 <b>{{ importResult.unchanged }}</b> 人、
          標記退選 <b class="text-orange-600">{{ importResult.withdrawn.length }}</b> 人
          <template v-if="importResult.teachersAdded.length">
            、新增授課老師 <b class="text-green-700">{{ importResult.teachersAdded.length }}</b> 人
          </template>
          <template v-if="importResult.skipped.length">
            、略過 <b class="text-red-600">{{ importResult.skipped.length }}</b> 列
          </template>
        </p>
        <p v-if="importResult.withdrawn.length" class="text-orange-700">
          標記退選：{{ importResult.withdrawn.map((p) => `${p.name}（${p.username}）`).join('、') }}
        </p>
        <ul v-if="importResult.skipped.length" class="text-red-700 list-disc pl-5">
          <li v-for="row in importResult.skipped" :key="row.rowNumber">
            第 {{ row.rowNumber }} 列 {{ row.name || '' }} {{ row.username ? `（${row.username}）` : '' }}：{{ row.reason }}
          </li>
        </ul>
      </div>
    </div>

    <p v-if="loading" class="text-gray-500 text-sm">讀取中…</p>
    <p v-else-if="loadError" class="text-red-600 text-sm">{{ loadError }}</p>
    <p v-else-if="roster.students.length === 0" class="text-gray-500 text-sm">這門課目前沒有任何學生。</p>

    <div v-else class="bg-white border rounded shadow-sm overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-gray-700 text-left border-b">
            <th class="px-3 py-2.5 font-bold">帳號</th>
            <th class="px-3 py-2.5 font-bold">姓名</th>
            <th class="px-3 py-2.5 font-bold">身分</th>
            <th class="px-3 py-2.5 font-bold">信箱</th>
            <th class="px-3 py-2.5 font-bold">狀態</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="student in roster.students"
            :key="student.username"
            class="border-t"
            :class="student.status === 'withdrawn' ? 'text-gray-400' : ''"
          >
            <td class="px-3 py-2.5 break-all">{{ student.username }}</td>
            <td class="px-3 py-2.5">{{ student.name }}</td>
            <td class="px-3 py-2.5">{{ student.role === 'ta' ? '助教' : '學生' }}</td>
            <td class="px-3 py-2.5 break-all">{{ student.email || '—' }}</td>
            <td class="px-3 py-2.5 whitespace-nowrap">
              <span v-if="student.status === 'withdrawn'" class="text-orange-600">
                已退選<template v-if="student.withdrawn_at">（{{ formatDate(student.withdrawn_at) }}）</template>
              </span>
              <span v-else class="text-green-700">修課中</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/client.js'

const route = useRoute()
const courseCode = route.params.id
const refreshCourseInfo = inject('refreshCourseInfo', () => {})

const roster = ref(null)
const loading = ref(true)
const loadError = ref('')

const importFile = ref(null)
const importing = ref(false)
const importError = ref('')
const importResult = ref(null)

const activeCount = computed(() => roster.value?.students.filter((s) => s.status !== 'withdrawn').length ?? 0)
const withdrawnCount = computed(() => roster.value?.students.filter((s) => s.status === 'withdrawn').length ?? 0)

const formatDate = (raw) => new Date(raw).toLocaleDateString()

const loadRoster = async () => {
  try {
    const { data } = await api.get(`/api/courses/${courseCode}/roster`)
    roster.value = data
    loadError.value = ''
  } catch (error) {
    loadError.value = error.response?.data?.message || '讀取修課名單失敗'
  } finally {
    loading.value = false
  }
}

const importRoster = async () => {
  if (!confirm('匯入後，目前在課程中但不在這份名單上的學生會被標記為「已退選」（資料保留）。確定要匯入嗎？')) return

  importError.value = ''
  importResult.value = null
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    const { data } = await api.post(`/api/courses/${courseCode}/roster/import`, formData)
    importResult.value = data
    await Promise.all([loadRoster(), refreshCourseInfo()])
  } catch (error) {
    importError.value = error.response?.data?.message || '匯入失敗'
  } finally {
    importing.value = false
  }
}

onMounted(loadRoster)
</script>
