<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/client.js'

const POLL_INTERVAL_MS = 30000

const router = useRouter()
const isOpen = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const rootEl = ref(null)
let timer = null

const fetchNotifications = async () => {
  if (!localStorage.getItem('accessToken')) return
  try {
    const res = await api.get('/api/notifications')
    notifications.value = res.data.notifications || []
    unreadCount.value = res.data.unread_count || 0
  } catch (err) {
    console.error('取得通知失敗', err)
  }
}

const toggle = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) fetchNotifications()
}

const openNotification = async (item) => {
  isOpen.value = false
  if (!item.is_read) {
    item.is_read = true
    unreadCount.value = Math.max(unreadCount.value - 1, 0)
    try {
      await api.post(`/api/notifications/${item.id}/read`)
    } catch (err) {
      console.error('記錄通知已讀失敗', err)
    }
  }
  const code = item.course_code
  if (!code) return
  if (item.type === 'announcement') {
    router.push({ path: `/course/${code}`, query: { announcement: item.ref_id } })
  } else if (item.type === 'homework' || item.type === 'homework_grade') {
    router.push(`/course/${code}/homework/${item.ref_id}`)
  } else if (item.type === 'quiz' || item.type === 'quiz_comment') {
    router.push(`/course/${code}/aiquiz/${item.ref_id}`)
  } else if (item.type === 'discussion' || item.type === 'discussion_post') {
    router.push(`/course/${code}/discussion/${item.ref_id}`)
  }
}

const markAllAsRead = async () => {
  try {
    await api.post('/api/notifications/read-all')
    notifications.value.forEach((n) => { n.is_read = true })
    unreadCount.value = 0
  } catch (err) {
    console.error('全部標為已讀失敗', err)
  }
}

const formatTime = (datetime) => {
  const d = new Date(datetime)
  if (Number.isNaN(d.getTime())) return ''
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)} 小時前`
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

const onClickOutside = (e) => {
  if (isOpen.value && rootEl.value && !rootEl.value.contains(e.target)) {
    isOpen.value = false
  }
}

const onVisibilityChange = () => {
  if (document.visibilityState === 'visible') fetchNotifications()
}

onMounted(() => {
  fetchNotifications()
  timer = setInterval(fetchNotifications, POLL_INTERVAL_MS)
  document.addEventListener('click', onClickOutside)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

defineExpose({ refresh: fetchNotifications })
</script>

<template>
  <div ref="rootEl" class="relative">
    <button
      type="button"
      class="relative flex items-center hover:text-blue-600"
      title="通知"
      @click.stop="toggle"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <div
      v-if="isOpen"
      class="absolute right-0 mt-4 w-80 bg-white border border-gray-200 shadow-lg z-50 text-sm"
    >
      <div class="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
        <span class="font-bold text-gray-700">通知</span>
        <button
          v-if="unreadCount > 0"
          type="button"
          class="text-xs text-blue-600 hover:underline"
          @click="markAllAsRead"
        >
          全部標為已讀
        </button>
      </div>

      <ul class="max-h-96 overflow-y-auto divide-y divide-gray-100">
        <li
          v-for="item in notifications"
          :key="item.id"
          :class="['px-4 py-3 cursor-pointer hover:bg-gray-100', item.is_read ? 'text-gray-500' : 'bg-blue-50 text-gray-800']"
          @click="openNotification(item)"
        >
          <div class="flex items-start gap-2">
            <span v-if="!item.is_read" class="mt-1.5 w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
            <div class="min-w-0 flex-1">
              <div :class="['truncate', item.is_read ? '' : 'font-bold']">{{ item.title }}</div>
              <div v-if="item.message" class="text-xs text-gray-500 truncate mt-0.5">{{ item.message }}</div>
              <div class="text-xs text-gray-400 mt-1">{{ formatTime(item.created_at) }}</div>
            </div>
          </div>
        </li>
      </ul>

      <div v-if="notifications.length === 0" class="px-4 py-6 text-center text-gray-400">
        目前沒有通知
      </div>
    </div>
  </div>
</template>
