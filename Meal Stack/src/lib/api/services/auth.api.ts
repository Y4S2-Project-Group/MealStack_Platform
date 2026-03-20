import { apiClient } from '../client';
import type { BackendRole, BackendUser } from '../contracts';

interface AuthPayload {
  token?: string;
  user?: BackendUser;
}

export const authApi = {
  async login(email: string, password: string) {
    const res = await apiClient.post<AuthPayload>('/auth/login', { email, password });
    return {
      token: res.data?.token || (res as unknown as { token?: string }).token,
      user: res.data?.user || (res as unknown as { user?: BackendUser }).user,
    };
  },

  async register(input: { name: string; email: string; password: string; role: BackendRole }) {
    const res = await apiClient.post<AuthPayload>('/auth/register', input);
    return {
      token: res.data?.token || (res as unknown as { token?: string }).token,
      user: res.data?.user || (res as unknown as { user?: BackendUser }).user,
    };
  },

  async getMe() {
    const res = await apiClient.get<{ user: BackendUser }>('/users/me');
    return res.data?.user || (res as unknown as { user?: BackendUser }).user;
  },
};
