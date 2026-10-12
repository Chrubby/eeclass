<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-gray-800 border-l-4 border-[#337ab7] pl-3">
        小組專區
      </h2>
      <span class="text-xs text-gray-500">
        {{ myGroup ? `目前組別：${myGroup.name}` : '尚未加入小組' }}
      </span>
    </div>

    <div class="flex gap-2 mb-4 border-b border-gray-200">
      <button
        type="button"
        class="px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors"
        :class="activeTab === 'overview'
          ? 'border-[#337ab7] text-[#337ab7]'
          : 'border-transparent text-gray-500 hover:text-gray-800'"
        @click="activeTab = 'overview'"
      >
        小組總覽
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors"
        :class="activeTab === 'homework'
          ? 'border-[#337ab7] text-[#337ab7]'
          : 'border-transparent text-gray-500 hover:text-gray-800'"
        @click="activeTab = 'homework'"
      >
        小組作業
      </button>
    </div>

    <div v-if="activeTab === 'overview'">
      <div v-if="canManage" class="bg-white border rounded shadow-sm p-4 mb-4 space-y-4">
        <form class="flex flex-wrap items-end gap-2" @submit.prevent="createGroups">
          <label class="text-sm font-bold text-gray-700">
            批量新增小組
            <input
              v-model.number="batchGroupCount"
              type="number"
              min="1"
              max="100"
              required
              class="block w-36 mt-1 border rounded px-3 py-2 font-normal"
            />
          </label>
          <button
            type="submit"
            class="bg-[#337ab7] text-white px-4 py-2 rounded text-sm font-bold hover:bg-[#285e8e] disabled:opacity-50"
            :disabled="isCreatingGroups"
          >
            {{ isCreatingGroups ? '新增中...' : '批量新增' }}
          </button>
          <span class="text-xs text-gray-500">自動使用未占用的「第 N 組」名稱，單次最多 100 組。</span>
        </form>

        <div class="flex flex-wrap items-center gap-3 border-t pt-3">
          <button
            type="button"
            class="px-4 py-2 rounded text-sm font-bold text-white disabled:opacity-50"
            :class="studentCreationEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
            :disabled="isUpdatingSetting"
            @click="toggleStudentCreation"
          >
            {{ isUpdatingSetting ? '更新中...' : studentCreationEnabled ? '關閉學生自建小組' : '開放學生自建小組' }}
          </button>
          <span class="text-sm text-gray-600">
            {{ studentCreationEnabled ? '學生目前可以自行創建並加入小組。' : '學生自建小組目前關閉。' }}
          </span>
        </div>
      </div>

      <form
        v-else-if="studentCreationEnabled"
        class="flex flex-wrap gap-2 mb-4"
        @submit.prevent="createGroup"
      >
        <input
          v-model="newGroupName"
          type="text"
          maxlength="100"
          required
          placeholder="輸入新小組名稱"
          class="min-w-0 flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          class="bg-[#337ab7] text-white px-4 py-2 rounded text-sm font-bold hover:bg-[#285e8e] disabled:opacity-50"
          :disabled="isCreatingGroup"
        >
          {{ isCreatingGroup ? '新增中...' : '創建小組並加入' }}
        </button>
      </form>

      <ul v-if="sortedGroups.length" class="space-y-3">
        <li
          v-for="group in sortedGroups"
          :key="group.id"
          class="bg-white border rounded shadow-sm p-4"
          :class="myGroupId === group.id ? 'border-[#337ab7] bg-blue-50/60' : ''"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline gap-2 mb-1">
                <h3 class="font-bold text-gray-800">{{ group.name }}</h3>
                <span
                  v-if="myGroupId === group.id"
                  class="text-xs text-[#337ab7] font-bold"
                >
                  我的小組
                </span>
                <span class="text-xs text-gray-500">{{ group.members.length }} 人</span>
                <span
                  class="text-xs font-bold"
                  :class="group.recruitmentEnabled ? 'text-green-700' : 'text-gray-500'"
                >
                  {{ group.recruitmentEnabled ? '開放申請' : '未開放申請' }}
                </span>
              </div>
              <p v-if="group.leaderName" class="text-xs text-gray-500 mb-1">
                組長：{{ group.leaderName }}
              </p>
              <p
                v-if="group.recruitmentMessage"
                class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mb-2"
              >
                招募訊息：{{ group.recruitmentMessage }}
              </p>
              <p v-if="group.members.length" class="text-sm text-gray-700 leading-relaxed break-words">
                組員：{{ memberNames(group) }}
              </p>
              <p v-else class="text-sm text-gray-400">尚無組員</p>

              <form
                v-if="group.isLeader"
                class="mt-3 border-t pt-3 space-y-2"
                @submit.prevent="saveRecruitment(group)"
              >
                <label class="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <input
                    v-model="group.recruitmentDraftEnabled"
                    type="checkbox"
                    @change="markRecruitmentChanged(group.id)"
                  />
                  開放其他學生申請加入
                </label>
                <textarea
                  v-model="group.recruitmentDraftMessage"
                  maxlength="1000"
                  rows="2"
                  placeholder="編輯小組招募訊息（最多 1000 字）"
                  class="w-full border rounded px-3 py-2 text-sm"
                  @input="markRecruitmentChanged(group.id)"
                />
                <button
                  type="submit"
                  class="bg-[#337ab7] text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-[#285e8e]"
                  :disabled="recruitmentSaveStates[group.id] === 'saving'"
                >
                  {{ recruitmentSaveStates[group.id] === 'saving' ? '儲存中...' : '儲存招募設定' }}
                </button>
                <span
                  v-if="recruitmentSaveStates[group.id] === 'saved'"
                  class="text-sm text-green-700"
                  role="status"
                >
                  已儲存，其他學生現在可看到最新設定。
                </span>
                <span
                  v-else-if="recruitmentSaveStates[group.id] === 'error'"
                  class="text-sm text-red-600"
                  role="alert"
                >
                  儲存失敗，請檢查錯誤訊息後重試。
                </span>
              </form>

              <div v-if="group.isLeader" class="mt-3 border-t pt-3">
                <form
                  v-if="group.members.length > 1"
                  class="flex flex-wrap items-end gap-2 mb-3"
                  @submit.prevent="transferLeadership(group)"
                >
                  <label class="text-sm font-bold text-gray-700">
                    轉移組長
                    <select
                      v-model="leaderTransferTargets[group.id]"
                      required
                      class="block min-w-48 mt-1 border rounded px-3 py-2 font-normal"
                    >
                      <option value="" disabled>選擇新組長</option>
                      <option
                        v-for="member in group.members.filter((item) => item.id !== group.leaderId)"
                        :key="member.id"
                        :value="member.id"
                      >
                        {{ member.name }}
                      </option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    class="bg-gray-700 text-white px-3 py-2 rounded text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
                    :disabled="transferringGroupId === group.id"
                  >
                    {{ transferringGroupId === group.id ? '轉移中...' : '轉移組長' }}
                  </button>
                </form>
                <h4 class="text-sm font-bold text-gray-700 mb-2">
                  加入申請（{{ group.applications?.length || 0 }}）
                </h4>
                <ul v-if="group.applications?.length" class="space-y-2">
                  <li
                    v-for="application in group.applications"
                    :key="application.id"
                    class="flex flex-wrap items-start justify-between gap-2 bg-gray-50 rounded p-3"
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-bold text-gray-800">{{ application.studentName }}</p>
                      <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ application.message || '（未附訊息）' }}</p>
                    </div>
                    <button
                      type="button"
                      class="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-green-700 disabled:opacity-50"
                      :disabled="approvingApplicationId === application.id"
                      @click="approveApplication(group, application)"
                    >
                      {{ approvingApplicationId === application.id ? '處理中...' : '同意加入' }}
                    </button>
                  </li>
                </ul>
                <p v-else class="text-sm text-gray-500">目前沒有待處理的加入申請。</p>
              </div>

              <form
                v-if="!canManage && !group.isMine && group.recruitmentEnabled"
                class="mt-3 border-t pt-3 space-y-2"
                @submit.prevent="submitApplication(group)"
              >
                <p v-if="group.myApplicationStatus === 'pending'" class="text-sm text-amber-700">
                  已送出申請，等待組長審核。
                </p>
                <template v-else>
                  <textarea
                    v-model="applicationMessages[group.id]"
                    maxlength="500"
                    rows="2"
                    placeholder="附上簡短自我介紹或申請訊息（選填，最多 500 字）"
                    class="w-full border rounded px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    class="bg-[#337ab7] text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-[#285e8e] disabled:opacity-50"
                    :disabled="submittingApplicationId === group.id"
                  >
                    {{ submittingApplicationId === group.id ? '送出中...' : '申請加入' }}
                  </button>
                </template>
              </form>
            </div>
            <div class="shrink-0 flex items-center gap-2">
              <button
                v-if="canManage"
                type="button"
                class="text-sm font-bold text-red-600 hover:underline px-2 py-1"
                @click="deleteGroup(group)"
              >
                刪除小組
              </button>
              <template v-else>
                <button
                  v-if="myGroupId === group.id"
                  type="button"
                  class="text-sm font-bold text-red-600 hover:underline px-2 py-1"
                  @click="leaveGroup(group)"
                >
                  退出小組
                </button>
                <button
                  v-else-if="!group.members.length && !myGroup"
                  type="button"
                  class="bg-[#337ab7] text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-[#285e8e] disabled:opacity-50 whitespace-nowrap"
                  :disabled="joiningId === group.id"
                  @click="joinGroup(group)"
                >
                  加入並成為組長
                </button>
              </template>
            </div>
          </div>
        </li>
      </ul>

      <div v-else class="bg-white border rounded p-12 text-center text-gray-500">目前尚無小組資料</div>
    </div>

    <div v-else>
      <p v-if="!canManage && !myGroup" class="mb-4 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-2">
        請先至「小組總覽」加入小組後，才能繳交小組作業。
      </p>

      <div class="bg-white border rounded shadow-sm overflow-x-auto">
        <div class="flex bg-gray-100 text-sm font-bold text-gray-700 p-3 border-b min-w-[560px]">
          <div class="flex-1">作業名稱</div>
          <div class="w-40 text-center">截止日期</div>
          <div class="w-32 text-center">狀態</div>
          <div class="w-24 text-center">成績</div>
        </div>

        <ul v-if="groupHomeworks.length" class="divide-y divide-gray-200 min-w-[560px]">
          <li
            v-for="hw in groupHomeworks"
            :key="hw.id"
            class="flex p-3 items-center text-[15px]"
          >
            <div class="flex-1 text-[#337ab7] truncate pr-4">{{ hw.title }}</div>
            <div class="w-40 text-center text-gray-500 text-sm">{{ hw.deadlineText }}</div>
            <div class="w-32 text-center text-sm">
              <span :class="hw.statusClass">{{ hw.statusText }}</span>
            </div>
            <div class="w-24 text-center text-lg" :class="hw.score !== null && hw.score !== undefined ? 'text-green-600' : 'text-gray-400'">
              {{ hw.score ?? '-' }}
            </div>
          </li>
        </ul>

        <div v-else class="p-12 text-center text-gray-500">目前尚無小組作業</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/client.js'
import { getRoleFromToken } from '@/utils/auth.js'

const route = useRoute()
const courseId = route.params.id
const userRole = computed(() => getRoleFromToken())
const canManage = computed(() => ['teacher', 'ta'].includes(userRole.value))

const activeTab = ref('overview')
const joiningId = ref(null)
const groups = ref([])
const groupHomeworks = ref([])
const newGroupName = ref('')
const batchGroupCount = ref(1)
const isCreatingGroup = ref(false)
const isCreatingGroups = ref(false)
const studentCreationEnabled = ref(false)
const isUpdatingSetting = ref(false)
const applicationMessages = ref({})
const submittingApplicationId = ref(null)
const approvingApplicationId = ref(null)
const recruitmentSaveStates = ref({})
const leaderTransferTargets = ref({})
const transferringGroupId = ref(null)

const sortedGroups = computed(() =>
  [...groups.value].sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-TW', { numeric: true, sensitivity: 'base' }),
  ),
)

const myGroup = computed(() =>
  groups.value.find((group) => group.isMine) || null,
)

const myGroupId = computed(() => myGroup.value?.id ?? null)

const memberNames = (group) =>
  group.members.map((m) => m.name || m.id).join('、')

const loadGroups = async () => {
  const { data } = await api.get(`/api/courses/${courseId}/groups`)
  groups.value = data.map((group) => ({
    ...group,
    recruitmentDraftEnabled: group.recruitmentEnabled,
    recruitmentDraftMessage: group.recruitmentMessage,
    applications: [],
  }))
  await Promise.all(
    groups.value
      .filter((group) => group.isLeader)
      .map(async (group) => {
        const { data: applications } = await api.get(
          `/api/courses/${courseId}/groups/${group.id}/applications`,
        )
        group.applications = applications
      }),
  )
}

const markRecruitmentChanged = (groupId) => {
  if (recruitmentSaveStates.value[groupId] === 'saved') {
    recruitmentSaveStates.value[groupId] = ''
  }
}

const loadGroupHomeworks = async () => {
  const { data } = await api.get(`/api/courses/${courseId}/groups/homeworks`)
  groupHomeworks.value = data.map((homework) => {
    const isSubmitted = Boolean(homework.isSubmitted)
    const isGraded = homework.score !== null && homework.score !== undefined
    return {
      ...homework,
      deadlineText: homework.deadline
        ? new Date(homework.deadline).toLocaleString('zh-TW')
        : '-',
      statusText: !myGroup.value
        ? '需先加入小組'
        : isGraded
          ? '已批改'
          : isSubmitted
            ? '待批改'
            : '未繳交',
      statusClass: !myGroup.value
        ? 'text-gray-400'
        : isGraded
          ? 'text-green-600'
          : isSubmitted
            ? 'text-blue-600'
            : 'text-red-500',
    }
  })
}

const loadStudentCreationSetting = async () => {
  const { data } = await api.get(`/api/courses/${courseId}/groups/student-creation`)
  studentCreationEnabled.value = data.enabled
}

const loadPageData = async () => {
  try {
    await loadGroups()
    await Promise.all([loadGroupHomeworks(), loadStudentCreationSetting()])
  } catch (error) {
    alert(error.response?.data?.message || error.message || '讀取小組資料失敗')
  }
}

const saveRecruitment = async (group) => {
  recruitmentSaveStates.value[group.id] = 'saving'
  try {
    await api.put(`/api/courses/${courseId}/groups/${group.id}/recruitment`, {
      enabled: group.recruitmentDraftEnabled,
      message: group.recruitmentDraftMessage,
    })
    await loadGroups()
    recruitmentSaveStates.value[group.id] = 'saved'
  } catch (error) {
    recruitmentSaveStates.value[group.id] = 'error'
    alert(error.response?.data?.message || error.message || '更新招募設定失敗')
  }
}

const submitApplication = async (group) => {
  if (submittingApplicationId.value === group.id) return
  submittingApplicationId.value = group.id
  try {
    await api.post(`/api/courses/${courseId}/groups/${group.id}/applications`, {
      message: applicationMessages.value[group.id] || '',
    })
    applicationMessages.value[group.id] = ''
    await loadPageData()
  } catch (error) {
    alert(error.response?.data?.message || error.message || '送出加入申請失敗')
  } finally {
    submittingApplicationId.value = null
  }
}

const approveApplication = async (group, application) => {
  if (approvingApplicationId.value === application.id) return
  approvingApplicationId.value = application.id
  try {
    await api.post(
      `/api/courses/${courseId}/groups/${group.id}/applications/${application.id}/approve`,
    )
    await loadPageData()
  } catch (error) {
    if (error.response?.data?.code === 'APPLICANT_IN_OTHER_GROUP') {
      alert(`${application.studentName} 已加入其他小組，這筆申請會保留；請對方退出原小組後再重新同意。`)
    } else {
      alert(error.response?.data?.message || error.message || '同意加入申請失敗')
    }
  } finally {
    approvingApplicationId.value = null
  }
}

const transferLeadership = async (group) => {
  const studentId = leaderTransferTargets.value[group.id]
  if (!studentId || transferringGroupId.value === group.id) return

  const target = group.members.find((member) => member.id === studentId)
  if (!confirm(`確定將「${group.name}」的組長轉移給 ${target?.name || studentId} 嗎？`)) {
    return
  }

  transferringGroupId.value = group.id
  try {
    await api.put(`/api/courses/${courseId}/groups/${group.id}/leader`, { studentId })
    await loadPageData()
  } catch (error) {
    alert(error.response?.data?.message || error.message || '轉移組長失敗')
  } finally {
    transferringGroupId.value = null
  }
}

const joinGroup = async (group) => {
  if (canManage.value) return

  if (myGroup.value && myGroup.value.id !== group.id) {
    if (!confirm(`你目前在「${myGroup.value.name}」，確定改加入「${group.name}」嗎？`)) {
      return
    }
  }

  joiningId.value = group.id
  try {
    await api.post(`/api/courses/${courseId}/groups/${group.id}/members/me`)
    await loadPageData()
  } catch (error) {
    alert(error.response?.data?.message || error.message || '加入小組失敗')
  } finally {
    joiningId.value = null
  }
}

const leaveGroup = async (group) => {
  if (!confirm(`確定要退出「${group.name}」嗎？`)) return
  try {
    await api.delete(`/api/courses/${courseId}/groups/${group.id}/members/me`)
    await loadPageData()
  } catch (error) {
    alert(error.response?.data?.message || error.message || '退出小組失敗')
  }
}

const createGroup = async () => {
  const name = newGroupName.value.trim()
  if (!name || isCreatingGroup.value) return

  isCreatingGroup.value = true
  try {
    await api.post(`/api/courses/${courseId}/groups`, { name })
    newGroupName.value = ''
    await loadPageData()
  } catch (error) {
    alert(error.response?.data?.message || error.message || '新增小組失敗')
  } finally {
    isCreatingGroup.value = false
  }
}

const createGroups = async () => {
  if (
    !Number.isInteger(batchGroupCount.value)
    || batchGroupCount.value < 1
    || batchGroupCount.value > 100
    || isCreatingGroups.value
  ) {
    return
  }

  isCreatingGroups.value = true
  try {
    const { data } = await api.post(`/api/courses/${courseId}/groups/batch`, {
      count: batchGroupCount.value,
    })
    alert(`已新增 ${data.length} 個小組`)
    await loadPageData()
  } catch (error) {
    alert(error.response?.data?.message || error.message || '批量新增小組失敗')
  } finally {
    isCreatingGroups.value = false
  }
}

const toggleStudentCreation = async () => {
  if (isUpdatingSetting.value) return

  isUpdatingSetting.value = true
  try {
    const { data } = await api.put(`/api/courses/${courseId}/groups/student-creation`, {
      enabled: !studentCreationEnabled.value,
    })
    studentCreationEnabled.value = data.enabled
  } catch (error) {
    alert(error.response?.data?.message || error.message || '更新學生創建設定失敗')
  } finally {
    isUpdatingSetting.value = false
  }
}

const deleteGroup = async (group) => {
  const memberWarning = group.members.length
    ? `此小組有 ${group.members.length} 位組員，刪除後會一併將他們移出小組。`
    : ''
  if (!confirm(`確定要刪除「${group.name}」嗎？${memberWarning}`)) return

  try {
    await api.delete(`/api/courses/${courseId}/groups/${group.id}`)
    await loadPageData()
  } catch (error) {
    alert(error.response?.data?.message || error.message || '刪除小組失敗')
  }
}

onMounted(loadPageData)
</script>
