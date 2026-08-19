import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '../types/api';

export const TOKEN_STORAGE_KEY = 'tradeflow_token';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Extracts a human-readable message from our backend's error shape. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const body = (err as AxiosError<ApiErrorBody>).response?.data;
    if (body?.error?.message) {
      return body.error.message;
    }
  }
  return fallback;
}
