<template>
  <div class="flex justify-center mt-20">
    <div class="w-full max-w-sm px-4">
      <h1 class="text-xl font-bold text-gray-800 mb-6 text-center">重設密碼</h1>
      <p v-if="!tokenFromUrl" class="text-sm text-red-600 mb-4 text-center">
        連結無效或已過期。請從電子郵件內的完整連結開啟本頁，或重新申請忘記密碼。
      </p>
      <form v-else @submit.prevent="submit" class="flex flex-col gap-4">
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="新密碼（至少 8 字元）"
            required
            minlength="8"
            class="w-full bg-[#eef3fe] border-b-[3px] border-gray-300 px-4 py-3 pr-12 text-lg text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#e4ebf9] transition-colors"
          />
          <button
            type="button"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 hover:text-black"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? "隱藏" : "顯示" }}
          </button>
        </div>
        <div>
          <input
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="確認新密碼"
            required
            class="w-full bg-[#eef3fe] border-b-[3px] border-gray-300 px-4 py-3 text-lg text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#e4ebf9] transition-colors"
          />
        </div>
        <button
          type="submit"
          class="w-full bg-[#337ab7] text-white py-2.5 rounded text-lg tracking-widest hover:bg-[#285e8e] transition-colors"
          :disabled="loading"
        >
          {{ loading ? "更新中…" : "更新密碼" }}
        </button>
      </form>
      <div class="mt-6 text-center text-[15px]">
        <router-link to="/login" class="text-[#337ab7] hover:text-[#285e8e]">返回登入</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/api/client.js";

const route = useRoute();
const router = useRouter();

const tokenFromUrl = ref("");
const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const loading = ref(false);

onMounted(() => {
  const t = route.query.token;
  tokenFromUrl.value = typeof t === "string" ? t : Array.isArray(t) ? t[0] || "" : "";
});

const submit = async () => {
  if (!tokenFromUrl.value) return;
  loading.value = true;
  try {
    const { data } = await api.post("/api/auth/reset-password", {
      token: tokenFromUrl.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    });
    alert(data.message);
    router.push("/login");
  } catch (e) {
    alert(e.response?.data?.message || "重設失敗");
  } finally {
    loading.value = false;
  }
};
</script>
