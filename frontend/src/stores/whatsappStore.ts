import { create } from 'zustand';
import type {
  ConversationCounts,
  WhatsappContact,
  WhatsappConversation,
  WhatsappConversationStatus,
  WhatsappMessage,
  WhatsappMessageStatus,
} from '../lib/whatsapp';

export type FilterTab = 'ALL' | WhatsappConversationStatus;

interface WhatsappState {
  conversations: WhatsappConversation[];
  selectedId: string | null;
  selectedConversation: WhatsappConversation | null;
  counts: ConversationCounts;
  activeTab: FilterTab;
  searchTerm: string;
  isLoadingList: boolean;
  isLoadingDetail: boolean;
  isSending: boolean;
  isSocketConnected: boolean;

  setConversations: (conversations: WhatsappConversation[]) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedConversation: (conv: WhatsappConversation | null) => void;
  setCounts: (counts: ConversationCounts) => void;
  setActiveTab: (tab: FilterTab) => void;
  setSearchTerm: (term: string) => void;
  setIsLoadingList: (loading: boolean) => void;
  setIsLoadingDetail: (loading: boolean) => void;
  setIsSending: (sending: boolean) => void;
  setIsSocketConnected: (connected: boolean) => void;

  onMessageCreated: (data: { message: WhatsappMessage; conversationId: string; contact?: WhatsappContact }) => void;
  onMessageStatus: (data: { messageId: string; conversationId: string; status: WhatsappMessageStatus }) => void;
  onConversationUpdated: (updated: Partial<WhatsappConversation> & { id: string }) => void;
}

export const useWhatsappStore = create<WhatsappState>((set, get) => ({
  conversations: [],
  selectedId: null,
  selectedConversation: null,
  counts: { bot: 0, open: 0, resolved: 0, all: 0 },
  activeTab: 'ALL',
  searchTerm: '',
  isLoadingList: false,
  isLoadingDetail: false,
  isSending: false,
  isSocketConnected: false,

  setConversations: (conversations) => set({ conversations }),
  setSelectedId: (id) => set({ selectedId: id }),
  setSelectedConversation: (selectedConversation) => set({ selectedConversation }),
  setCounts: (counts) => set({ counts }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setIsLoadingList: (isLoadingList) => set({ isLoadingList }),
  setIsLoadingDetail: (isLoadingDetail) => set({ isLoadingDetail }),
  setIsSending: (isSending) => set({ isSending }),
  setIsSocketConnected: (isSocketConnected) => set({ isSocketConnected }),

  onMessageCreated: ({ message, conversationId }) => {
    const { selectedConversation, conversations } = get();

    // 1. Atualizar mensagens da conversa aberta
    if (selectedConversation && selectedConversation.id === conversationId) {
      const exists = selectedConversation.messages?.some((m) => m.id === message.id);
      if (!exists) {
        set({
          selectedConversation: {
            ...selectedConversation,
            messages: [...(selectedConversation.messages || []), message],
            lastMessage: message,
            lastMessageAt: message.sentAt,
          },
        });
      }
    }

    // 2. Atualizar lista de conversas e mover conversa ativa para o topo
    const targetIdx = conversations.findIndex((c) => c.id === conversationId);
    if (targetIdx !== -1) {
      const target = {
        ...conversations[targetIdx],
        lastMessage: message,
        lastMessageAt: message.sentAt,
      };
      const updatedList = [
        target,
        ...conversations.filter((c) => c.id !== conversationId),
      ];
      set({ conversations: updatedList });
    } else {
      // Nova conversa recebida via WebSocket: buscar dados frescos
      import('../lib/whatsapp').then(({ whatsappApi }) => {
        whatsappApi
          .listConversations({})
          .then((res: { items: WhatsappConversation[] }) => {
            if (res?.items) set({ conversations: res.items });
          })
          .catch(() => null);
        whatsappApi
          .getCounts()
          .then((counts: ConversationCounts) => {
            if (counts) set({ counts });
          })
          .catch(() => null);
      });
    }
  },

  onMessageStatus: ({ messageId, conversationId, status }) => {
    const { selectedConversation, conversations } = get();

    if (selectedConversation && selectedConversation.id === conversationId) {
      const updatedMessages = (selectedConversation.messages || []).map((m) =>
        m.id === messageId ? { ...m, status } : m,
      );
      set({
        selectedConversation: {
          ...selectedConversation,
          messages: updatedMessages,
        },
      });
    }

    const updatedConvs = conversations.map((c) => {
      if (c.id === conversationId && c.lastMessage?.id === messageId) {
        return {
          ...c,
          lastMessage: { ...c.lastMessage, status },
        };
      }
      return c;
    });
    set({ conversations: updatedConvs });
  },

  onConversationUpdated: (updated) => {
    const { selectedConversation, conversations } = get();

    if (selectedConversation && selectedConversation.id === updated.id) {
      set({
        selectedConversation: {
          ...selectedConversation,
          ...updated,
        },
      });
    }

    const updatedConvs = conversations.map((c) =>
      c.id === updated.id ? { ...c, ...updated } : c,
    );
    set({ conversations: updatedConvs });
  },
}));
