import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  Bot,
  User as UserIcon,
  Send,
  Check,
  CheckCheck,
  Phone,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  FileText,
  UserCheck,
  Search,
  MessageSquare,
  Building,
  Info,
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useWhatsappSocket } from '../../hooks/useWhatsappSocket';
import { useWhatsappStore } from '../../stores/whatsappStore';
import {
  whatsappApi,
} from '../../lib/whatsapp';
import type { WhatsappConversationStatus } from '../../lib/whatsapp';
import { formatDateTime, formatShortDate } from '../../lib/format';

export default function Inbox() {
  useWhatsappSocket();
  const toast = useToast();

  const {
    conversations,
    selectedId,
    selectedConversation,
    counts,
    activeTab,
    searchTerm,
    isLoadingList,
    isLoadingDetail,
    isSending,
    isSocketConnected,
    setConversations,
    setSelectedId,
    setSelectedConversation,
    setCounts,
    setActiveTab,
    setSearchTerm,
    setIsLoadingList,
    setIsLoadingDetail,
    setIsSending,
  } = useWhatsappStore();

  const [messageInput, setMessageInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [showInfoPane, setShowInfoPane] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carregar lista de conversas e contagens
  const loadData = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const [countsRes, listRes] = await Promise.all([
        whatsappApi.getCounts(),
        whatsappApi.listConversations({
          status: activeTab === 'ALL' ? undefined : (activeTab as WhatsappConversationStatus),
          search: searchTerm || undefined,
        }),
      ]);
      setCounts(countsRes);
      setConversations(listRes.items);

      const currentSelected = useWhatsappStore.getState().selectedId;
      if (!currentSelected && listRes.items.length > 0) {
        setSelectedId(listRes.items[0].id);
      }
    } catch {
      toast.error('Não foi possível carregar as conversas.');
    } finally {
      setIsLoadingList(false);
    }
  }, [activeTab, searchTerm, setCounts, setConversations, setIsLoadingList, setSelectedId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Carregar conversa selecionada
  useEffect(() => {
    if (!selectedId) {
      setSelectedConversation(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDetail(true);

    whatsappApi
      .getConversation(selectedId)
      .then((conv) => {
        if (isMounted) setSelectedConversation(conv);
      })
      .catch(() => {
        if (isMounted) toast.error('Erro ao abrir conversa.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedId, setIsLoadingDetail, setSelectedConversation, toast]);

  // Rolagem suave até a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  // Envio de mensagem
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedId || !messageInput.trim() || isSending) return;

    const text = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    try {
      await whatsappApi.sendMessage(selectedId, text);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao enviar mensagem.';
      toast.error(message);
      setMessageInput(text);
    } finally {
      setIsSending(false);
    }
  };

  // Alterar status da conversa
  const handleStatusChange = async (newStatus: WhatsappConversationStatus) => {
    if (!selectedId) return;
    try {
      const updated = await whatsappApi.updateStatus(selectedId, newStatus);
      toast.success(
        newStatus === 'BOT_HANDLING'
          ? 'Conversa devolvida para a IA Cloe.'
          : newStatus === 'OPEN'
            ? 'Você assumiu o atendimento desta conversa.'
            : 'Atendimento finalizado com sucesso.',
      );
      setSelectedConversation({
        ...selectedConversation!,
        ...updated,
      });
      loadData();
    } catch {
      toast.error('Erro ao atualizar status da conversa.');
    }
  };

  // Adicionar nota interna
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !noteInput.trim() || isAddingNote) return;

    setIsAddingNote(true);
    try {
      const newNote = await whatsappApi.addNote(selectedId, noteInput.trim());
      setNoteInput('');
      toast.success('Nota interna adicionada.');
      if (selectedConversation) {
        setSelectedConversation({
          ...selectedConversation,
          notes: [newNote, ...(selectedConversation.notes || [])],
        });
      }
    } catch {
      toast.error('Erro ao salvar nota.');
    } finally {
      setIsAddingNote(false);
    }
  };

  return (
    <Container>
      {/* ── Painel Esquerdo: Lista de Conversas ── */}
      <Sidebar>
        <SidebarHeader>
          <HeaderTitleWrap>
            <h2>WhatsApp</h2>
            <ConnectionBadge $connected={isSocketConnected}>
              <span /> {isSocketConnected ? 'Ao vivo' : 'Conectando'}
            </ConnectionBadge>
          </HeaderTitleWrap>

          <SearchWrap>
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar conversa ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchWrap>

          <FilterTabs>
            <TabButton
              $active={activeTab === 'ALL'}
              onClick={() => setActiveTab('ALL')}
            >
              Todos ({counts.all})
            </TabButton>
            <TabButton
              $active={activeTab === 'BOT_HANDLING'}
              onClick={() => setActiveTab('BOT_HANDLING')}
            >
              <Bot size={13} /> IA ({counts.bot})
            </TabButton>
            <TabButton
              $active={activeTab === 'OPEN'}
              onClick={() => setActiveTab('OPEN')}
            >
              <UserIcon size={13} /> Humano ({counts.open})
            </TabButton>
            <TabButton
              $active={activeTab === 'RESOLVED'}
              onClick={() => setActiveTab('RESOLVED')}
            >
              Resolvidos ({counts.resolved})
            </TabButton>
          </FilterTabs>
        </SidebarHeader>

        <ConversationList>
          {isLoadingList && conversations.length === 0 ? (
            <EmptyBox>Carregando conversas...</EmptyBox>
          ) : conversations.length === 0 ? (
            <EmptyBox>Nenhuma conversa encontrada.</EmptyBox>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === selectedId;
              const isBot = conv.status === 'BOT_HANDLING';
              const isOpen = conv.status === 'OPEN';

              return (
                <ConversationItem
                  key={conv.id}
                  $selected={isSelected}
                  onClick={() => setSelectedId(conv.id)}
                >
                  <AvatarWrap $isBot={isBot}>
                    {conv.contact.profileName.charAt(0).toUpperCase()}
                  </AvatarWrap>

                  <ConvInfo>
                    <ConvTopRow>
                      <ContactName>{conv.contact.profileName}</ContactName>
                      <TimeLabel>
                        {formatShortDate(conv.lastMessageAt)}
                      </TimeLabel>
                    </ConvTopRow>

                    <ConvBottomRow>
                      <LastMsgPreview>
                        {conv.lastMessage?.content || 'Sem mensagens recentes'}
                      </LastMsgPreview>

                      {isBot && (
                        <StatusBadge $tone="bot">
                          <Bot size={11} /> Cloe
                        </StatusBadge>
                      )}
                      {isOpen && (
                        <StatusBadge $tone="open">
                          <UserCheck size={11} /> Humano
                        </StatusBadge>
                      )}
                      {conv.status === 'RESOLVED' && (
                        <StatusBadge $tone="resolved">
                          <Check size={11} /> Resolvido
                        </StatusBadge>
                      )}
                    </ConvBottomRow>
                  </ConvInfo>
                </ConversationItem>
              );
            })
          )}
        </ConversationList>
      </Sidebar>

      {/* ── Painel Central: Mensagens da Conversa ── */}
      <MainChatPane>
        {!selectedConversation ? (
          <NoChatSelected>
            <MessageSquare size={48} />
            <h3>Selecione uma conversa para iniciar o atendimento</h3>
            <p>
              As mensagens recebidas pelo WhatsApp oficial da PicPlus aparecem aqui em tempo real.
            </p>
          </NoChatSelected>
        ) : (
          <>
            <ChatHeader>
              <HeaderContactInfo>
                <AvatarLarge $isBot={selectedConversation.status === 'BOT_HANDLING'}>
                  {selectedConversation.contact.profileName.charAt(0).toUpperCase()}
                </AvatarLarge>
                <div>
                  <HeaderContactName>
                    {selectedConversation.contact.profileName}
                  </HeaderContactName>
                  <HeaderContactPhone>
                    <Phone size={12} /> {selectedConversation.contact.waId}
                  </HeaderContactPhone>
                </div>
              </HeaderContactInfo>

              <HeaderActions>
                {selectedConversation.status === 'BOT_HANDLING' ? (
                  <ActionButton
                    $variant="primary"
                    onClick={() => handleStatusChange('OPEN')}
                  >
                    <UserCheck size={15} /> Assumir Atendimento
                  </ActionButton>
                ) : selectedConversation.status === 'OPEN' ? (
                  <>
                    <ActionButton
                      $variant="secondary"
                      onClick={() => handleStatusChange('BOT_HANDLING')}
                    >
                      <RotateCcw size={15} /> Devolver para IA
                    </ActionButton>
                    <ActionButton
                      $variant="success"
                      onClick={() => handleStatusChange('RESOLVED')}
                    >
                      <CheckCircle2 size={15} /> Resolver
                    </ActionButton>
                  </>
                ) : (
                  <ActionButton
                    $variant="secondary"
                    onClick={() => handleStatusChange('OPEN')}
                  >
                    <RotateCcw size={15} /> Reabrir Conversa
                  </ActionButton>
                )}

                <IconButton
                  $active={showInfoPane}
                  onClick={() => setShowInfoPane(!showInfoPane)}
                  title="Informações do contato"
                >
                  <Info size={18} />
                </IconButton>
              </HeaderActions>
            </ChatHeader>

            {/* Aviso quando o robô IA está no comando */}
            {selectedConversation.status === 'BOT_HANDLING' && (
              <AiBanner>
                <Sparkles size={16} />
                <span>
                  <strong>A Cloe (IA) está atendendo este cliente automaticamente.</strong> Se você enviar uma mensagem, o atendimento passa automaticamente para você.
                </span>
              </AiBanner>
            )}

            {/* Linha do tempo das mensagens */}
            <MessageTimeline>
              {isLoadingDetail ? (
                <EmptyBox>Carregando histórico...</EmptyBox>
              ) : selectedConversation.messages?.length === 0 ? (
                <EmptyBox>Nenhuma mensagem nesta conversa.</EmptyBox>
              ) : (
                selectedConversation.messages?.map((msg) => {
                  const isOut = msg.direction === 'OUTBOUND';
                  return (
                    <MessageRow key={msg.id} $isOut={isOut}>
                      <MessageBubble $isOut={isOut}>
                        {isOut && (
                          <BubbleSender>
                            {msg.sentByUser ? msg.sentByUser.name : 'Cloe (IA)'}
                          </BubbleSender>
                        )}
                        <BubbleText>{msg.content}</BubbleText>
                        <BubbleMeta>
                          <BubbleTime>{formatDateTime(msg.sentAt)}</BubbleTime>
                          {isOut && (
                            <StatusIcon>
                              {msg.status === 'READ' ? (
                                <CheckCheck size={14} color="#38bdf8" />
                              ) : msg.status === 'DELIVERED' ? (
                                <CheckCheck size={14} />
                              ) : (
                                <Check size={14} />
                              )}
                            </StatusIcon>
                          )}
                        </BubbleMeta>
                      </MessageBubble>
                    </MessageRow>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </MessageTimeline>

            {/* Campo de envio */}
            <MessageInputArea onSubmit={handleSendMessage}>
              <ChatTextarea
                placeholder="Digite uma mensagem (Pressione Enter para enviar, Shift+Enter para nova linha)..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isSending}
                rows={1}
              />
              <SendButton type="submit" disabled={!messageInput.trim() || isSending}>
                <Send size={18} />
              </SendButton>
            </MessageInputArea>
          </>
        )}
      </MainChatPane>

      {/* ── Painel Direito: Dados do Contato e Notas ── */}
      {selectedConversation && showInfoPane && (
        <ContactPane>
          <PaneSection>
            <PaneTitle>Detalhes do Contato</PaneTitle>
            <ContactDetailCard>
              <ContactDetailName>
                {selectedConversation.contact.profileName}
              </ContactDetailName>
              <ContactDetailItem>
                <Phone size={14} /> {selectedConversation.contact.waId}
              </ContactDetailItem>
              {selectedConversation.contact.client && (
                <LinkedCard>
                  <Building size={14} />
                  <div>
                    <strong>Cliente Vinculado</strong>
                    <p>{selectedConversation.contact.client.tradeName}</p>
                  </div>
                </LinkedCard>
              )}
              {selectedConversation.contact.contactRequest && (
                <LinkedCard>
                  <FileText size={14} />
                  <div>
                    <strong>Proposta / Orçamento</strong>
                    <p>{selectedConversation.contact.contactRequest.name}</p>
                  </div>
                </LinkedCard>
              )}
            </ContactDetailCard>
          </PaneSection>

          <PaneSection>
            <PaneTitle>Notas Internas & IA</PaneTitle>
            <NoteForm onSubmit={handleAddNote}>
              <textarea
                placeholder="Adicionar nota interna sobre o cliente..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                rows={2}
              />
              <NoteSubmitButton type="submit" disabled={!noteInput.trim() || isAddingNote}>
                Adicionar Nota
              </NoteSubmitButton>
            </NoteForm>

            <NotesList>
              {selectedConversation.notes?.length === 0 ? (
                <EmptyNotes>Nenhuma nota registrada.</EmptyNotes>
              ) : (
                selectedConversation.notes?.map((note) => (
                  <NoteItem key={note.id} $isAi={note.isAiGenerated}>
                    <NoteHeader>
                      <span>
                        {note.isAiGenerated ? '🤖 Resumo da IA' : note.author?.name || 'Equipe'}
                      </span>
                      <small>{formatDateTime(note.createdAt)}</small>
                    </NoteHeader>
                    <NoteBody>{note.content}</NoteBody>
                  </NoteItem>
                ))
              )}
            </NotesList>
          </PaneSection>
        </ContactPane>
      )}
    </Container>
  );
}

// ─────────────────────────────────────────────────────────────
// Styled Components (Paleta Oficial PicPlus: #0a0a0a, #171717, #B6E829)
// ─────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  background: ${({ theme }) => theme.colors.background};
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 360px;
  min-width: 320px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.surface};
`;

const SidebarHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const HeaderTitleWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    margin: 0;
  }
`;

const ConnectionBadge = styled.span<{ $connected: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${({ theme, $connected }) =>
    $connected ? theme.colors.primarySoft : theme.colors.warningSoft};
  color: ${({ theme, $connected }) =>
    $connected ? theme.colors.primary : theme.colors.warning};

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
`;

const SearchWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.45rem 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};

  input {
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.85rem;
    width: 100%;
    outline: none;

    &::placeholder {
      color: ${({ theme }) => theme.colors.textMuted};
    }
  }
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding-bottom: 2px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.surfaceElevated};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.textDark : theme.colors.textSecondary};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? theme.colors.textDark : theme.colors.text};
  }
`;

const ConversationList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const ConversationItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.surfaceElevated : 'transparent'};
  border-left: 3px solid
    ${({ theme, $selected }) => ($selected ? theme.colors.primary : 'transparent')};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`;

const AvatarWrap = styled.div<{ $isBot?: boolean }>`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: ${({ theme, $isBot }) =>
    $isBot ? theme.colors.primarySoft : theme.colors.surfaceHover};
  color: ${({ theme, $isBot }) =>
    $isBot ? theme.colors.primary : theme.colors.text};
  border: 1px solid
    ${({ theme, $isBot }) => ($isBot ? theme.colors.primaryBorder : theme.colors.border)};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
`;

const ConvInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ConvTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
`;

const ContactName = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TimeLabel = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ConvBottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const LastMsgPreview = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`;

const StatusBadge = styled.span<{ $tone: 'bot' | 'open' | 'resolved' }>`
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  background: ${({ theme, $tone }) =>
    $tone === 'bot'
      ? theme.colors.primarySoft
      : $tone === 'open'
        ? theme.colors.infoSoft
        : theme.colors.surfaceHover};
  color: ${({ theme, $tone }) =>
    $tone === 'bot'
      ? theme.colors.primary
      : $tone === 'open'
        ? theme.colors.info
        : theme.colors.textMuted};
`;

const MainChatPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
  min-width: 0;
`;

const NoChatSelected = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  padding: 2rem;

  h3 {
    margin: 1rem 0 0.5rem;
    color: ${({ theme }) => theme.colors.text};
  }

  p {
    max-width: 400px;
    font-size: 0.875rem;
  }
`;

const ChatHeader = styled.div`
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.colors.surface};
`;

const HeaderContactInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const AvatarLarge = styled(AvatarWrap)`
  width: 44px;
  height: 44px;
`;

const HeaderContactName = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const HeaderContactPhone = styled.div`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 2px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'success' }>`
  border: 1px solid
    ${({ theme, $variant }) =>
      $variant === 'primary'
        ? theme.colors.primary
        : $variant === 'success'
          ? theme.colors.success
          : theme.colors.border};
  background: ${({ theme, $variant }) =>
    $variant === 'primary'
      ? theme.colors.primary
      : $variant === 'success'
        ? theme.colors.successSoft
        : theme.colors.surfaceElevated};
  color: ${({ theme, $variant }) =>
    $variant === 'primary'
      ? theme.colors.textDark
      : $variant === 'success'
        ? theme.colors.success
        : theme.colors.text};
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.45rem 0.85rem;
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
`;

const IconButton = styled.button<{ $active?: boolean }>`
  background: ${({ theme, $active }) =>
    $active ? theme.colors.surfaceHover : 'transparent'};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.borderStrong : 'transparent')};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.textSecondary};
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const AiBanner = styled.div`
  background: ${({ theme }) => theme.colors.primarySoft};
  border-bottom: 1px solid ${({ theme }) => theme.colors.primaryBorder};
  padding: 0.6rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.8125rem;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const MessageTimeline = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const MessageRow = styled.div<{ $isOut: boolean }>`
  display: flex;
  justify-content: ${({ $isOut }) => ($isOut ? 'flex-end' : 'flex-start')};
`;

const MessageBubble = styled.div<{ $isOut: boolean }>`
  max-width: 65%;
  background: ${({ theme, $isOut }) =>
    $isOut ? theme.colors.surfaceElevated : theme.colors.surface};
  border: 1px solid
    ${({ theme, $isOut }) =>
      $isOut ? theme.colors.primaryBorder : theme.colors.border};
  border-radius: 12px;
  ${({ $isOut }) =>
    $isOut ? 'border-bottom-right-radius: 2px;' : 'border-bottom-left-radius: 2px;'}
  padding: 0.65rem 0.85rem;
  color: ${({ theme }) => theme.colors.text};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
`;

const BubbleSender = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 2px;
`;

const BubbleText = styled.div`
  font-size: 0.875rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
`;

const BubbleMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-top: 4px;
`;

const BubbleTime = styled.span`
  font-size: 0.68rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const StatusIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const MessageInputArea = styled.form`
  padding: 0.85rem 1.25rem;
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ChatTextarea = styled.textarea`
  flex: 1;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.65rem 0.85rem;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;
  resize: none;
  outline: none;
  max-height: 100px;
  font-family: inherit;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const SendButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.textDark};
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ContactPane = styled.div`
  width: 320px;
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 1.25rem;
  gap: 1.5rem;
`;

const PaneSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PaneTitle = styled.h4`
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
`;

const ContactDetailCard = styled.div`
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ContactDetailName = styled.strong`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text};
`;

const ContactDetailItem = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const LinkedCard = styled.div`
  margin-top: 0.4rem;
  padding: 0.5rem;
  background: ${({ theme }) => theme.colors.surfaceHover};
  border-radius: 6px;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};

  strong {
    color: ${({ theme }) => theme.colors.primary};
    display: block;
  }

  p {
    margin: 2px 0 0;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const NoteForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  textarea {
    background: ${({ theme }) => theme.colors.surfaceElevated};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 6px;
    padding: 0.5rem;
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.8rem;
    resize: none;
    outline: none;
    font-family: inherit;
  }
`;

const NoteSubmitButton = styled.button`
  background: ${({ theme }) => theme.colors.surfaceHover};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-end;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const NotesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  overflow-y: auto;
`;

const NoteItem = styled.div<{ $isAi?: boolean }>`
  background: ${({ theme, $isAi }) =>
    $isAi ? theme.colors.primarySoft : theme.colors.surfaceElevated};
  border: 1px solid
    ${({ theme, $isAi }) =>
      $isAi ? theme.colors.primaryBorder : theme.colors.border};
  border-radius: 6px;
  padding: 0.6rem;
  font-size: 0.8rem;
`;

const NoteHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const NoteBody = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.4;
`;

const EmptyNotes = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  padding: 1rem;
`;

const EmptyBox = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.85rem;
`;
