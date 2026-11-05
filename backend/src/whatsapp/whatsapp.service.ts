import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetaApiService } from './meta-api.service';
import { WhatsappGateway } from './whatsapp.gateway';
import {
  CreateConversationNoteDto,
  ListConversationsQueryDto,
  SendAgentMessageDto,
  UpdateChannelConfigDto,
  UpdateConversationStatusDto,
} from './dto/whatsapp.dto';
import {
  WhatsappMessageDirection,
  WhatsappMessageStatus,
  WhatsappMessageType,
} from '@prisma/client';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metaApi: MetaApiService,
    private readonly gateway: WhatsappGateway,
  ) {}

  /**
   * Lista conversas com filtros e paginação para o painel admin.
   */
  async listConversations(query: ListConversationsQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.assignedUserId) {
      where.assignedUserId = query.assignedUserId;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { contact: { profileName: { contains: term, mode: 'insensitive' } } },
        { contact: { waId: { contains: term } } },
        {
          messages: {
            some: { content: { contains: term, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.whatsappConversation.count({ where }),
      this.prisma.whatsappConversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          contact: {
            select: {
              id: true,
              waId: true,
              profileName: true,
              client: {
                select: { id: true, tradeName: true, corporateName: true },
              },
              contactRequest: { select: { id: true, name: true, email: true } },
            },
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { sentAt: 'desc' },
            select: {
              id: true,
              content: true,
              direction: true,
              type: true,
              sentAt: true,
              status: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
    ]);

    return {
      items: items.map((c) => ({
        ...c,
        lastMessage: c.messages[0] || null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtém detalhes de uma conversa e seu histórico completo de mensagens.
   */
  async getConversation(id: string) {
    const conversation = await this.prisma.whatsappConversation.findUnique({
      where: { id },
      include: {
        contact: {
          include: {
            client: true,
            contactRequest: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        messages: {
          orderBy: { sentAt: 'asc' },
          include: {
            sentByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada.');
    }

    return conversation;
  }

  /**
   * Envia uma mensagem manual digitada pelo atendente humano.
   */
  async sendAgentMessage(
    conversationId: string,
    userId: string,
    dto: SendAgentMessageDto,
  ) {
    const conversation = await this.prisma.whatsappConversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada.');
    }

    const channel = await this.prisma.whatsappChannel.findFirst({
      where: { isActive: true },
    });

    if (!channel?.accessToken || !channel?.phoneNumberId) {
      throw new BadRequestException(
        'Canal do WhatsApp não configurado ou inativo. Configure em Administração > WhatsApp.',
      );
    }

    // 1. Enviar via Meta Cloud API
    const metaResult = await this.metaApi.sendTextMessage(
      channel.phoneNumberId,
      channel.accessToken,
      conversation.contact.waId,
      dto.content,
    );

    // 2. Gravar no banco de dados
    const message = await this.prisma.whatsappMessage.create({
      data: {
        wamid: metaResult?.messageId || null,
        direction: WhatsappMessageDirection.OUTBOUND,
        type: WhatsappMessageType.TEXT,
        content: dto.content,
        status: WhatsappMessageStatus.SENT,
        conversationId,
        sentByUserId: userId,
        replyToMessageId: dto.replyToMessageId || null,
        sentAt: new Date(),
      },
      include: {
        sentByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 3. Atualizar data e assumir a conversa para o usuário se ainda estiver com o bot
    const updatedConversation = await this.prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastSeq: { increment: 1 },
        status: 'OPEN', // Sai automaticamente do bot quando o humano responde
        assignedUserId: conversation.assignedUserId || userId,
      },
    });

    // 4. Emitir eventos WebSocket
    this.gateway.emitMessageCreated({ message, conversationId });
    this.gateway.emitConversationUpdated(updatedConversation);

    return message;
  }

  /**
   * Atualiza o status da conversa (ex: Devolver para IA, Assumir, Resolver).
   */
  async updateStatus(conversationId: string, dto: UpdateConversationStatusDto) {
    const conversation = await this.prisma.whatsappConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada.');
    }

    const updated = await this.prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: {
        status: dto.status,
        assignedUserId:
          dto.assignedUserId !== undefined
            ? dto.assignedUserId
            : conversation.assignedUserId,
        resolutionReason: dto.resolutionReason || null,
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
        contact: true,
      },
    });

    this.gateway.emitConversationUpdated(updated);
    return updated;
  }

  /**
   * Adiciona uma nota interna à conversa.
   */
  async addNote(
    conversationId: string,
    authorId: string,
    dto: CreateConversationNoteDto,
  ) {
    const note = await this.prisma.whatsappConversationNote.create({
      data: {
        conversationId,
        authorId,
        content: dto.content,
        isAiGenerated: false,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return note;
  }

  /**
   * Consulta as credenciais e status do canal oficial do WhatsApp.
   */
  async getChannelConfig() {
    const channel = await this.prisma.whatsappChannel.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return (
      channel || {
        phoneNumberId: '',
        wabaId: '',
        phoneNumber: '',
        accessToken: '',
        verifyToken: 'picplus_secret_verify_token',
        isActive: false,
      }
    );
  }

  /**
   * Salva as credenciais do WhatsApp Meta Cloud API.
   */
  async updateChannelConfig(dto: UpdateChannelConfigDto) {
    const isActive = dto.isActive !== undefined ? dto.isActive : true;
    const existing = await this.prisma.whatsappChannel.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return this.prisma.whatsappChannel.update({
        where: { id: existing.id },
        data: {
          ...dto,
          isActive,
        },
      });
    }

    return this.prisma.whatsappChannel.create({
      data: {
        ...dto,
        isActive,
      },
    });
  }

  /**
   * Retorna contagens de conversas por status (para os badges do Inbox).
   */
  async getCounts() {
    const [bot, open, resolved] = await Promise.all([
      this.prisma.whatsappConversation.count({
        where: { status: 'BOT_HANDLING' },
      }),
      this.prisma.whatsappConversation.count({ where: { status: 'OPEN' } }),
      this.prisma.whatsappConversation.count({ where: { status: 'RESOLVED' } }),
    ]);

    return {
      bot,
      open,
      resolved,
      all: bot + open + resolved,
    };
  }
}
