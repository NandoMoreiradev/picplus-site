import { api } from './api';

export type WhatsappConversationStatus = 'BOT_HANDLING' | 'OPEN' | 'RESOLVED';
export type WhatsappMessageDirection = 'INBOUND' | 'OUTBOUND';
export type WhatsappMessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'DOCUMENT'
  | 'AUDIO'
  | 'VIDEO'
  | 'STICKER'
  | 'TEMPLATE'
  | 'INTERACTIVE'
  | 'SYSTEM';
export type WhatsappMessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface WhatsappContact {
  id: string;
  waId: string;
  phoneNumber?: string | null;
  profileName: string;
  isBlocked: boolean;
  clientId?: string | null;
  client?: { id: string; tradeName: string; corporateName: string } | null;
  contactRequestId?: string | null;
  contactRequest?: { id: string; name: string; email: string } | null;
}

export interface WhatsappMessage {
  id: string;
  wamid?: string | null;
  direction: WhatsappMessageDirection;
  type: WhatsappMessageType;
  content?: string | null;
  status: WhatsappMessageStatus;
  sentAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  errorMessage?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  conversationId: string;
  sentByUserId?: string | null;
  sentByUser?: { id: string; name: string } | null;
  replyToMessageId?: string | null;
  createdAt: string;
}

export interface WhatsappConversationNote {
  id: string;
  content: string;
  conversationId: string;
  authorId?: string | null;
  author?: { id: string; name: string } | null;
  isAiGenerated: boolean;
  createdAt: string;
}

export interface WhatsappConversation {
  id: string;
  status: WhatsappConversationStatus;
  lastMessageAt: string;
  lastSeq: number;
  resolutionReason?: string | null;
  contactId: string;
  contact: WhatsappContact;
  assignedUserId?: string | null;
  assignedUser?: { id: string; name: string; email?: string; avatarUrl?: string | null } | null;
  messages?: WhatsappMessage[];
  lastMessage?: WhatsappMessage | null;
  notes?: WhatsappConversationNote[];
  _count?: { messages: number };
  createdAt?: string;
}

export interface ConversationCounts {
  bot: number;
  open: number;
  resolved: number;
  all: number;
}

export interface WhatsappChannel {
  id?: string;
  phoneNumberId: string;
  wabaId: string;
  phoneNumber: string;
  accessToken: string;
  verifyToken: string;
  isActive: boolean;
  qualityRating?: string | null;
}

export interface AiChatbotConfig {
  id: string;
  isActive: boolean;
  personaName: string;
  systemPrompt: string;
  geminiModel: string;
  geminiApiKey?: string | null;
  temperature: number;
  autoHandoff: boolean;
  autoHandoffKeywords: string[];
  maxMessagesBeforeHandoff: number;
  businessHoursOnly: boolean;
  updatedAt: string;
}

export const whatsappApi = {
  getCounts: () => api.get<ConversationCounts>('/admin/whatsapp/counts'),

  listConversations: (query?: {
    status?: WhatsappConversationStatus;
    search?: string;
    assignedUserId?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<{
      items: WhatsappConversation[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>('/admin/whatsapp/conversations', query),

  getConversation: (id: string) => api.get<WhatsappConversation>(`/admin/whatsapp/conversations/${id}`),

  sendMessage: (conversationId: string, content: string, replyToMessageId?: string) =>
    api.post<WhatsappMessage>(`/admin/whatsapp/conversations/${conversationId}/messages`, {
      content,
      replyToMessageId,
    }),

  updateStatus: (
    conversationId: string,
    status: WhatsappConversationStatus,
    assignedUserId?: string,
    resolutionReason?: string,
  ) =>
    api.patch<WhatsappConversation>(`/admin/whatsapp/conversations/${conversationId}/status`, {
      status,
      assignedUserId,
      resolutionReason,
    }),

  addNote: (conversationId: string, content: string) =>
    api.post<WhatsappConversationNote>(`/admin/whatsapp/conversations/${conversationId}/notes`, {
      content,
    }),

  getChannel: () => api.get<WhatsappChannel>('/admin/whatsapp/channel'),

  updateChannel: (data: Partial<WhatsappChannel>) => api.put<WhatsappChannel>('/admin/whatsapp/channel', data),

  getAiConfig: () => api.get<AiChatbotConfig>('/admin/ai-chatbot/config'),

  updateAiConfig: (data: Partial<AiChatbotConfig>) => api.put<AiChatbotConfig>('/admin/ai-chatbot/config', data),

  testAiPrompt: (message: string, systemPrompt?: string, geminiModel?: string) =>
    api.post<{ reply: string }>('/admin/ai-chatbot/test', {
      message,
      systemPrompt,
      geminiModel,
    }),
};
