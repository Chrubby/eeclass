import axios from "axios";
import { courseRoleFor } from "@/utils/auth.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // 助教是課程層級身分：在課程頁面時，/me 回傳的身分換成該課的身分，各頁面原本的判斷就不用改
    if (response.config?.url?.endsWith("/api/auth/me") && response.data?.role) {
      response.data.account_role = response.data.role;
      response.data.role = courseRoleFor(response.data.role);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const header = error.config?.headers?.Authorization || error.config?.headers?.authorization || "";
      const requestToken = String(header).replace(/^Bearer\s+/i, "");
      const currentToken = localStorage.getItem("accessToken") || "";
      const staleRequest = Boolean(currentToken && requestToken && requestToken !== currentToken);
      if (!staleRequest) {
        const hadToken = Boolean(currentToken);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        const path = window.location.pathname;
        if (hadToken && path !== "/") {
          window.location.assign("/");
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
