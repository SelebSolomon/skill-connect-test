import { api } from './axios';
import type { Profile } from '../types';

export interface QueryProfilesParams {
  category?: string;
  city?: string;
  skills?: string;
  minRate?: number;
  maxRate?: number;
  page?: number;
  limit?: number;
}

export const profileApi = {
  getMyProfile: (): Promise<Profile> =>
    api.get('/profile/me').then((r) => r.data),

  getProfileByUserId: (userId: string): Promise<Profile> =>
    api.get(`/profile/${userId}`).then((r) => r.data),

  queryProfiles: (params?: QueryProfilesParams): Promise<Profile[]> =>
    api.get('/profile', { params }).then((r) => r.data),

  createProfile: (formData: FormData): Promise<Profile> =>
    api.post('/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  updateProfile: (formData: FormData): Promise<Profile> =>
    api.patch('/profile/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  updateProfilePhoto: (file: File): Promise<Profile> => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.patch('/profile/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  deleteProfilePhoto: (): Promise<void> =>
    api.delete('/profile/me/photo').then((r) => r.data),
};
