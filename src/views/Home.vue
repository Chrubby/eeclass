<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const announcements = ref([
  { id: 1, date: '03-04', title: 'Announcement 1', hot: true },
  { id: 2, date: '03-02', title: 'Announcement 2', hot: true },
  { id: 3, date: '02-25', title: 'Announcement 3', hot: false }
])

const courses = ref([
  { id: 'CE5061', name: 'class 1', teacher: 'teacher 1', assistant: 'assistant 1', grade: '博士班' },
  { id: 'CE3071', name: 'class 2', teacher: 'teacher 2', assistant: 'assistant 2', grade: '學士班' }
])

const goToCourse = (courseId) => {
  router.push(`/course/${courseId}`)
}
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
      <div class="grid grid-cols-2 gap-4">
        <div
          v-for="course in courses"
          :key="course.id"
          class="flex border rounded overflow-hidden h-24 cursor-pointer hover:shadow-md"
          @click="goToCourse(course.id)"
        >
          <div class="w-1/3 bg-cyan-50 flex items-center justify-center">
            <span class="text-green-500 text-sm">✔ Course</span>
          </div>
          <div class="w-2/3 p-3 text-[11px] flex flex-col justify-center">
            <h4 class="text-blue-600 font-bold mb-1 truncate">{{ course.name }}</h4>
            <p class="text-gray-500">老師: {{ course.teacher }}</p>
            <p class="text-gray-500">班級: {{ course.grade }}</p>
            <p class="text-gray-500">代碼: {{ course.id }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
