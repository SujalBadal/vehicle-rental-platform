import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? "http://localhost:5000/api/v1" : "/api/v1");

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
