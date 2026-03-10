import { api } from './axios';
import type { Attachment, Message } from '../types';

export interface SendMessageDto {
  conversationId: string;
  content?: string;
  attachments?: Attachment[];
}

export interface SendMessageResponse {
  message: Message;
  conversation: { messageId: string; text: string; sentAt: string };
}

export const messagesApi = {
  /** Send a message (also triggers socket emit on the backend) */
  sendMessage: (dto: SendMessageDto): Promise<SendMessageResponse> =>
    api.post('/messages', dto).then((r) => r.data),

  /** Fetch all messages for a conversation (resets unread to 0) */
  getMessages: (conversationId: string): Promise<Message[]> =>
    api.get(`/messages/${conversationId}`).then((r) => r.data),

  /** Mark a single message as read */
  markMessageAsRead: (messageId: string): Promise<{ messageId: string; readBy: string[]; unread: number }> =>
    api.patch(`/messages/${messageId}/read`).then((r) => r.data),
};
