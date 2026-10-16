<template>
  <div class="flex flex-col gap-6 mt-6 px-4">
  <div class="bg-white p-6 border">
    <h3 class="text-sm font-bold border-b border-dashed pb-2 mb-4">建立課程</h3>

    <form @submit.prevent="createCourse" class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">課程名稱 <span class="text-red-500">*</span></label>
        <input v-model="form.course_name" type="text" required :class="inputClass" />
      </div>
      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">課程代碼 <span class="text-red-500">*</span></label>
        <input v-model="form.course_code" type="text" required placeholder="例：NLA003" :class="inputClass" />
      </div>
      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">學年度 <span class="text-red-500">*</span></label>
        <input v-model="form.academic_year" type="text" required placeholder="例：115-1" :class="inputClass" />
      </div>
      <div>
        <label class="block text-gray-800 mb-1.5 text-[15px]">授課老師</label>
        <select v-model="form.teacher_username" :class="inputClass">
          <option value="">稍後由學生名冊匯入指定</option>
          <option v-for="teacher in teachers" :key="teacher.username" :value="teacher.username">
            {{ teacher.name }}（{{ teacher.username }}）
          </option>
        </select>
      </div>
      <div class="sm:col-span-2">
        <label class="block text-gray-800 mb-1.5 text-[15px]">課程描述</label>
        <textarea v-model="form.description" rows="2" :class="inputClass"></textarea>
      </div>

      <p v-if="createMessage" class="sm:col-span-2 text-[14px]" :class="createError ? 'text-red-600' : 'text-green-600'">
        {{ createMessage }}
      </p>

      <div class="sm:col-span-2">
        <button
          type="submit"
          :disabled="creating"
          class="bg-[#337ab7] text-white px-8 py-2.5 rounded text-[16px] tracking-widest hover:bg-[#285e8e] transition-colors disabled:opacity-60"
        >
          建立
        </button>
      </div>
    </form>
  </div>

  <div class="bg-white p-6 border">
    <h3 class="text-sm font-bold border-b border-dashed pb-2 mb-4">所有課程</h3>

    <p v-if="loading" class="text-gray-500 text-sm">讀取中…</p>
    <p v-else-if="error" class="text-red-600 text-sm">{{ error }}</p>
    <p v-else-if="courses.length === 0" class="text-gray-500 text-sm">目前系統中沒有任何課程。</p>

    <div v-else class="overflow-x-auto border rounded">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-gray-700 text-left">
            <th class="px-3 py-2 font-bold">課程代碼</th>
            <th class="px-3 py-2 font-bold">課程名稱</th>
            <th class="px-3 py-2 font-bold">學年</th>
            <th class="px-3 py-2 font-bold">授課老師</th>
            <th class="px-3 py-2 font-bold text-right">修課</th>
            <th class="px-3 py-2 font-bold text-right">已退選</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="course in courses" :key="course.id" class="border-t hover:bg-gray-50">
            <td class="px-3 py-2.5 font-medium">{{ course.course_code }}</td>
            <td class="px-3 py-2.5">{{ course.course_name }}</td>
            <td class="px-3 py-2.5 text-gray-600">{{ course.academic_year || '—' }}</td>
            <td class="px-3 py-2.5">{{ course.teachers.map((t) => t.name).join('、') || '—' }}</td>
            <td class="px-3 py-2.5 text-right">{{ course.active_count }}</td>
            <td class="px-3 py-2.5 text-right text-gray-500">{{ course.withdrawn_count }}</td>
            <td class="px-3 py-2.5 text-right">
              <router-link
                :to="`/course/${course.course_code}/studentlist`"
                class="text-[#337ab7] hover:underline font-bold whitespace-nowrap"
              >學生名冊</router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '@/api/client.js'

const inputClass =
  'w-full bg-white border border-gray-300 rounded px-3 py-2 text-[15px] text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#eef3fe] transition-colors'

const emptyForm = () => ({
  course_name: '',
  course_code: '',
  academic_year: '',
  teacher_username: '',
  description: '',
})

const courses = ref([])
const teachers = ref([])
const loading = ref(true)
const error = ref('')

const form = ref(emptyForm())
const creating = ref(false)
const createMessage = ref('')
const createError = ref(false)

const loadCourses = async () => {
  try {
    const { data } = await api.get('/api/courses/all')
    courses.value = data
    error.value = ''
  } catch (err) {
    error.value = err.response?.data?.message || '讀取課程失敗'
  } finally {
    loading.value = false
  }
}

const createCourse = async () => {
  creating.value = true
  createMessage.value = ''
  try {
    const payload = {
      ...form.value,
      course_name: form.value.course_name.trim(),
      course_code: form.value.course_code.trim(),
      academic_year: form.value.academic_year.trim(),
    }
    await api.post('/api/courses', payload)
    createError.value = false
    createMessage.value = `課程 ${payload.course_code} 建立成功`
    form.value = emptyForm()
    await loadCourses()
  } catch (err) {
    createError.value = true
    createMessage.value = err.response?.data?.message || '建立課程失敗'
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  const [, teacherRes] = await Promise.all([
    loadCourses(),
    api.get('/api/courses/teachers').catch(() => ({ data: [] })),
  ])
  teachers.value = teacherRes.data
})
</script>
