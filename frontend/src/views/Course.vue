<script setup>
import { inject } from 'vue'
import { getRoleFromToken } from '@/utils/auth.js'

const isAdmin = getRoleFromToken() === 'admin'
const currentCourse = inject('currentCourse', null)
</script>

<template>
  <div>
    <!-- <div class="h-28 bg-[#a39481] flex items-center px-10">
      <h1 class="text-2xl text-white font-bold">課程代碼：{{ courseId }}</h1>
    </div> -->

    <div class="max-w-7xl mx-auto mt-6 px-4 pb-10">
      <main class="bg-white border p-6">
        <div class="text-sm text-gray-500 mb-6 pb-4 border-b">
          <router-link v-if="isAdmin" to="/admin/courses" class="text-blue-600 hover:underline">所有課程</router-link>
          <router-link v-else to="/dashboard" class="text-blue-600 hover:underline">我的首頁</router-link> /
          {{ currentCourse?.name }} 課程頁面
        </div>
        <!-- 換到另一門課時重建頁面，課程資料與在該課的身分才會重新載入 -->
        <router-view :key="$route.params.id" />
      </main>
    </div>
  </div>
</template>
