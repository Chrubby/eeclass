<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import axios from 'axios'
import ChatBot from '@/components/ChatBot.vue'

const route = useRoute()
const router = useRouter()
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const courseCode = route.params.id
const announcements = ref([])
const selectedAnnouncement = ref(null)
const showModal = ref(false)
const showAddAnnouncementModal = ref(false)

const user = ref({
  name: '',
  user_id: '',
  role: '',
})

const newAnnouncement = ref({
  title: '',
  content: '',
  is_pinned: false
})

const loadUser = async() => {
  const stored = localStorage.getItem("user")

  if (!stored) {
    router.push('/login')
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

const fetchAnnouncements = async () => {
  try {


    const res = await axios.get(`${API_BASE_URL}/api/announcements`, {
      params: {
        course_code: courseCode,
        student_id: user.value.user_id
      }
    })

    announcements.value = res.data.announcements

  } catch (err) {
    console.error('取得公告失敗', err)
  }
}

const openAnnouncement = async (item) => {
  selectedAnnouncement.value = item
  showModal.value = true
  if (user.value.role !== 'teacher') {
    await markAsRead(item.id)
    item.isNew = false
  }
}

const closeModal = () => {
  showModal.value = false
  selectedAnnouncement.value = null
}

const formatDate = (datetime) => {
  if (!datetime) return ''

  const parts = datetime.split(' ')
  const day = parts[1]
  const monthStr = parts[2]
  const year = parts[3]

  const monthMap = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04',
    May: '05', Jun: '06', Jul: '07', Aug: '08',
    Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  }

  const month = monthMap[monthStr]

  if (!year || !month || !day) return ''

  return `${year}.${month}.${day.padStart(2, '0')}`
}

const markAsRead = async (announcementId) => {
  try {

    await axios.post(`${API_BASE_URL}/api/announcements/read`, {
      student_id: user.value.user_id,
      announcement_id: announcementId
    })

  } catch (err) {
    console.error('記錄已讀失敗', err)
  }
}

const createAnnouncement = async () => {
  if (!newAnnouncement.value.title || !newAnnouncement.value.content) {
    alert('請填寫標題和內容')
    return
  }

  try {
    await axios.post(`${API_BASE_URL}/api/announcements/create`, {
      course_code: courseCode,
      teacher_id: user.value.user_id,
      title: newAnnouncement.value.title,
      content: newAnnouncement.value.content,
      is_pinned: newAnnouncement.value.is_pinned
    })

    alert('公告新增成功')
    showAddAnnouncementModal.value = false
    newAnnouncement.value = { title: '', content: '', is_pinned: false }
    fetchAnnouncements()

  } catch (err) {
    console.error('新增公告失敗', err)
    alert('新增公告失敗')
  }
}

onMounted(async() => {
  await loadUser()
  fetchAnnouncements()
})
</script>


<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">
        課程公告
      </h2>
    </div>
    <button
      v-if="user.role === 'teacher'||user.role === 'ta'"
      @click="showAddAnnouncementModal = true"
      class="bg-[#337ab7] text-white px-4 py-1.5 rounded text-sm font-bold tracking-wide hover:bg-[#285e8e] shadow-sm transition-colors flex items-center gap-1 mb-4"
    >
      ＋ 新增公告
    </button>

    <div class="bg-white border rounded shadow-sm overflow-hidden">

      <div class="flex bg-gray-100 text-sm font-bold text-gray-700 p-3 border-b">
        <div class="flex-1">標題</div>
        <div class="w-32 text-center">發布者</div>
        <div class="w-32 text-center">發布日期</div>
      </div>

      <ul class="divide-y divide-gray-200">
        <li
          v-for="item in announcements"
          :key="item.id"
          class="flex p-3 hover:bg-blue-50 cursor-pointer items-center text-[15px]"
          @click="openAnnouncement(item)"
        >
          <div class="flex-1 text-[#337ab7] hover:underline truncate pr-4">

            <span v-if="item.isNew" class="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded mr-2">
              NEW
            </span>

            {{ item.title }}
          </div>

          <div class="w-32 text-center text-gray-600 text-sm">
            {{ item.teacher_name }}
          </div>

          <div class="w-32 text-center text-gray-500 text-sm">
            {{ formatDate(item.created_at) }}
          </div>
        </li>
      </ul>

      <div v-if="announcements.length === 0" class="p-10 text-center text-gray-500">
        目前尚無公告資料
      </div>
    </div>

    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      @click="closeModal"
    >
      <div
        class="bg-white p-6 rounded shadow-lg w-96"
        @click.stop
      >
        <h3 class="text-lg font-bold mb-3">
          {{ selectedAnnouncement?.title }}
        </h3>

        <p class="text-sm text-gray-600 mb-2">
          發布者：{{ selectedAnnouncement?.teacher_name }}
        </p>

        <p class="text-sm text-gray-500 mb-4">
          日期：{{ formatDate(selectedAnnouncement?.created_at) }}
        </p>

        <div class="text-sm text-gray-800 whitespace-pre-line">
          {{ selectedAnnouncement?.content }}
        </div>

        <div class="flex justify-end mt-4">
          <button
            class="px-3 py-1 bg-blue-500 text-white rounded"
            @click="closeModal"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showAddAnnouncementModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
    <div class="bg-white p-6 rounded shadow-lg w-96 text-sm">

      <h3 class="font-bold mb-3">新增公告</h3>

      <!-- 公告標題 -->
      <input
        v-model="newAnnouncement.title"
        placeholder="公告標題"
        class="border p-2 w-full mb-2"
      />

      <!-- 公告內容 -->
      <textarea
        v-model="newAnnouncement.content"
        placeholder="公告內容"
        class="border p-2 w-full mb-2"
        rows="4"
      ></textarea>

      <!-- 是否置頂 -->
      <label class="flex items-center gap-2 mb-2">
        <input type="checkbox" v-model="newAnnouncement.is_pinned" />
        置頂公告
      </label>

      <!-- 按鈕 -->
      <div class="flex justify-end gap-2 mt-4">
        <button @click="showAddAnnouncementModal = false" class="px-3 py-1 border rounded">
          取消
        </button>

        <button @click="createAnnouncement" class="px-3 py-1 bg-green-500 text-white rounded">
          新增公告
        </button>
      </div>
    </div>
  </div>

  <ChatBot :courseCode="courseCode" :studentCode="user.user_id" />

</template>
