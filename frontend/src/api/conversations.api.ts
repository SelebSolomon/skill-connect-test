import { api } from './axios';
import type { ChatRoom, Conversation } from '../types';

export interface CreateConversationDto {
  recipientId: string;
  jobId?: string;
}

export const conversationsApi = {
  /** Start a new conversation or return the existing one */
  startConversation: (dto: CreateConversationDto): Promise<{ data: Conversation; isNew: boolean }> =>
    api.post('/conversations', dto).then((r) => r.data),

  /** List all non-archived conversations (includes per-user unread count) */
  listConversations: (): Promise<Conversation[]> =>
    api.get('/conversations').then((r) => r.data),

  /** Open a chat room — returns conversation + messages, resets unread */
  getAChatRoom: (id: string): Promise<ChatRoom> =>
    api.get(`/conversations/${id}`).then((r) => r.data),

  /** Archive or unarchive a conversation for the current user only */
  archiveConversation: (id: string, archive: boolean): Promise<{ conversationId: string; archived: boolean }> =>
    api.patch(`/conversations/${id}/archive`, { archive }).then((r) => r.data),

  /** Reset unread count to 0 for the current user */
  markAllAsRead: (id: string): Promise<{ conversationId: string; unread: number }> =>
    api.patch(`/conversations/${id}/read`).then((r) => r.data),
};
