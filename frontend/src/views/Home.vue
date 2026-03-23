<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { onMounted } from 'vue'

const user_id = ref(null)
const user_inf = ref({})
const searchText = ref('')
const showModal = ref(false)
const searchResult = ref(null)
const message = ref('')
const router = useRouter()

const announcements = ref([
  { id: 1, date: '03-04', title: 'Announcement 1', hot: true },
  { id: 2, date: '03-02', title: 'Announcement 2', hot: true },
  { id: 3, date: '02-25', title: 'Announcement 3', hot: false }
])

const courses = ref([])

const loadUser = () => {
  const stored = localStorage.getItem("user")

  if (!stored) {
    router.push('/login')
    return
  }

  user_id.value = stored
}

const fetchMyCourses = async () => {
  try {
    const res = await axios.get('http://localhost:5000/api/student_courses', {
      params: {
        student_id: user_id.value
      }
    })

    user_inf.value = res.data.studnt
    courses.value = res.data.courses

  } catch (err) {
    console.error('取得課程失敗')
  }
}

const goToCourse = (courseId) => {
  router.push(`/course/${courseId}`)
}

const searchCourse = async () => {
  if (!searchText.value) {
    message.value = '請輸入課程ID或名稱'
    alert(message.value);
    return
  }

  try {
    const input = searchText.value.trim()
    const isCourseCode = /^[A-Za-z]{2}\d+/.test(input)

    const res = await axios.get('http://localhost:5000/api/courses', {
      params: isCourseCode
        ? { code: input }
        : { name: input }
    })

    searchResult.value = res.data
    showModal.value = true
    message.value = ''
    searchText.value = '';
  } catch (err) {
    message.value = '找不到課程'
    alert(message.value);
    searchResult.value = null
  }
}

const addCourse = async () => {
  if (!searchResult.value) return
  try {
    const res = await axios.post('http://localhost:5000/api/enroll', {
      student_id: user_id.value,
      course_code: searchResult.value.course_code
    })
    alert(res.data.message)
    showModal.value = false
    fetchMyCourses()
  } catch (err) {
    alert(err.response?.data?.message || '選課失敗')
    showModal.value = false
  }
}

onMounted(async () => {
  loadUser()

  if (!user_id.value) return

  await fetchMyCourses()
})

</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- <div class="h-32 bg-gray-300 relative flex items-center px-10">
      <h1 class="text-3xl text-white font-bold z-10">ee-class 易課平台</h1>
    </div> -->

    <div class="grid grid-cols-2 gap-x-8 gap-y-6 bg-white p-6 border">
      <div>
        <h3 class="text-sm font-bold border-b border-dashed pb-2 mb-3 ">最新公告</h3>
        <ul class="text-xs space-y-2 text-blue-600 ">
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
          新增課程
        </button>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div
          v-for="course in courses"
          :key="course.course_code"
          class="flex border rounded overflow-hidden h-28 cursor-pointer hover:shadow-md"
          @click="goToCourse(course.course_code)"
        >
          <div class="w-1/3 bg-cyan-50 flex items-center justify-center">
            <span class="text-green-500 text-sm">✔ Course</span>
          </div>

          <div class="w-2/3 p-3 text-[11px] flex flex-col justify-center">
            
            <h4 class="text-blue-600 font-bold mb-1 truncate">
              {{ course.course_name }}
            </h4>

            <p class="text-gray-500">
              老師:
              <span v-if="course.teachers && course.teachers.length">
                {{ course.teachers.map(t => t.name).join('、') }}
              </span>
              <span v-else>尚未指派</span>
            </p>

            <p class="text-gray-500">
              學年度: {{ course.academic_year || '未提供' }}
            </p>

            <p class="text-gray-500">
              代碼: {{ course.course_code }}
            </p>

          </div>
        </div>
        <div v-if="courses.length === 0" class="text-gray-400 text-sm">
          尚未選擇任何課程
        </div>
      </div>
    </div>
  </div>

  <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
    <div class="bg-white p-6 rounded shadow-lg w-96 text-sm">

      <h3 class="font-bold mb-3">課程資訊</h3>

      <div v-if="searchResult" class="space-y-2">
        <p><span class="font-semibold">課程名稱：</span>{{ searchResult.course_name }}</p>
        <p><span class="font-semibold">課程代碼：</span>{{ searchResult.course_code }}</p>
        <p><span class="font-semibold">學年度：</span>{{ searchResult.academic_year }}</p>
        <p><span class="font-semibold">描述：</span>{{ searchResult.description }}</p>

        <div>
          <p class="font-semibold">授課老師：</p>
          <ul class="list-disc ml-5">
            <li v-if="searchResult.teachers && searchResult.teachers.length === 0">
              尚未指派老師
            </li>
            <li v-for="t in searchResult.teachers" :key="t.id">
              {{ t.name }}
            </li>
          </ul>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <button
          @click="showModal = false;"
          class="px-3 py-1 border rounded"
        >
          取消
        </button>

        <button
          @click="addCourse"
          class="px-3 py-1 bg-blue-500 text-white rounded"
        >
          加入課程
        </button>
      </div>

    </div>
  </div>
</template>
