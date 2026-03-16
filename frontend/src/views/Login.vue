<template>
  <div class="flex justify-center mt-20">
    <div class="w-full max-w-sm px-4">
      <form @submit.prevent="login" class="flex flex-col gap-6">

        <div>
          <input 
            v-model="email" 
            type="email" 
            placeholder="Email"
            required
            class="w-full bg-[#eef3fe] border-b-[3px] border-gray-300 px-4 py-3 text-lg text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#e4ebf9] transition-colors"
          />
        </div>

        <div class="relative">
          <input 
            v-model="password" 
            :type="showPassword ? 'text' : 'password'" 
            placeholder="Password"
            required
            class="w-full bg-[#eef3fe] border-b-[3px] border-gray-300 px-4 py-3 pr-12 text-lg text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-[#e4ebf9] transition-colors"
          />
          <button 
            type="button" 
            @click="showPassword = !showPassword"
            class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-700 hover:text-black cursor-pointer"
          >
            <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.52-3.32m2.46-2.46A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.52 3.32m-2.46 2.46A9.97 9.97 0 0112 19zM15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" />
            </svg>
          </button>
        </div>

        <div class="flex items-center -mt-2">
          <input 
            id="remember" 
            v-model="rememberMe" 
            type="checkbox" 
            class="w-4 h-4 border-gray-400 rounded cursor-pointer"
          />
          <label for="remember" class="ml-2 text-gray-600 text-[15px] cursor-pointer select-none">
            保持登入狀態
          </label>
        </div>

        <button 
          type="submit" 
          class="w-full bg-[#337ab7] text-white py-2.5 rounded text-lg tracking-widest hover:bg-[#285e8e] transition-colors mt-2"
        >
          登入
        </button>
      </form>

      <div class="mt-6 text-center">
        <router-link to="/register" class="text-[#337ab7] hover:text-[#285e8e] text-[15px]">
          註冊
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"


const email = ref("")
const password = ref("")
const showPassword = ref(false)
const rememberMe = ref(false)

const router = useRouter()

const login = () => {
  //Fake
  alert("登入成功")
  router.push("/dashboard")
}
</script>