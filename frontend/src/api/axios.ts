import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor – attach access token ────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor – auto-refresh on 401 ──────────────────────────────
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

api.interceptors.response.use(
  // Unwrap the global { success, message, data, meta? } envelope
  (res) => {
    if (res.data && typeof res.data === 'object' && 'success' in res.data) {
      if (res.data.meta && Array.isArray(res.data.data)) {
        // Paginated response: flatten into PaginatedResult shape
        res.data = { data: res.data.data, ...res.data.meta };
      } else if ('data' in res.data) {
        // Plain response: unwrap
        res.data = res.data.data;
      }
    }
    return res;
  },
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((token) => {
            if (original.headers) original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.patch(`${BASE_URL}/auth/refresh-token`, { refreshToken });
        const payload = data?.data ?? data;
        const newAccessToken: string = payload.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        pendingRequests.forEach((cb) => cb(newAccessToken));
        pendingRequests = [];
        if (original.headers) original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
