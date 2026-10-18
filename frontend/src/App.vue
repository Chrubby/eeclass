<script setup>
import { ref, computed, watch, provide, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/client.js'
import { setMustChangePassword } from '@/utils/auth.js'
import NotificationBell from '@/components/NotificationBell.vue'

const isMenuOpen = ref(false)
const router = useRouter()
const route = useRoute()

const user = ref({
  name: '',
  user_id: '',
  role: '',
  email: '',
  avatar_url: '',
  profileLoaded: false,
})

const canManage = computed(() => ['teacher', 'ta'].includes(user.value.role))

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const avatarUrl = computed(() => {
  const url = user.value.avatar_url
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
})

// 課程列表（
// const courses = ref([
//   { id: 'CE5061', name: 'class 1', teacher: 'teacher 1', assistant: 'assistant 1', grade: '博士班' },
//   { id: 'CE3071', name: 'class 2', teacher: 'teacher 2', assistant: 'assistant 2', grade: '學士班' }
// ])

const isCoursePage = computed(() => route.path.startsWith('/course/'))
const courseId = computed(() => route.params.id)

const currentCourse = ref({
  name: '',
  id: '',
  teacher: '',
  assistant: ''
})

const getcurrentCourse = async (courseCode) => {
  try {
    const res = await api.get(`/api/courses/search`,{
      params: { code: courseCode }
    })
    const courseData = res.data
    const courseName = courseData.name || courseData.course_name || '未命名課程'
    let teacherName = '—'
    if (courseData.teachers) {
      if (Array.isArray(courseData.teachers) && courseData.teachers.length > 0) {
        teacherName = courseData.teachers.map(t => t.name || t.teacher_name).join(', ')
      } else {
        teacherName = courseData.teachers.name || '—'
      }
    }

    // 指定給畫面上綁定的變數
    currentCourse.value = {
      name: courseName,
      id: courseCode,
      teacher: teacherName,
      assistant: '—' // 助教欄位晚點再補
    }
  } catch (err) {
    console.error("取得課程資訊失敗", err)
  }
}

// const currentCourse = computed(() =>
//   courses.value.find((c) => c.id === courseId.value)
// )
const courseStaff = ref({ teachers: [], tas: [] })

const loadCourseStaff = async (code) => {
  if (!code) {
    courseStaff.value = { teachers: [], tas: [] }
    return
  }
  try {
    const { data } = await api.get(`/api/courses/${code}/contacts`)
    courseStaff.value = {
      teachers: data.teachers || [],
      tas: data.tas || [],
    }
  } catch {
    courseStaff.value = { teachers: [], tas: [] }
  }
}

watch(courseId, (code) => {
  if (isCoursePage.value) loadCourseStaff(code)
}, { immediate: true })

// a roster import can change the teachers and TAs shown in the sidebar
provide('refreshCourseInfo', () => loadCourseStaff(courseId.value))
provide('currentCourse', currentCourse)

const isAuthPage = computed(() =>
  ['MainPage', 'ForgotPassword', 'ResetPassword', 'ChangePassword'].includes(route.name),
)

const showEmailPrompt = computed(() =>
  !isAuthPage.value && user.value.profileLoaded && !String(user.value.email || '').trim(),
)

const goToProfile = () => {
  isMenuOpen.value = false
  router.push('/profile')
}

const logout = () => {
  isMenuOpen.value = false
  localStorage.clear()
  window.location.href = '/'
}

const loadUser = async() => {
  const stored = localStorage.getItem("user")
  const token = localStorage.getItem("accessToken")
  const isAuthRoute =
    route.path === '/' ||
    route.path === '/forgot-password' ||
    route.path === '/reset-password' ||
    route.path === '/change-password'

  if (isAuthRoute) return

  if (!stored || !token) {
    router.push('/')
    return
  }

  user.value.user_id = stored
  try {
    const res = await api.get('/api/auth/me')
    user.value.role = res.data.role
    user.value.email = res.data.email || ''
    user.value.avatar_url = res.data.avatar_url || ''
    user.value.profileLoaded = true

    const user_inf = res.data.user
    user.value.name = user_inf?.name || ''
    setMustChangePassword(Boolean(res.data.must_change_password))
    // if(user.value.role == 'student' || user.value.role == 'ta' ){
    // }else{    }


  } catch {
    console.error('取得使用者資訊失敗')
  }
}

watch(() => route.path, (newPath) => {
  loadUser()

  const match = newPath.match(/\/course?\/([^/]+)/)

  if (match && match[1]) {
    const courseId = match[1]
    getcurrentCourse(courseId)
  }
  else {
    currentCourse.value = { teacher: '', assistant: '' }
  }
}, { immediate: true }, { immediate: true })

const onProfileUpdated = () => {
  loadUser()
}

onMounted(() => {
  window.addEventListener('eeclass-profile-updated', onProfileUpdated)
})

onBeforeUnmount(() => {
  window.removeEventListener('eeclass-profile-updated', onProfileUpdated)
})

</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-800 font-sans">
    <header v-if="!isAuthPage" class="bg-white flex justify-between items-center px-6 py-3 border-b text-sm h-12">
      <router-link to ="/" class="font-bold text-base p-1 border-2 border-transparent focus:border-black rounded ">國立中央大學「LMS 計畫」</router-link>
      <div class="flex space-x-6 items-center text-gray-600">
        <template v-if="user.role === 'admin'">
          <router-link to="/admin/accounts" class="cursor-pointer hover:text-blue-600">【帳號管理】</router-link>
          <router-link to="/admin/courses" class="cursor-pointer hover:text-blue-600">【所有課程】</router-link>
        </template>
        <router-link v-else to="/dashboard" class="cursor-pointer hover:text-blue-600">【我的課程】</router-link>
        <NotificationBell v-if="user.role === 'student' || user.role === 'ta' || user.role === 'teacher'" />
        <div class="relative">

          <span class="cursor-pointer hover:text-blue-600" @click="isMenuOpen = !isMenuOpen">
            {{ user.name || '使用者' }} ▾
          </span>

          <div v-if="isMenuOpen" class="absolute right-0 mt-4 w-36 bg-white border border-gray-200 shadow-lg z-50">
            <ul class="py-1 text-sm text-gray-700">
              <!-- <li class="px-4 py-2 hover:bg-gray-100 cursor-pointer">我的筆記</li> -->
              <!-- <li class="px-4 py-2 hover:bg-gray-100 cursor-pointer">問卷中心</li> -->
              <li class="px-4 py-2 hover:bg-gray-100 cursor-pointer" @click="goToProfile">個人資訊</li>
              <li class="px-4 py-2 hover:bg-gray-100 cursor-pointer" @click="logout">登出</li>
            </ul>
          </div>

        </div>

        <!-- <span class="cursor-pointer hover:text-blue-600">🌐 EN</span> -->
      </div>
    </header>

    <div
      v-if="showEmailPrompt"
      class="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-6 py-2 text-center"
    >
      請到
      <router-link to="/profile" class="font-bold underline">個人資訊</router-link>
      填寫信箱。課程公告、作業、測驗與討論的通知會同時寄到信箱。
    </div>

    <div v-if="!isAuthPage && !isCoursePage" class="h-32 bg-gray-300 relative flex items-center px-10">
      <h1 class="text-3xl text-white font-bold">國立中央大學「LMS 計畫」</h1>
    </div>

    <div v-else-if="!isAuthPage && isCoursePage" class="h-28 bg-[#a39481] flex items-center px-10">
      <h1 class="text-2xl text-white font-bold">{{ currentCourse?.name }}</h1>
    </div>

    <!--div class="max-w-7xl mx-auto flex gap-6 mt-6 px-4 pb-10"-->
    <div class="max-w-7xl mx-auto flex gap-6 pb-10">
      <!-- sidebar -->

      <aside v-if="!isAuthPage" class="w-[260px] mt-6 px-4 flex-shrink-0">
        <!-- 首頁-->
        <div v-if="!isCoursePage" class="bg-white border mb-4">
          <div class="bg-gray-100 px-4 py-2 font-bold text-center border-b text-sm">我的首頁</div>
          <div class="p-4 flex flex-col items-center">
            <div class="w-20 h-20 bg-gray-200 rounded-full mb-3 overflow-hidden flex items-center justify-center">
              <img v-if="avatarUrl" :src="avatarUrl" alt="" class="w-full h-full object-cover" />
            </div>
            <div class="font-bold text-sm">{{ user.name || user.user_id }}</div>
            <div class="text-xs text-gray-500">{{ user.user_id }}</div>
            <!-- 等級／積分進度條（尚未實作）
            <div class="text-xs text-gray-500 mb-2 mt-1">等級 {{ user.level }}</div>
            <div class="w-full text-right text-xs text-blue-600 mb-1 font-bold">
              {{ user.score }} 分 >
            </div>
            <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-orange-400"
                :style="{ width: (user.score / user.maxScore * 100) + '%' }"
              ></div>
            </div>
            -->
          </div>
        </div>
        <!-- 課程頁 -->
        <div v-else class="bg-white border mb-4">
          <div class="bg-gray-100 px-4 py-2 font-bold text-center border-b text-sm">{{ currentCourse?.name || '未命名課程' }}</div>
          <div class="p-4 flex flex-col">
            <div class="w-20 h-20 bg-gray-200 rounded-full mb-3 mx-auto"></div>

            <div class="font-bold text-sm mb-1 space-y-2">
              <div>
                <div>教授</div>
                <p v-if="!courseStaff.teachers.length" class="font-normal text-gray-500">尚無資料</p>
                <p v-for="(person, i) in courseStaff.teachers" :key="'t' + i" class="font-normal text-gray-700">
                  {{ person.name || '未命名' }}
                  <a v-if="person.email" :href="`mailto:${person.email}`" class="block text-xs text-blue-600 hover:underline">{{ person.email }}</a>
                </p>
              </div>
              <div>
                <div>助教</div>
                <p v-if="!courseStaff.tas.length" class="font-normal text-gray-500">尚無資料</p>
                <p v-for="(person, i) in courseStaff.tas" :key="'a' + i" class="font-normal text-gray-700">
                  {{ person.name || '未命名' }}
                  <a v-if="person.email" :href="`mailto:${person.email}`" class="block text-xs text-blue-600 hover:underline">{{ person.email }}</a>
                </p>
              </div>
            </div>

            <a class="text-xs text-gray-500 hover:text-blue-600">
              私人留言
            </a>
          </div>
        </div>

        <!-- 首頁側欄選單（功能尚未實作，先隱藏）
        <ul v-if="!isCoursePage" class="bg-white text-[15px] text-gray-700 py-2">
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer">成績查詢</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer border-b border-dashed border-gray-300 pb-4 mb-2">我的課表</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer">最近事件</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer">最新討論</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer">私人留言</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer">最新公告</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer border-b border-dashed border-gray-300 pb-4 mb-2">最新教材</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer">歷年課程</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer">學習記錄</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer">出缺勤記錄</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer border-b border-dashed border-gray-300 pb-4 mb-2">筆記本</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer border-b border-dashed border-gray-300 pb-4 mb-2">檔案庫</li>
          <li class="px-6 py-2.5 hover:bg-gray-100 cursor-pointer">教學評量</li>
        </ul>
        -->

        <ul v-if="isCoursePage" class="bg-white text-[15px] text-gray-700 py-2">

          <template v-if="user.role !== 'admin'">
          <router-link :to="`/course/${courseId}`" custom v-slot="{ navigate, isExactActive }">
            <li @click="navigate" :class="['px-6 py-2.5 cursor-pointer', isExactActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']">
              公告
            </li>
          </router-link>

          <router-link :to="`/course/${courseId}/studentlist`" custom v-slot="{ navigate, isActive }">
            <li v-if="canManage" @click="navigate" :class="['px-6 py-2.5 cursor-pointer', isActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']">
              學生名冊
            </li>
          </router-link>

          <router-link :to="`/course/${courseId}/material`" custom v-slot="{ navigate, isActive }">
            <li @click="navigate" :class="['px-6 py-2.5 cursor-pointer', isActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']">
              教材
            </li>
          </router-link>

          <router-link :to="`/course/${courseId}/aiquiz`" custom v-slot="{ navigate, isActive }">
            <li @click="navigate" :class="['px-6 py-2.5 cursor-pointer', isActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']">
              AI Quiz
            </li>
          </router-link>

          <router-link :to="`/course/${courseId}/discussion`" custom v-slot="{ navigate, isActive }">
            <li @click="navigate"
                :class="['px-6 py-2.5 cursor-pointer border-b border-dashed border-gray-300 pb-4 mb-2', isActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']"
                :style="isActive ? 'border-left-style: solid;' : ''">
              討論區
            </li>
          </router-link>

          <router-link :to="`/course/${courseId}/homework`" custom v-slot="{ navigate, isActive }">
            <li @click="navigate" :class="['px-6 py-2.5 cursor-pointer', isActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']">
              作業
            </li>
          </router-link>

          <router-link :to="`/course/${courseId}/group`" custom v-slot="{ navigate, isActive }">
            <li @click="navigate" :class="['px-6 py-2.5 cursor-pointer', isActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']">
              小組專區
            </li>
          </router-link>

          <router-link :to="`/course/${courseId}/exam`" custom v-slot="{ navigate, isActive }">
            <li @click="navigate"
                :class="['px-6 py-2.5 cursor-pointer border-b border-dashed border-gray-300 pb-4 mb-2', isActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']"
                :style="isActive ? 'border-left-style: solid;' : ''">
              考試
            </li>
          </router-link>

          <router-link :to="`/course/${courseId}/grade`" custom v-slot="{ navigate, isActive }">
            <li @click="navigate" :class="['px-6 py-2.5 cursor-pointer', isActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']">
              成績
            </li>
          </router-link>
          </template>
          <router-link v-else :to="`/course/${courseId}/studentlist`" custom v-slot="{ navigate, isActive }">
            <li @click="navigate" :class="['px-6 py-2.5 cursor-pointer', isActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']">
              學生名冊
            </li>
          </router-link>

        </ul>
      </aside>

      <main class="flex-1 min-w-0">
        <router-view />
      </main>
    </div>
  </div>
</template>
