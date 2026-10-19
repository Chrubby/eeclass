<template>
  <section class="max-w-4xl mx-auto p-4">
    <header class="bg-white border rounded p-5 mb-5">
      <button
        type="button"
        class="text-sm text-[#337ab7] hover:underline mb-3"
        @click="router.push(`/course/${courseId}/group`)"
      >
        返回小組專區
      </button>
      <h1 class="text-xl font-bold text-gray-800">{{ groupName }}｜小組討論區</h1>
      <p class="text-sm text-gray-500 mt-1">討論內容會保留在此小組，不因組員變動而移動。</p>
    </header>

    <form class="bg-white border rounded p-4 mb-5" @submit.prevent="submitPost(null)">
      <textarea
        v-model="newPost"
        rows="3"
        maxlength="10000"
        required
        placeholder="發表討論..."
        class="w-full border rounded px-3 py-2 text-sm"
      />
      <div class="flex justify-end mt-2">
        <button
          type="submit"
          class="bg-[#337ab7] text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50"
          :disabled="posting"
        >
          {{ posting ? '發表中...' : '發表留言' }}
        </button>
      </div>
    </form>

    <div v-if="loading" class="p-8 text-center text-gray-500">讀取討論內容中...</div>
    <div v-else-if="errorMessage" class="p-4 bg-red-50 border border-red-200 rounded text-red-700">
      {{ errorMessage }}
    </div>
    <div v-else-if="!threadTree.length" class="p-8 bg-white border rounded text-center text-gray-500">
      目前尚無留言，成為第一個發表看法的人吧。
    </div>
    <ul v-else class="space-y-3">
      <li v-for="post in threadTree" :key="post.id" class="bg-white border rounded p-4">
        <PostItem
          :post="post"
          :username="username"
          :is-staff="isStaff"
          :posting="posting"
          @reply="submitPost"
          @delete="deletePost"
        />
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/client.js'
import { getRoleFromToken } from '@/utils/auth.js'
import PostItem from './GroupDiscussionPost.vue'

const route = useRoute()
const router = useRouter()
const courseId = route.params.id
const groupId = route.params.groupId
const username = localStorage.getItem('user') || ''
const isStaff = computed(() => ['teacher', 'ta'].includes(getRoleFromToken()))
const groupName = ref(`小組 ${groupId}`)
const posts = ref([])
const newPost = ref('')
const loading = ref(true)
const posting = ref(false)
const errorMessage = ref('')

const threadTree = computed(() => {
  const nodes = new Map(posts.value.map((post) => [Number(post.id), { ...post, children: [] }]))
  const roots = []
  for (const node of nodes.values()) {
    const parent = node.parentPostId == null ? null : nodes.get(Number(node.parentPostId))
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
})

const loadDiscussion = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get(`/api/courses/${courseId}/groups/${groupId}/discussion`)
    posts.value = data.posts
    groupName.value = data.groupName
  } catch (error) {
    errorMessage.value = error.response?.data?.message || error.message || '讀取小組討論失敗'
  } finally {
    loading.value = false
  }
}

const submitPost = async (parentPostId, content = newPost.value) => {
  const text = String(content || '').trim()
  if (!text || posting.value) return
  posting.value = true
  try {
    await api.post(`/api/courses/${courseId}/groups/${groupId}/discussion`, {
      content: text,
      parentPostId,
    })
    if (parentPostId == null) newPost.value = ''
    await loadDiscussion()
  } catch (error) {
    alert(error.response?.data?.message || error.message || '發表留言失敗')
  } finally {
    posting.value = false
  }
}

const deletePost = async (post) => {
  if (!confirm('刪除這則留言及其回覆？')) return
  try {
    await api.delete(`/api/courses/${courseId}/groups/${groupId}/discussion/${post.id}`)
    await loadDiscussion()
  } catch (error) {
    alert(error.response?.data?.message || error.message || '刪除留言失敗')
  }
}

onMounted(loadDiscussion)
</script>
