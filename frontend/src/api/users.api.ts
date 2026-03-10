import { api } from './axios';
import type { User } from '../types';

export const usersApi = {
  me: (): Promise<User> => api.get('/users/me').then((r) => r.data),

  updateMe: (dto: { name?: string; phone?: string }): Promise<User> =>
    api.patch('/users/update-me', dto).then((r) => r.data),

  deleteMe: (): Promise<void> => api.delete('/users/delete-me').then((r) => r.data),
};
