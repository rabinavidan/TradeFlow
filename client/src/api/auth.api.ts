import { apiClient } from './client';
import type { AuthResponse, User } from '../types/auth';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function registerRequest(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/register', payload);
  return res.data;
}

export async function loginRequest(payload: LoginPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', payload);
  return res.data;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await apiClient.get<{ user: User }>('/auth/me');
  return res.data.user;
}
