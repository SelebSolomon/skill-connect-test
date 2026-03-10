import { api } from './axios';
import type { Job, JobQueryParams, PaginatedResult } from '../types';

export const jobsApi = {
  getJobs: (params?: JobQueryParams): Promise<PaginatedResult<Job>> =>
    api.get('/jobs', { params }).then((r) => r.data),

  getJobById: (id: string): Promise<Job> =>
    api.get(`/jobs/${id}`).then((r) => r.data),

  getMyJobs: (params?: JobQueryParams): Promise<PaginatedResult<Job>> =>
    api.get('/jobs/my-jobs', { params }).then((r) => r.data),

  createJob: (formData: FormData): Promise<Job> =>
    api.post('/jobs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  updateJob: (id: string, dto: Partial<Job>): Promise<Job> =>
    api.patch(`/jobs/${id}`, dto).then((r) => r.data),

  deleteJob: (id: string): Promise<void> =>
    api.delete(`/jobs/${id}`).then((r) => r.data),

  assignProvider: (jobId: string, providerId: string) =>
    api.patch(`/jobs/${jobId}/assign-provider`, { providerId }).then((r) => r.data),

  unassignProvider: (jobId: string, reason: string) =>
    api.patch(`/jobs/${jobId}/unassign-provider`, { reason }).then((r) => r.data),

  getBidsForJob: (jobId: string) =>
    api.get(`/jobs/${jobId}/bids`).then((r) => r.data),
};
