<template>
  <div class="flex justify-center mt-20">
    <div class="w-full max-w-sm px-4">
      <h1 class="text-xl font-bold text-gray-800 mb-6 text-center">忘記密碼</h1>
      <p class="text-sm text-gray-600 mb-4">
        請輸入您的<strong>帳號</strong>或註冊時使用的<strong>電子郵件</strong>。若資料正確且已綁定信箱，系統將寄送重設連結。
      </p>
      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <div>
          <input
            v-model="identifier"
            type="text"
            placeholder="帳號 或 Email"
            required
            class="w-full bg-[#eef3fe] border-b-[3px] border-gray-300 px-4 py-3 text-lg text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#e4ebf9] transition-colors"
          />
        </div>
        <button
          type="submit"
          class="w-full bg-[#337ab7] text-white py-2.5 rounded text-lg tracking-widest hover:bg-[#285e8e] transition-colors"
          :disabled="loading"
        >
          {{ loading ? "送出中…" : "送出" }}
        </button>
      </form>
      <div class="mt-6 text-center text-[15px]">
        <router-link to="/login" class="text-[#337ab7] hover:text-[#285e8e]">返回登入</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import api from "@/api/client.js";

const identifier = ref("");
const loading = ref(false);

const submit = async () => {
  loading.value = true;
  try {
    const { data } = await api.post("/api/auth/forgot-password", {
      identifier: identifier.value.trim(),
    });
    alert(data.message);
  } catch (e) {
    alert(e.response?.data?.message || "送出失敗");
  } finally {
    loading.value = false;
  }
};
</script>
