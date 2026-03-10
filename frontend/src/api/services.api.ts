import { api } from './axios';
import type { Service } from '../types';

export const servicesApi = {
  getAll: (category?: string, search?: string): Promise<Service[]> =>
    api.get('/services', { params: { category, search } }).then((r) => r.data),

  getCategories: (): Promise<string[]> =>
    api.get('/services/categories').then((r) => r.data),

  getBySlug: (slug: string): Promise<Service> =>
    api.get(`/services/${slug}`).then((r) => r.data),
};
