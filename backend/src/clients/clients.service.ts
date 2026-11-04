import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ChargeStatus, ClientStatus, Prisma } from '@prisma/client';
import { AsaasService } from '../asaas/asaas.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConvertContactToClientDto,
  CreateClientChargeDto,
  CreateClientContactDto,
  CreateClientDto,
  CreateClientNoteDto,
  ListClientsQueryDto,
  UpdateClientDto,
} from './dto/client.dto';

export interface AsaasWebhookPayload {
  event?: string;
  payment?: {
    id?: string;
    paymentDate?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
  };
}

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
  ) {}

  /**
   * Listagem paginada de clientes com busca e filtros.
   */
  async list(query: ListClientsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
      ...(query.status && query.status !== 'ALL'
        ? { status: query.status }
        : {}),
      ...(query.search
        ? {
            OR: [
              { tradeName: { contains: query.search, mode: 'insensitive' } },
              {
                corporateName: { contains: query.search, mode: 'insensitive' },
              },
              {
                cnpjCpf: {
                  contains: query.search.replace(/\D/g, '') || query.search,
                },
              },
              { segment: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          accountManager: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          _count: {
            select: {
              contacts: true,
              projects: true,
              charges: true,
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Estatísticas para o painel de clientes (MRR, total ativo, pendências financeiras).
   */
  async getStats() {
    const [activeCount, prospectCount, activeClients, pendingCharges] =
      await Promise.all([
        this.prisma.client.count({
          where: { status: ClientStatus.ACTIVE, deletedAt: null },
        }),
        this.prisma.client.count({
          where: { status: ClientStatus.PROSPECT, deletedAt: null },
        }),
        this.prisma.client.findMany({
          where: { status: ClientStatus.ACTIVE, deletedAt: null },
          select: { monthlyFeeCents: true },
        }),
        this.prisma.clientCharge.findMany({
          where: {
            status: { in: [ChargeStatus.PENDING, ChargeStatus.OVERDUE] },
          },
          select: { valueCents: true, status: true },
        }),
      ]);

    const totalMrrCents = activeClients.reduce(
      (acc, c) => acc + (c.monthlyFeeCents ?? 0),
      0,
    );

    const pendingTotalCents = pendingCharges.reduce(
      (acc, c) => acc + c.valueCents,
      0,
    );

    const overdueTotalCents = pendingCharges
      .filter((c) => c.status === ChargeStatus.OVERDUE)
      .reduce((acc, c) => acc + c.valueCents, 0);

    return {
      activeClients: activeCount,
      prospectClients: prospectCount,
      totalMrrCents,
      pendingTotalCents,
      overdueTotalCents,
    };
  }

  /**
   * Detalhes completos do cliente (Visão 360°).
   */
  async getById(id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        accountManager: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        projects: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { tasks: true },
            },
          },
        },
        charges: {
          orderBy: { dueDate: 'desc' },
          take: 50,
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    return client;
  }

  /**
   * Cadastra novo cliente e sincroniza com o Asaas v3.
   */
  async create(dto: CreateClientDto) {
    const cleanDoc = dto.cnpjCpf.replace(/\D/g, '');
    const existing = await this.prisma.client.findFirst({
      where: { cnpjCpf: cleanDoc, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException(
        'Já existe um cliente cadastrado com este CNPJ/CPF.',
      );
    }

    // Sincroniza cliente com o Asaas v3
    let asaasCustomerId: string | null = null;
    try {
      const asaasResult = await this.asaas.syncCustomer({
        name: dto.tradeName || dto.corporateName,
        cpfCnpj: cleanDoc,
        email:
          dto.primaryContactEmail ||
          'financeiro@' +
            (dto.website?.replace(/^https?:\/\//, '') || 'picplus.com.br'),
        phone: dto.primaryContactPhone,
        postalCode: dto.postalCode,
        address: dto.address,
        addressNumber: dto.addressNumber,
        complement: dto.complement,
        province: dto.neighborhood,
      });
      asaasCustomerId = asaasResult.id;
    } catch (err) {
      this.logger.warn(
        `Não foi possível sincronizar imediatamente com Asaas: ${err}`,
      );
    }

    const client = await this.prisma.client.create({
      data: {
        corporateName: dto.corporateName,
        tradeName: dto.tradeName,
        cnpjCpf: cleanDoc,
        stateRegistration: dto.stateRegistration,
        segment: dto.segment,
        website: dto.website,
        status: dto.status ?? ClientStatus.ACTIVE,
        postalCode: dto.postalCode,
        address: dto.address,
        addressNumber: dto.addressNumber,
        complement: dto.complement,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state,
        contractType: dto.contractType,
        monthlyFeeCents: dto.monthlyFeeCents ?? 0,
        dueDay: dto.dueDay ?? 10,
        contractStart: dto.contractStart ? new Date(dto.contractStart) : null,
        contractEnd: dto.contractEnd ? new Date(dto.contractEnd) : null,
        accountManagerId: dto.accountManagerId,
        asaasCustomerId,
        ...(dto.primaryContactName && dto.primaryContactEmail
          ? {
              contacts: {
                create: {
                  name: dto.primaryContactName,
                  email: dto.primaryContactEmail,
                  phone: dto.primaryContactPhone,
                  role: dto.primaryContactRole || 'Responsável',
                  isPrimary: true,
                  isFinancial: true,
                },
              },
            }
          : {}),
      },
      include: {
        contacts: true,
        accountManager: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return client;
  }

  /**
   * Atualiza dados do cliente e reflete alterações cadastrais no Asaas.
   */
  async update(id: string, dto: UpdateClientDto) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    const cleanDoc = dto.cnpjCpf
      ? dto.cnpjCpf.replace(/\D/g, '')
      : client.cnpjCpf;
    if (cleanDoc !== client.cnpjCpf) {
      const conflict = await this.prisma.client.findFirst({
        where: { cnpjCpf: cleanDoc, id: { not: id }, deletedAt: null },
      });
      if (conflict) {
        throw new BadRequestException(
          'Já existe outro cliente com este CNPJ/CPF.',
        );
      }
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        corporateName: dto.corporateName,
        tradeName: dto.tradeName,
        cnpjCpf: cleanDoc,
        stateRegistration: dto.stateRegistration,
        segment: dto.segment,
        website: dto.website,
        status: dto.status,
        postalCode: dto.postalCode,
        address: dto.address,
        addressNumber: dto.addressNumber,
        complement: dto.complement,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state,
        contractType: dto.contractType,
        monthlyFeeCents: dto.monthlyFeeCents,
        dueDay: dto.dueDay,
        contractStart: dto.contractStart
          ? new Date(dto.contractStart)
          : undefined,
        contractEnd: dto.contractEnd ? new Date(dto.contractEnd) : undefined,
        accountManagerId: dto.accountManagerId,
      },
    });

    // Se o cliente ainda não possuía asaasCustomerId, tenta criar agora
    if (!updated.asaasCustomerId) {
      try {
        const asaasResult = await this.asaas.syncCustomer({
          name: updated.tradeName || updated.corporateName,
          cpfCnpj: updated.cnpjCpf,
          email: 'financeiro@picplus.com.br',
          postalCode: updated.postalCode,
          address: updated.address,
          addressNumber: updated.addressNumber,
          province: updated.neighborhood,
        });
        await this.prisma.client.update({
          where: { id },
          data: { asaasCustomerId: asaasResult.id },
        });
      } catch (err) {
        this.logger.warn(
          `Falha ao sincronizar cliente ${id} com Asaas: ${err}`,
        );
      }
    }

    return updated;
  }

  /**
   * Remove cliente (soft-delete).
   */
  async delete(id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  /**
   * Adiciona um contato à empresa do cliente.
   */
  async addContact(clientId: string, dto: CreateClientContactDto) {
    await this.getById(clientId);

    if (dto.isPrimary) {
      // Desmarca os outros contatos como primários se este for o novo primário
      await this.prisma.clientContact.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.clientContact.create({
      data: {
        clientId,
        name: dto.name,
        role: dto.role,
        email: dto.email,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        isFinancial: dto.isFinancial ?? false,
        isPrimary: dto.isPrimary ?? false,
      },
    });
  }

  /**
   * Remove um contato.
   */
  async deleteContact(clientId: string, contactId: string) {
    const contact = await this.prisma.clientContact.findFirst({
      where: { id: contactId, clientId },
    });
    if (!contact) throw new NotFoundException('Contato não encontrado.');

    await this.prisma.clientContact.delete({ where: { id: contactId } });
    return { success: true };
  }

  /**
   * Adiciona anotação / ata de reunião no histórico do cliente.
   */
  async addNote(clientId: string, authorId: string, dto: CreateClientNoteDto) {
    await this.getById(clientId);

    return this.prisma.clientNote.create({
      data: {
        clientId,
        authorId,
        content: dto.content,
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Emite uma cobrança via Asaas v3 para o cliente.
   */
  async createCharge(clientId: string, dto: CreateClientChargeDto) {
    const client = await this.getById(clientId);

    let customerId = client.asaasCustomerId;
    if (!customerId) {
      // Sincroniza sob demanda
      const primaryContact =
        client.contacts.find((c) => c.isFinancial) || client.contacts[0];
      const asaasResult = await this.asaas.syncCustomer({
        name: client.tradeName || client.corporateName,
        cpfCnpj: client.cnpjCpf,
        email: primaryContact?.email || 'financeiro@picplus.com.br',
        phone: primaryContact?.phone || primaryContact?.whatsapp,
        postalCode: client.postalCode,
        address: client.address,
        addressNumber: client.addressNumber,
        province: client.neighborhood,
      });
      customerId = asaasResult.id;
      await this.prisma.client.update({
        where: { id: clientId },
        data: { asaasCustomerId: customerId },
      });
    }

    const valueInReais = Number((dto.valueCents / 100).toFixed(2));
    const asaasPayment = await this.asaas.createPayment({
      customerId,
      billingType: dto.billingType || 'UNDEFINED',
      value: valueInReais,
      dueDate: dto.dueDate,
      description: dto.description,
      externalReference: `client_${clientId}`,
    });

    let pixQrCodeUrl: string | null = null;
    let pixPayload: string | null = null;

    if (dto.billingType === 'PIX') {
      try {
        const pixData = await this.asaas.getPixQrCode(asaasPayment.id);
        pixQrCodeUrl = `data:image/png;base64,${pixData.encodedImage}`;
        pixPayload = pixData.payload;
      } catch (err) {
        this.logger.warn(`Não foi possível gerar QR Code PIX imediato: ${err}`);
      }
    }

    return this.prisma.clientCharge.create({
      data: {
        clientId,
        description: dto.description,
        valueCents: dto.valueCents,
        dueDate: new Date(dto.dueDate),
        billingType: dto.billingType || 'UNDEFINED',
        status: ChargeStatus.PENDING,
        asaasPaymentId: asaasPayment.id,
        invoiceUrl: asaasPayment.invoiceUrl,
        bankSlipUrl: asaasPayment.bankSlipUrl,
        pixQrCodeUrl,
        pixPayload,
      },
    });
  }

  /**
   * Processa Webhooks recebidos do Asaas v3.
   */
  async processAsaasWebhook(
    payload: AsaasWebhookPayload,
    webhookToken?: string,
  ) {
    if (!this.asaas.validateWebhookToken(webhookToken)) {
      this.logger.error('Tentativa de webhook com token inválido rejeitada.');
      throw new BadRequestException('Token de webhook inválido.');
    }

    const event = payload?.event;
    const payment = payload?.payment;
    if (!payment?.id) return { status: 'ignored' };

    this.logger.log(
      `[Webhook Asaas v3] Evento recebido: ${event} para cobrança ${payment.id}`,
    );

    const charge = await this.prisma.clientCharge.findUnique({
      where: { asaasPaymentId: payment.id },
    });

    if (!charge) {
      this.logger.warn(
        `Cobrança com asaasPaymentId ${payment.id} não encontrada no banco.`,
      );
      return { status: 'not_found' };
    }

    let newStatus: ChargeStatus = charge.status;
    let paidAt: Date | null = charge.paidAt;

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        newStatus = ChargeStatus.RECEIVED;
        paidAt = payment.paymentDate
          ? new Date(payment.paymentDate)
          : new Date();
        break;
      case 'PAYMENT_OVERDUE':
        newStatus = ChargeStatus.OVERDUE;
        break;
      case 'PAYMENT_REFUNDED':
        newStatus = ChargeStatus.REFUNDED;
        break;
      case 'PAYMENT_DELETED':
        newStatus = ChargeStatus.CANCELED;
        break;
    }

    await this.prisma.clientCharge.update({
      where: { id: charge.id },
      data: {
        status: newStatus,
        paidAt,
        invoiceUrl: payment.invoiceUrl || charge.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl || charge.bankSlipUrl,
      },
    });

    return { status: 'processed', newStatus };
  }

  /**
   * Converte uma solicitação de contato / orçamento em um Cliente ativo.
   */
  async convertFromContactRequest(
    contactRequestId: string,
    dto: ConvertContactToClientDto,
  ) {
    const contact = await this.prisma.contactRequest.findUnique({
      where: { id: contactRequestId },
    });
    if (!contact) throw new NotFoundException('Contato não encontrado.');

    const client = await this.create({
      tradeName: dto.tradeName || contact.company || contact.name,
      corporateName: dto.corporateName || contact.company || contact.name,
      cnpjCpf: dto.cnpjCpf,
      status: ClientStatus.ACTIVE,
      contractType: dto.contractType,
      monthlyFeeCents: dto.monthlyFeeCents ?? 0,
      segment: contact.serviceInterest,
      primaryContactName: contact.name,
      primaryContactEmail: contact.email,
      primaryContactPhone: contact.phone || undefined,
      primaryContactRole: 'Contato Comercial',
    });

    // Registra a mensagem original do lead como primeira nota do cliente
    await this.prisma.clientNote.create({
      data: {
        clientId: client.id,
        content: `Lead convertido via formulário do site (${contact.type === 'BUDGET' ? 'Orçamento' : 'Contato'}):\n\n"${contact.message}"\n\nInteresse: ${contact.serviceInterest || 'Não informado'} | Faixa de orçamento: ${contact.budgetRange || 'Não informada'}`,
      },
    });

    // Atualiza status do contato no módulo de contatos para DONE
    await this.prisma.contactRequest.update({
      where: { id: contactRequestId },
      data: { status: 'DONE' },
    });

    return client;
  }
}
