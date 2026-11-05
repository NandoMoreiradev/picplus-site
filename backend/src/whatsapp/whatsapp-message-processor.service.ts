import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetaApiService } from './meta-api.service';
import { WhatsappGateway } from './whatsapp.gateway';
import { AiChatbotService } from '../ai-chatbot/ai-chatbot.service';
import {
  MetaWebhookEntryChangeValueMessage,
  MetaWebhookEntryChangeValueStatus,
  MetaWebhookPayload,
} from './dto/meta-webhook.dto';
import {
  WhatsappChannel,
  WhatsappMessageDirection,
  WhatsappMessageStatus,
  WhatsappMessageType,
} from '@prisma/client';

@Injectable()
export class WhatsappMessageProcessorService {
  private readonly logger = new Logger(WhatsappMessageProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaApi: MetaApiService,
    private readonly gateway: WhatsappGateway,
    private readonly aiChatbot: AiChatbotService,
  ) {}

  /**
   * Ponto de entrada para processar o payload bruto do webhook da Meta.
   */
  async processWebhook(payload: MetaWebhookPayload): Promise<void> {
    if (payload.object !== 'whatsapp_business_account' || !payload.entry) {
      return;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages' || !change.value) {
          continue;
        }

        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;

        // 1. Processar atualizações de status de entrega (sent, delivered, read, failed)
        if (value.statuses?.length) {
          for (const statusUpdate of value.statuses) {
            await this.handleStatusUpdate(statusUpdate);
          }
        }

        // 2. Processar mensagens recebidas
        if (value.messages?.length) {
          const contactProfiles = value.contacts || [];

          for (const incomingMsg of value.messages) {
            const profile = contactProfiles.find(
              (c) => c.wa_id === incomingMsg.from,
            );
            await this.handleIncomingMessage(
              phoneNumberId,
              incomingMsg,
              profile?.profile?.name || incomingMsg.from,
            );
          }
        }
      }
    }
  }

  /**
   * Atualiza o status de entrega de uma mensagem existente.
   */
  private async handleStatusUpdate(
    statusUpdate: MetaWebhookEntryChangeValueStatus,
  ): Promise<void> {
    const wamid = statusUpdate.id;
    const metaStatus = statusUpdate.status;

    let dbStatus: WhatsappMessageStatus = WhatsappMessageStatus.SENT;
    const statusData: {
      deliveredAt?: Date;
      readAt?: Date;
      errorMessage?: string;
    } = {};

    if (metaStatus === 'delivered') {
      dbStatus = WhatsappMessageStatus.DELIVERED;
      statusData.deliveredAt = new Date();
    } else if (metaStatus === 'read') {
      dbStatus = WhatsappMessageStatus.READ;
      statusData.readAt = new Date();
    } else if (metaStatus === 'failed') {
      dbStatus = WhatsappMessageStatus.FAILED;
      statusData.errorMessage = JSON.stringify(
        statusUpdate.errors || 'Falha no envio',
      );
    }

    try {
      const message = await this.prisma.whatsappMessage.update({
        where: { wamid },
        data: {
          status: dbStatus,
          ...statusData,
        },
      });

      this.gateway.emitMessageStatus({
        messageId: message.id,
        conversationId: message.conversationId,
        wamid,
        status: dbStatus,
      });
    } catch {
      // Mensagem não encontrada no banco (pode ter sido enviada por outro canal)
    }
  }

  /**
   * Processa uma mensagem recebida do WhatsApp.
   */
  private async handleIncomingMessage(
    phoneNumberId: string,
    msg: MetaWebhookEntryChangeValueMessage,
    profileName: string,
  ): Promise<void> {
    const wamid = msg.id;

    // Deduplicação: ignora se a mensagem já foi gravada
    const existing = await this.prisma.whatsappMessage.findUnique({
      where: { wamid },
    });
    if (existing) {
      return;
    }

    // 1. Obter ou registrar contato
    const cleanWaId = msg.from.replace(/\D/g, '');
    let contact = await this.prisma.whatsappContact.findUnique({
      where: { waId: cleanWaId },
    });

    if (!contact) {
      // Tentar associar automaticamente a um Cliente ou Contato existente
      const client = await this.prisma.client.findFirst({
        where: { contacts: { some: { whatsapp: { contains: cleanWaId } } } },
      });

      const contactReq = !client
        ? await this.prisma.contactRequest.findFirst({
            where: { phone: { contains: cleanWaId } },
          })
        : null;

      contact = await this.prisma.whatsappContact.create({
        data: {
          waId: cleanWaId,
          phoneNumber: cleanWaId,
          profileName: profileName || cleanWaId,
          clientId: client?.id || null,
          contactRequestId: contactReq?.id || null,
        },
      });
    } else if (profileName && contact.profileName !== profileName) {
      contact = await this.prisma.whatsappContact.update({
        where: { id: contact.id },
        data: { profileName },
      });
    }

    // 2. Obter ou abrir conversa ativa
    let conversation = await this.prisma.whatsappConversation.findFirst({
      where: {
        contactId: contact.id,
        status: { in: ['BOT_HANDLING', 'OPEN'] },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.whatsappConversation.create({
        data: {
          contactId: contact.id,
          status: 'BOT_HANDLING',
          lastSeq: 1,
        },
      });
    } else {
      conversation = await this.prisma.whatsappConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastSeq: { increment: 1 },
        },
      });
    }

    // 3. Extrair conteúdo conforme o tipo
    let messageType: WhatsappMessageType = WhatsappMessageType.TEXT;
    let content: string | null = null;
    const mediaUrl: string | null = null;
    let mimeType: string | null = null;

    if (msg.type === 'text') {
      messageType = WhatsappMessageType.TEXT;
      content = msg.text?.body || '';
    } else if (msg.type === 'image') {
      messageType = WhatsappMessageType.IMAGE;
      content = msg.image?.caption || null;
      mimeType = msg.image?.mime_type || null;
    } else if (msg.type === 'audio') {
      messageType = WhatsappMessageType.AUDIO;
      mimeType = msg.audio?.mime_type || null;
    } else if (msg.type === 'document') {
      messageType = WhatsappMessageType.DOCUMENT;
      content = msg.document?.caption || msg.document?.filename || null;
      mimeType = msg.document?.mime_type || null;
    } else if (msg.type === 'interactive') {
      messageType = WhatsappMessageType.INTERACTIVE;
      content =
        msg.interactive?.button_reply?.title ||
        msg.interactive?.list_reply?.title ||
        'Interação';
    }

    // 4. Salvar mensagem recebida no banco
    const createdMessage = await this.prisma.whatsappMessage.create({
      data: {
        wamid,
        direction: WhatsappMessageDirection.INBOUND,
        type: messageType,
        content,
        mediaUrl,
        mimeType,
        status: WhatsappMessageStatus.DELIVERED,
        conversationId: conversation.id,
        sentAt: new Date(Number(msg.timestamp) * 1000 || Date.now()),
      },
    });

    // 5. Emitir evento WebSocket para atualizar o painel admin em tempo real
    this.gateway.emitMessageCreated({
      message: createdMessage,
      conversationId: conversation.id,
      contact,
    });
    this.gateway.emitConversationUpdated(conversation);

    // 6. Marcar como lida na Meta e obter canal ativo
    const channel = await this.prisma.whatsappChannel.findFirst({
      where: {
        OR: [{ isActive: true }, { accessToken: { not: '' } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (channel?.accessToken) {
      this.metaApi
        .markAsRead(channel.phoneNumberId, channel.accessToken, wamid)
        .catch(() => null);
    }

    // 7. Se a conversa estiver sob controle do bot com IA e houver texto, processar com o Gemini
    if (conversation.status === 'BOT_HANDLING' && content?.trim()) {
      await this.handleAiReply(channel, conversation.id, contact.waId, content);
    }
  }

  /**
   * Consulta a IA e envia a resposta para o WhatsApp.
   */
  private async handleAiReply(
    channel: WhatsappChannel | null,
    conversationId: string,
    toPhone: string,
    userText: string,
  ): Promise<void> {
    if (!channel?.accessToken || !channel?.phoneNumberId) {
      this.logger.warn(
        '[AI Chatbot] Canal do WhatsApp não possui token/phoneNumberId ativo.',
      );
      return;
    }

    const aiResult = await this.aiChatbot.processInboundMessage(
      conversationId,
      userText,
    );

    if (!aiResult || !aiResult.responseText?.trim()) {
      return;
    }

    // Enviar mensagem de resposta pelo WhatsApp
    try {
      const sendResult = await this.metaApi.sendTextMessage(
        channel.phoneNumberId,
        channel.accessToken,
        toPhone,
        aiResult.responseText,
      );

      // Salvar mensagem de saída da IA no banco
      const botMessage = await this.prisma.whatsappMessage.create({
        data: {
          wamid: sendResult?.messageId || null,
          direction: WhatsappMessageDirection.OUTBOUND,
          type: WhatsappMessageType.TEXT,
          content: aiResult.responseText,
          status: WhatsappMessageStatus.SENT,
          conversationId,
          sentAt: new Date(),
        },
      });

      this.gateway.emitMessageCreated({
        message: botMessage,
        conversationId,
      });

      // Se a IA solicitou transferência para humano (Handoff)
      if (aiResult.shouldHandoff) {
        const updatedConversation =
          await this.prisma.whatsappConversation.update({
            where: { id: conversationId },
            data: {
              status: 'OPEN',
              lastMessageAt: new Date(),
            },
          });

        // Registrar nota interna com o resumo da transferência
        if (aiResult.handoffReason) {
          await this.prisma.whatsappConversationNote.create({
            data: {
              conversationId,
              isAiGenerated: true,
              content: `🤖 [Transferência para Humano]: ${aiResult.handoffReason}`,
            },
          });
        }

        this.gateway.emitConversationUpdated(updatedConversation);
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `[AI Chatbot] Falha ao enviar resposta da IA para ${toPhone}: ${error.message}`,
      );
    }
  }
}
