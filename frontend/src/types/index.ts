// ─── Auth ───────────────────────────────────────────────────────────────────

export type RoleName = 'guest' | 'client' | 'provider' | 'admin';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: RoleName;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterDto {
  name: string;
  email: string;
  phone: string;
  password: string;
  roleName: 'client' | 'provider';
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export interface Service {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  isActive: boolean;
}

// ─── Job ─────────────────────────────────────────────────────────────────────

export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface Job {
  _id: string;
  clientId: string | User;
  providerId?: string | User | null;
  serviceId: string | Service;
  title: string;
  description: string;
  imageUrl?: string;
  budget: number;
  jobLocation: string;
  status: JobStatus;
  milestones: Milestone[];
  createdAt: string;
  assignedDate?: string;
  unassignReason?: string;
  unassignedAt?: string;
}

export interface Milestone {
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
}

export interface JobQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: JobStatus;
  serviceId?: string;
  minBudget?: number;
  maxBudget?: number;
  sort?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Bid ─────────────────────────────────────────────────────────────────────

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface Bid {
  _id: string;
  jobId: string | Job;
  providerId: string | User;
  proposedPrice: number;
  message?: string;
  estimatedDuration: number;
  status: BidStatus;
  createdAt: string;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Location {
  city?: string;
  state?: string;
  country?: string;
}

export interface PortfolioItem {
  _id?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  link?: string;
}

export interface Profile {
  _id: string;
  userId: string | User;
  title?: string;
  bio?: string;
  location?: Location;
  rate?: number;
  skills?: string[];
  services?: Service[];
  categories: string[];
  photoUrl?: string;
  portfolio?: PortfolioItem[];
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt?: string;
}

// ─── Conversation & Messages ──────────────────────────────────────────────────

export interface Attachment {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  fileName?: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
  duration?: number;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string | User;
  content: string;
  attachments: Attachment[];
  readBy: string[];
  createdAt: string;
}

export interface ConversationParticipant {
  userId: string | User;
  role: RoleName;
  lastReadAt?: string;
}

export interface ConversationLastMessage {
  messageId: string;
  text: string;
  sentAt: string;
}

export interface Conversation {
  _id: string;
  participants: ConversationParticipant[];
  jobId?: string | Job;
  lastMessage?: ConversationLastMessage;
  /** Only the caller's unread count – already transformed by the backend */
  unread: number;
  createdAt: string;
}

export interface ChatRoom {
  conversation: Conversation;
  messages: Message[];
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
