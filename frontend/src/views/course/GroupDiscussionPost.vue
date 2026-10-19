<template>
  <article>
    <header class="flex flex-wrap items-center gap-2 mb-2">
      <strong class="text-sm text-gray-800">{{ post.authorName }}</strong>
      <span class="text-xs text-gray-400">{{ new Date(post.createdAt).toLocaleString() }}</span>
      <button
        v-if="isStaff || post.studentId === username"
        type="button"
        class="ml-auto text-xs font-bold text-red-600 hover:underline"
        @click="$emit('delete', post)"
      >
        刪除
      </button>
    </header>
    <p class="text-gray-700 whitespace-pre-wrap break-words">{{ post.content }}</p>

    <form class="mt-3 flex gap-2" @submit.prevent="reply">
      <input
        v-model="replyText"
        maxlength="10000"
        required
        class="min-w-0 flex-1 border rounded px-3 py-2 text-sm"
        placeholder="回覆此留言..."
      />
      <button
        type="submit"
        class="text-sm font-bold text-[#337ab7] hover:underline disabled:opacity-50"
        :disabled="posting"
      >
        回覆
      </button>
    </form>

    <ul v-if="post.children.length" class="mt-3 ml-3 pl-4 border-l-2 border-gray-200 space-y-3">
      <li v-for="child in post.children" :key="child.id">
        <GroupDiscussionPost
          :post="child"
          :username="username"
          :is-staff="isStaff"
          :posting="posting"
          @reply="(parentId, content) => $emit('reply', parentId, content)"
          @delete="(item) => $emit('delete', item)"
        />
      </li>
    </ul>
  </article>
</template>

<script setup>
import { ref } from 'vue'

defineOptions({ name: 'GroupDiscussionPost' })

const props = defineProps({
  post: { type: Object, required: true },
  username: { type: String, default: '' },
  isStaff: { type: Boolean, default: false },
  posting: { type: Boolean, default: false },
})

const emit = defineEmits(['reply', 'delete'])
const replyText = ref('')

const reply = () => {
  const content = replyText.value.trim()
  if (!content) return
  emit('reply', props.post.id, content)
  replyText.value = ''
}
</script>
