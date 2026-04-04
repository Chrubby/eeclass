<script setup>
import { ref, computed, onMounted, watch} from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const isMenuOpen = ref(false)
const router = useRouter()
const route = useRoute()
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const user = ref({
  //name: localStorage.getItem('user') || '尚未登入',
  name: '',
  user_id: '',
  role: '',
  level: 7,
  score: 10172,
  maxScore: 15000,
})

// 課程列表（
const courses = ref([
  { id: 'CE5061', name: 'class 1', teacher: 'teacher 1', assistant: 'assistant 1', grade: '博士班' },
  { id: 'CE3071', name: 'class 2', teacher: 'teacher 2', assistant: 'assistant 2', grade: '學士班' }
])

const isCoursePage = computed(() => route.path.startsWith('/course/'))
const courseId = computed(() => route.params.id)
const currentCourse = computed(() =>
  courses.value.find((c) => c.id === courseId.value)
)

const isAuthPage = computed(() => ["Login", "Register"].includes(route.name))

const logout = () => {
  isMenuOpen.value = false
  localStorage.clear()
  window.location.href = '/login'
}

const loadUser = async() => {
  const stored = localStorage.getItem("user")
  const isAuthRoute = route.path === '/login' || route.path === '/register'

  if (!stored && !isAuthRoute) {
    router.push('/login')
    return
  }

  if (!stored) {
    return
  }
  user.value.user_id = stored
  try {
    const res = await axios.get(`${API_BASE_URL}/api/user_inf`, {
      params: {
        user_id: user.value.user_id
    }})
    user.value.role = res.data.role

    const user_inf = res.data.user
    user.value.name = user_inf.name
    // if(user.value.role == 'student' || user.value.role == 'ta' ){
    // }else{    }


  } catch (err) {
    console.error('取得使用者資訊失敗')
  }
}

watch(() => route.path, () => {
  loadUser()
})

</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-800 font-sans">
    <header v-if="!isAuthPage" class="bg-white flex justify-between items-center px-6 py-3 border-b text-sm">
      <div class="font-bold text-base">國立中央大學「新 ee-class 系統」</div>
      <div class="flex space-x-6 items-center text-gray-600">
        <router-link to="/dashboard" class="cursor-pointer hover:text-blue-600">【我的課程】</router-link>
        <div class="relative">

          <span class="cursor-pointer hover:text-blue-600" @click="isMenuOpen = !isMenuOpen">
            {{ user.role }} ▾
          </span>

          <div v-if="isMenuOpen" class="absolute right-0 mt-4 w-32 bg-white border border-gray-200 shadow-lg z-50">
            <ul class="py-1 text-sm text-gray-700">
              <li class="px-4 py-2 hover:bg-gray-100 cursor-pointer">我的筆記</li>
              <li class="px-4 py-2 hover:bg-gray-100 cursor-pointer">問卷中心</li>
              <li class="px-4 py-2 hover:bg-gray-100 cursor-pointer">個人資訊</li>
              <li class="px-4 py-2 hover:bg-gray-100 cursor-pointer" @click="logout">登出</li>
            </ul>
          </div>

        </div>

        <span class="cursor-pointer hover:text-blue-600">🌐 EN</span>
      </div>
    </header>

    <div v-if="!isAuthPage && !isCoursePage" class="h-32 bg-gray-300 relative flex items-center px-10">
      <h1 class="text-3xl text-white font-bold z-10">ee-class 易課平台</h1>
    </div>

    <div v-else-if="!isAuthPage && isCoursePage" class="h-28 bg-[#a39481] flex items-center px-10">
      <h1 class="text-2xl text-white font-bold">課程代碼：{{ courseId }}</h1>
    </div>

    <div class="max-w-7xl mx-auto flex gap-6 mt-6 px-4 pb-10">
      <!-- sidebar -->

      <aside v-if="!isAuthPage" class="w-[260px] flex-shrink-0">
        <!-- 首頁-->
        <div v-if="!isCoursePage" class="bg-white border mb-4">
          <div class="bg-gray-100 px-4 py-2 font-bold text-center border-b text-sm">我的首頁</div>
          <div class="p-4 flex flex-col items-center">
            <div class="w-20 h-20 bg-gray-200 rounded-full mb-3"></div>
            <div class="font-bold text-sm">{{ user.name }}</div>
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
          </div>
        </div>
        <!-- 課程頁 -->
        <div v-else class="bg-white border mb-4">
          <div class="bg-gray-100 px-4 py-2 font-bold text-center border-b text-sm">{{ currentCourse?.name || '—' }}</div>
          <div class="p-4 flex flex-col">
            <div class="w-20 h-20 bg-gray-200 rounded-full mb-3 mx-auto"></div>

            <div class="font-bold text-sm mb-1 ">
              教授：{{ currentCourse?.teacher || '—' }}<br>
              助教：{{ currentCourse?.assistant || '—' }}
            </div>

            <a class="text-xs text-gray-500 hover:text-blue-600">
              私人留言
            </a>
          </div>
        </div>

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

        <ul v-else class="bg-white text-[15px] text-gray-700 py-2">

          <router-link :to="`/course/${courseId}`" custom v-slot="{ navigate, isExactActive }">
            <li @click="navigate" :class="['px-6 py-2.5 cursor-pointer', isExactActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']">
              公告
            </li>
          </router-link>

          <router-link :to="`/course/${courseId}/material`" custom v-slot="{ navigate, isActive }">
            <li @click="navigate"
                :class="['px-6 py-2.5 cursor-pointer border-b border-dashed border-gray-300 pb-4 mb-2', isActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']"
                :style="isActive ? 'border-left-style: solid;' : ''">
              教材
            </li>
          </router-link>

          <router-link :to="`/course/${courseId}/homework`" custom v-slot="{ navigate, isActive }">
            <li @click="navigate" :class="['px-6 py-2.5 cursor-pointer', isActive ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'hover:bg-gray-100']">
              作業
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

        </ul>
      </aside>

      <main class="flex-1 min-w-0">
        <router-view />
      </main>
    </div>
  </div>
</template>
