import { api } from './axios';
import type { Bid } from '../types';

export interface CreateBidDto {
  jobId: string;
  proposedPrice: number;
  message?: string;
  estimatedDuration: number;
}

export interface UpdateBidDto {
  proposedPrice?: number;
  message?: string;
  estimatedDuration?: number;
}

export const bidsApi = {
  submitBid: (dto: CreateBidDto): Promise<Bid> =>
    api.post('/bids', dto).then((r) => r.data),

  getMyBids: (): Promise<Bid[]> =>
    api.get('/bids/my-bids').then((r) => r.data),

  getBidById: (id: string): Promise<Bid> =>
    api.get(`/bids/${id}`).then((r) => r.data),

  updateBid: (id: string, dto: UpdateBidDto): Promise<Bid> =>
    api.patch(`/bids/${id}`, dto).then((r) => r.data),

  withdrawBid: (id: string): Promise<void> =>
    api.delete(`/bids/${id}`).then((r) => r.data),
};
