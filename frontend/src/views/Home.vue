<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const router = useRouter()
const user = ref({
  user_id: '',
  role: '',
})

const announcements = ref([
  { id: 1, date: '03-04', title: 'Announcement 1', hot: true },
  { id: 2, date: '03-02', title: 'Announcement 2', hot: true },
  { id: 3, date: '02-25', title: 'Announcement 3', hot: false },
])

const courses = ref([])
const searchText = ref('')
const showModal = ref(false)
const searchResult = ref(null)
const courseForm = ref({
  course_name: '',
  course_code: '',
  academic_year: '',
  description: '',
})

const loadUser = async () => {
  const stored = localStorage.getItem('user')
  if (!stored) {
    router.push('/login')
    return
  }

  user.value.user_id = stored

  try {
    const res = await axios.get(`${API_BASE_URL}/api/user_inf`, {
      params: { user_id: user.value.user_id },
    })
    user.value.role = res.data.role
  } catch (err) {
    console.error('取得使用者資訊失敗')
  }
}

const fetchMyCourses = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/user_courses`, {
      params: {
        user_id: user.value.user_id,
        role: user.value.role,
      },
    })
    courses.value = res.data
  } catch (err) {
    console.error('取得課程失敗')
  }
}

const goToCourse = (courseId) => {
  router.push(`/course/${courseId}`)
}

const searchCourse = async () => {
  if (!searchText.value.trim()) {
    alert('請輸入課程ID或名稱')
    return
  }

  try {
    const input = searchText.value.trim()
    const isCourseCode = /^[A-Za-z]{2}\d+/.test(input)
    const res = await axios.get(`${API_BASE_URL}/api/courses`, {
      params: isCourseCode ? { code: input } : { name: input },
    })
    searchResult.value = res.data
    showModal.value = true
    searchText.value = ''
  } catch (err) {
    searchResult.value = null
    alert('找不到課程')
  }
}

const addCourse = async () => {
  if (!searchResult.value) return
  try {
    const res = await axios.post(`${API_BASE_URL}/api/enroll`, {
      student_id: user.value.user_id,
      course_code: searchResult.value.course_code,
    })
    alert(res.data.message)
    showModal.value = false
    await fetchMyCourses()
  } catch (err) {
    alert(err.response?.data?.message || '選課失敗')
  }
}

const createCourse = async () => {
  if (!courseForm.value.course_name || !courseForm.value.course_code || !courseForm.value.academic_year) {
    alert('請填寫課程名稱、課程代碼與學年度')
    return
  }

  try {
    const res = await axios.post(`${API_BASE_URL}/api/create_course`, {
      teacher_id: user.value.user_id,
      course_name: courseForm.value.course_name,
      course_code: courseForm.value.course_code,
      academic_year: courseForm.value.academic_year,
      description: courseForm.value.description,
    })

    alert(res.data.message)
    showModal.value = false
    courseForm.value = {
      course_name: '',
      course_code: '',
      academic_year: '',
      description: '',
    }
    await fetchMyCourses()
  } catch (err) {
    alert(err.response?.data?.message || '建立課程失敗')
  }
}

onMounted(async () => {
  await loadUser()
  if (!user.value.user_id) return
  await fetchMyCourses()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="grid grid-cols-2 gap-x-8 gap-y-6 bg-white p-6 border">
      <div>
        <h3 class="text-sm font-bold border-b border-dashed pb-2 mb-3">最新公告</h3>
        <ul class="text-xs space-y-2 text-blue-600">
          <li v-for="item in announcements" :key="item.id" class="hover:text-blue-900">
            {{ item.date }} {{ item.title }}
            <span v-if="item.hot" class="bg-red-500 text-white px-1 rounded text-[10px]">HOT</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="bg-white p-6 border">
      <h3 class="text-sm font-bold border-b border-dashed pb-2 mb-4">我的課程</h3>
      <div class="flex gap-2 mb-5">
        <template v-if="['student', 'ta'].includes(user.role)">
          <input
            v-model="searchText"
            type="text"
            placeholder="輸入課程ID或名稱"
            class="border px-2 py-1 text-xs rounded w-40"
          />
          <button
            @click="searchCourse"
            class="bg-blue-300 text-white px-3 py-1 text-xs rounded hover:bg-blue-400"
          >
            加入課程
          </button>
        </template>
        <template v-else>
          <button
            @click="showModal = true"
            class="bg-blue-300 text-white px-3 py-1 text-xs rounded hover:bg-blue-400"
          >
            建立課程
          </button>
        </template>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div
          v-for="course in courses"
          :key="course.course_code"
          class="flex border rounded overflow-hidden h-24 cursor-pointer hover:shadow-md"
          @click="goToCourse(course.course_code)"
        >
          <div class="w-1/3 bg-cyan-50 flex items-center justify-center">
            <span class="text-green-500 text-sm">✔ Course</span>
          </div>
          <div class="w-2/3 p-3 text-[11px] flex flex-col justify-center">
            <h4 class="text-blue-600 font-bold mb-1 truncate">{{ course.course_name }}</h4>
            <p class="text-gray-500">
              老師:
              <span v-if="course.teachers && course.teachers.length">
                {{ course.teachers.map((t) => t.name).join('、') }}
              </span>
              <span v-else>尚未指派</span>
            </p>
            <p class="text-gray-500">學年度: {{ course.academic_year || '未提供' }}</p>
            <p class="text-gray-500">代碼: {{ course.course_code }}</p>
          </div>
        </div>
        <div v-if="courses.length === 0" class="text-gray-400 text-sm">尚未選擇任何課程</div>
      </div>
    </div>
  </div>

  <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
    <div class="bg-white p-6 rounded shadow-lg w-96 text-sm">
      <h3 class="font-bold mb-3">
        {{ ['student', 'ta'].includes(user.role) ? '課程資訊' : '建立課程' }}
      </h3>

      <div v-if="['student', 'ta'].includes(user.role)">
        <div v-if="searchResult" class="space-y-2">
          <p><span class="font-semibold">課程名稱：</span>{{ searchResult.course_name }}</p>
          <p><span class="font-semibold">課程代碼：</span>{{ searchResult.course_code }}</p>
          <p><span class="font-semibold">學年度：</span>{{ searchResult.academic_year }}</p>
          <p><span class="font-semibold">描述：</span>{{ searchResult.description || '無' }}</p>
          <div>
            <p class="font-semibold">授課老師：</p>
            <ul class="list-disc ml-5">
              <li v-if="!searchResult.teachers || searchResult.teachers.length === 0">尚未指派老師</li>
              <li v-for="t in searchResult.teachers" :key="t.id">{{ t.name }}</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-else>
        <input v-model="courseForm.course_name" placeholder="課程名稱" class="border p-2 w-full mb-2" />
        <input v-model="courseForm.course_code" placeholder="課程代碼" class="border p-2 w-full mb-2" />
        <input v-model="courseForm.academic_year" placeholder="學年度" class="border p-2 w-full mb-2" />
        <textarea v-model="courseForm.description" placeholder="描述" class="border p-2 w-full mb-2"></textarea>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <button @click="showModal = false" class="px-3 py-1 border rounded">取消</button>

        <button
          v-if="['student', 'ta'].includes(user.role)"
          @click="addCourse"
          class="px-3 py-1 bg-blue-500 text-white rounded"
        >
          加入課程
        </button>

        <button
          v-else
          @click="createCourse"
          class="px-3 py-1 bg-green-500 text-white rounded"
        >
          建立課程
        </button>
      </div>
    </div>
  </div>
</template>
