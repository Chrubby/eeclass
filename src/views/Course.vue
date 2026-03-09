<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const courseId = route.params.id
</script>

<template>
  <div>
    <!-- <div class="h-28 bg-[#a39481] flex items-center px-10">
      <h1 class="text-2xl text-white font-bold">課程代碼：{{ courseId }}</h1>
    </div> -->

    <div class="max-w-7xl mx-auto mt-6 px-4 pb-10">
      <main class="bg-white border p-6">
        <div class="text-sm text-gray-500 mb-6 pb-4 border-b">
          <router-link to="/" class="text-blue-600 hover:underline">我的首頁</router-link> /
          {{ courseId }} 課程頁面
        </div>
        <p>Welcome!</p>
      </main>
    </div>
  </div>
</template>
