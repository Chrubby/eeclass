<template>
  <div class="mt-4">
    <div class="flex items-center gap-2 mb-2">
      <span class="font-bold text-gray-800">{{ node.author_name }}</span>
      <span :class="roleClass(node.role)" class="text-xs px-2 py-0.5 rounded font-bold">
        {{ roleText(node.role) }}
      </span>
      <span class="text-gray-400 text-xs">{{ formatDate(node.created_at) }}</span>
    </div>
    
    <p class="text-gray-700 mb-2 whitespace-pre-line">{{ node.content }}</p>

    <div class="flex flex-wrap items-center gap-2 mt-2 mb-4">
      <input
        v-model="replyText"
        class="flex-1 min-w-[160px] text-sm border p-1.5 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
        placeholder="回覆此留言..."
        :disabled="isSubmitting"
        @keyup.enter="handleReply"
      />
      <label
        v-if="aiAvailable"
        class="flex items-center gap-1.5 text-xs text-gray-700 select-none whitespace-nowrap"
      >
        <input
          v-model="requestAi"
          type="checkbox"
          class="rounded border-gray-300 text-[#337ab7] focus:ring-[#337ab7]"
          :disabled="isSubmitting"
        />
        請 AI 回覆
      </label>
      <button
        type="button"
        class="text-sm font-bold transition-colors text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        :disabled="isSubmitting"
        @click="handleReply"
      >
        {{ isSubmitting ? '發表中...' : '送出回覆' }}
      </button>
    </div>

    <div
      v-if="node.children && node.children.length > 0"
      class="ml-6 border-l-2 pl-4 border-gray-300 space-y-2"
    >
      <DiscussionThread
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :is-submitting="isSubmitting"
        :ai-available="aiAvailable"
        @submit-reply="(id, text, wantAi) => $emit('submit-reply', id, text, wantAi)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
  aiAvailable: {
    type: Boolean,
    default: false,
  },
})

// 定義向上層傳遞的事件
const emit = defineEmits(['submit-reply'])
const replyText = ref('')
const requestAi = ref(false)

const handleReply = () => {
  if (props.isSubmitting) return
  if (!replyText.value.trim()) return
  emit('submit-reply', props.node.id, replyText.value, requestAi.value)
  replyText.value = ''
  requestAi.value = false
}

// 共用方法
const roleText = (role) => {
  if (role === 'teacher') return '老師'
  if (role === 'ta') return '助教'
  if (role === 'ai') return 'AI 助手'
  return '學生'
}

const roleClass = (role) => {
  if (role === 'teacher') return 'bg-red-100 text-red-600'
  if (role === 'ta') return 'bg-orange-100 text-orange-600'
  if (role === 'ai') return 'bg-purple-100 text-purple-600'
  return 'bg-blue-100 text-blue-600'
}

const formatDate = (date) => new Date(date).toLocaleString()
</script>