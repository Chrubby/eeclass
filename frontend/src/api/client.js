import axios from "axios";

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
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = localStorage.getItem("accessToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      if (hadToken && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

export default api;
