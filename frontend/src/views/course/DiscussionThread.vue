<template>
  <div class="mt-4">
    <div class="flex items-center gap-2 mb-2">
      <span class="font-bold text-gray-800">{{ node.author_name || node.author_username || '未知使用者' }}</span>
      <span :class="roleClass(node.role)" class="text-xs px-2 py-0.5 rounded font-bold">
        {{ roleText(node.role) }}
      </span>
      <span class="text-gray-400 text-xs">{{ formatDate(node.created_at) }}</span>
    </div>
    
    <textarea
      v-if="editing"
      v-model="editText"
      rows="3"
      class="w-full text-sm border rounded p-2 mb-2"
    />
    <p v-else class="text-gray-700 mb-2 whitespace-pre-line">{{ node.content }}</p>

    <div v-if="canManage" class="flex gap-3 mb-2 text-xs">
      <template v-if="node.student_id !== 'AI'">
        <button v-if="!editing" type="button" class="text-blue-600 font-bold" @click="startEdit">修改</button>
        <button v-if="editing" type="button" class="text-blue-600 font-bold" :disabled="saving" @click="saveEdit">{{ saving ? '儲存中...' : '儲存' }}</button>
        <button v-if="editing" type="button" class="text-gray-500" @click="editing = false">取消</button>
      </template>
      <button type="button" class="text-red-600 font-bold" @click="removePost">刪除</button>
    </div>

    <div class="flex gap-2 mt-2 mb-4">
      <input
        v-model="replyText"
        class="flex-1 text-sm border p-1.5 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
        placeholder="回覆此留言..."
        :disabled="isSubmitting"
        @keyup.enter="handleReply"
      />
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
        :username="username"
        :role="role"
        @submit-reply="(id, text) => $emit('submit-reply', id, text)"
        @changed="() => $emit('changed')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '@/api/client.js'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
  username: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['submit-reply', 'changed'])
const editing = ref(false)
const editText = ref('')
const saving = ref(false)
const canManage = computed(() => {
  if (props.node.student_id === 'AI') return props.role === 'teacher' || props.role === 'ta'
  return props.node.author_username === props.username || props.role === 'teacher' || props.role === 'ta'
})

const startEdit = () => {
  editText.value = props.node.content || ''
  editing.value = true
}

const saveEdit = async () => {
  if (!editText.value.trim()) return
  saving.value = true
  try {
    await api.put(`/api/discussions/threads/${props.node.id}`, { content: editText.value.trim() })
    editing.value = false
    emit('changed')
  } catch (error) {
    alert(error.response?.data?.message || '修改失敗')
  } finally {
    saving.value = false
  }
}

const removePost = async () => {
  if (!confirm('確定刪除這則留言？')) return
  try {
    await api.delete(`/api/discussions/threads/${props.node.id}`)
    emit('changed')
  } catch (error) {
    alert(error.response?.data?.message || '刪除失敗')
  }
}
const replyText = ref('')

const handleReply = () => {
  if (props.isSubmitting) return
  if (!replyText.value.trim()) return
  emit('submit-reply', props.node.id, replyText.value)
  replyText.value = ''
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