import { api } from './axios';
import type { LoginResponse, RegisterDto } from '../types';

export const authApi = {
  register: (dto: RegisterDto) =>
    api.post('/auth/register', dto).then((r) => r.data),

  login: (email: string, password: string): Promise<LoginResponse> =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  verifyEmail: (token: string) =>
    api.patch(`/auth/verify-email?token=${token}`).then((r) => r.data),

  resendVerificationEmail: (email: string) =>
    api.post('/auth/resend-verification-email', { email }).then((r) => r.data),

  refreshToken: (refreshToken: string) =>
    api.patch('/auth/refresh-token', { refreshToken }).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (resetToken: string, newPassword: string) =>
    api.patch('/auth/reset-password', { resetToken, newPassword }).then((r) => r.data),

  updatePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/auth/update-password', { currentPassword, newPassword }).then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => r.data),
};
