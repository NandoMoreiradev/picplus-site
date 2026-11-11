import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ChargeBillingType,
  ChargeStatus,
  ClientStatus,
  Prisma,
} from '@prisma/client';
import { AsaasService } from '../asaas/asaas.service';
import { config } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConvertContactToClientDto,
  CreateClientChargeDto,
  CreateClientContactDto,
  CreateClientDto,
  CreateClientNoteDto,
  EmitChargeInvoiceDto,
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
  invoice?: {
    id?: string;
    status?: string;
    payment?: string;
    number?: string;
    pdfUrl?: string;
    xmlUrl?: string;
  };
}

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
  ) {}

  testAsaasConnection() {
    return this.asaas.testConnection();
  }

  async getAsaasMunicipalServices(description?: string) {
    const services = await this.asaas.listMunicipalServices(description);
    return {
      services,
      defaultMunicipalService: {
        id: config.asaas.defaultMunicipalService.id ?? null,
        code: config.asaas.defaultMunicipalService.code ?? null,
        name: config.asaas.defaultMunicipalService.name ?? null,
      },
    };
  }

  /** Importa dados existentes no Asaas sem criar novos recursos lá. */
  async importFromAsaas() {
    if (!this.asaas.isConfigured) {
      throw new BadRequestException(
        'A integração com o Asaas não está configurada no servidor (variável ASAAS_API_KEY ausente). Configure a chave nas variáveis de ambiente da hospedagem (Railway).',
      );
    }

    try {
      const [customers, payments] = await Promise.all([
        this.asaas.listCustomers(),
        this.asaas.listPayments(),
      ]);

      const clients = await this.prisma.client.findMany({
        where: { deletedAt: null },
        include: { contacts: true },
      });
      const byAsaasId = new Map(
        clients
          .filter((c) => c.asaasCustomerId)
          .map((c) => [c.asaasCustomerId!, c]),
      );
      const byDocument = new Map(
        clients.map((c) => [c.cnpjCpf.replace(/\D/g, ''), c]),
      );
      const customerMap = new Map<string, string>();
      let clientsCreated = 0;
      let clientsLinked = 0;
      let clientsSkipped = 0;

      for (const customer of customers) {
        const document = (customer.cpfCnpj ?? '').replace(/\D/g, '');
        let client =
          byAsaasId.get(customer.id) ??
          (document ? byDocument.get(document) : undefined);
        if (!client && !document) {
          clientsSkipped++;
          continue;
        }
        if (!client) {
          client = await this.prisma.client.create({
            data: {
              corporateName: customer.name,
              tradeName: customer.name,
              cnpjCpf: document,
              asaasCustomerId: customer.id,
              contacts: customer.email
                ? {
                    create: {
                      name: customer.name,
                      email: customer.email,
                      phone: customer.phone ?? customer.mobilePhone,
                      isPrimary: true,
                      isFinancial: true,
                    },
                  }
                : undefined,
            },
            include: { contacts: true },
          });
          clientsCreated++;
          byDocument.set(document, client);
        } else if (!client.asaasCustomerId) {
          client = await this.prisma.client.update({
            where: { id: client.id },
            data: { asaasCustomerId: customer.id },
            include: { contacts: true },
          });
          clientsLinked++;
        }
        customerMap.set(customer.id, client.id);
      }

      // Pre-carrega todas as cobranças existentes em uma única consulta rápida
      const paymentIds = payments.map((p) => p.id);
      const existingCharges = await this.prisma.clientCharge.findMany({
        where: { asaasPaymentId: { in: paymentIds } },
        select: { asaasPaymentId: true },
      });
      const existingPaymentIds = new Set(
        existingCharges.map((c) => c.asaasPaymentId),
      );

      let chargesCreated = 0;
      let chargesSkipped = 0;
      for (const payment of payments) {
        if (existingPaymentIds.has(payment.id)) continue;
        const clientId =
          customerMap.get(payment.customer) ??
          (payment.externalReference?.startsWith('client_')
            ? payment.externalReference.slice(7)
            : undefined);
        if (!clientId) {
          chargesSkipped++;
          continue;
        }

        const rawDue = payment.dueDate
          ? new Date(`${payment.dueDate}T12:00:00.000Z`)
          : new Date();
        const dueDate = isNaN(rawDue.getTime()) ? new Date() : rawDue;
        const rawPaid = payment.paymentDate
          ? new Date(payment.paymentDate)
          : null;
        const paidAt = rawPaid && !isNaN(rawPaid.getTime()) ? rawPaid : null;

        await this.prisma.clientCharge.create({
          data: {
            clientId,
            description: payment.description || `Cobrança Asaas ${payment.id}`,
            valueCents: Math.round(Number(payment.value) * 100),
            dueDate,
            billingType: this.mapBillingType(payment.billingType),
            status: this.mapChargeStatus(payment.status),
            asaasPaymentId: payment.id,
            invoiceUrl: payment.invoiceUrl,
            bankSlipUrl: payment.bankSlipUrl,
            paidAt,
          },
        });
        chargesCreated++;
      }

      return {
        customersRead: customers.length,
        paymentsRead: payments.length,
        clientsCreated,
        clientsLinked,
        clientsSkipped,
        chargesCreated,
        chargesSkipped,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Erro ao importar dados do Asaas: ${err}`);
      throw new BadRequestException(
        `Falha ao importar do Asaas: ${(err as Error).message || 'erro interno'}`,
      );
    }
  }

  private mapBillingType(value?: string | null): ChargeBillingType {
    return ['BOLETO', 'PIX', 'CREDIT_CARD'].includes(value ?? '')
      ? (value as ChargeBillingType)
      : ChargeBillingType.UNDEFINED;
  }

  private mapChargeStatus(value?: string | null): ChargeStatus {
    if (value === 'RECEIVED' || value === 'RECEIVED_IN_CASH')
      return ChargeStatus.RECEIVED;
    if (value === 'CONFIRMED') return ChargeStatus.CONFIRMED;
    if (value === 'OVERDUE') return ChargeStatus.OVERDUE;
    if (value === 'REFUNDED') return ChargeStatus.REFUNDED;
    if (value === 'DELETED') return ChargeStatus.CANCELED;
    return ChargeStatus.PENDING;
  }

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
   * Consulta pública de dados de CNPJ na Receita Federal (via BrasilAPI).
   */
  async lookupCnpj(rawCnpj: string) {
    const cleanCnpj = rawCnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new BadRequestException('CNPJ deve conter 14 dígitos.');
    }

    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PicPlusAgency/1.0)',
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new NotFoundException('CNPJ não encontrado na base da Receita.');
      }

      const data = (await response.json()) as {
        razao_social?: string;
        nome_fantasia?: string;
        cnae_fiscal_descricao?: string;
        cep?: string;
        logradouro?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        municipio?: string;
        uf?: string;
        ddd_telefone_1?: string;
        email?: string;
      };

      return {
        cnpj: cleanCnpj,
        corporateName: data.razao_social || '',
        tradeName: data.nome_fantasia || data.razao_social || '',
        segment: data.cnae_fiscal_descricao || null,
        postalCode: data.cep || null,
        address: data.logradouro || null,
        addressNumber: data.numero || null,
        complement: data.complemento || null,
        neighborhood: data.bairro || null,
        city: data.municipio || null,
        state: data.uf || null,
        phone: data.ddd_telefone_1 || null,
        email: data.email || null,
      };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error(`Erro na consulta de CNPJ ${cleanCnpj}: ${err}`);
      throw new BadRequestException(
        'Não foi possível consultar os dados do CNPJ no momento.',
      );
    }
  }

  /**
   * Consulta pública de endereço por CEP (BrasilAPI com fallback para ViaCEP).
   */
  async lookupCep(rawCep: string) {
    const cleanCep = rawCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      throw new BadRequestException('CEP deve conter 8 dígitos.');
    }

    // 1. Tenta BrasilAPI
    try {
      const res = await fetch(
        `https://brasilapi.com.br/api/cep/v2/${cleanCep}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PicPlusAgency/1.0)',
            Accept: 'application/json',
          },
        },
      );
      if (res.ok) {
        const d = (await res.json()) as {
          cep?: string;
          street?: string;
          neighborhood?: string;
          city?: string;
          state?: string;
        };
        return {
          postalCode: d.cep || cleanCep,
          address: d.street || '',
          neighborhood: d.neighborhood || '',
          city: d.city || '',
          state: d.state || '',
        };
      }
    } catch {
      // Ignora erro e parte para o fallback
    }

    // 2. Fallback ViaCEP
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (res.ok) {
        const d = (await res.json()) as {
          erro?: boolean;
          cep?: string;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
          complemento?: string;
        };
        if (!d.erro) {
          return {
            postalCode: (d.cep || cleanCep).replace(/\D/g, ''),
            address: d.logradouro || '',
            neighborhood: d.bairro || '',
            city: d.localidade || '',
            state: d.uf || '',
            complement: d.complemento || undefined,
          };
        }
      }
    } catch {
      // Falhou fallback
    }

    throw new NotFoundException('CEP não encontrado.');
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
   * Emite uma cobrança via Asaas v3 para o cliente (Única, Recorrente ou Parcelada)
   * e opcionalmente emite a Nota Fiscal de Serviço (NFS-e) de forma antecipada/imediata.
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
    let asaasPaymentId: string | null = null;
    let asaasSubscriptionId: string | null = null;
    let invoiceUrl: string | null = null;
    let bankSlipUrl: string | null = null;
    let installmentCount: number | null = null;
    let installmentNumber: number | null = null;
    let finalValueCents = dto.valueCents;

    if (dto.chargeKind === 'RECURRENT') {
      const sub = await this.asaas.createSubscription({
        customerId,
        billingType: dto.billingType || 'UNDEFINED',
        value: valueInReais,
        nextDueDate: dto.dueDate,
        cycle: dto.cycle || 'MONTHLY',
        description: dto.description,
        externalReference: `client_${clientId}`,
      });
      asaasSubscriptionId = sub.id;

      // Busca a primeira cobrança gerada para a assinatura recém-criada
      const payments = await this.asaas.getSubscriptionPayments(sub.id);
      const firstPayment = payments?.[0];
      if (firstPayment) {
        asaasPaymentId = firstPayment.id;
        invoiceUrl = firstPayment.invoiceUrl || null;
        bankSlipUrl = firstPayment.bankSlipUrl || null;
      } else {
        asaasPaymentId = sub.id.startsWith('sim_')
          ? `sim_pay_${Date.now()}`
          : sub.id;
        invoiceUrl = `https://picplus.com.br/fatura/${sub.id}`;
      }
    } else if (dto.chargeKind === 'INSTALLMENT') {
      const count = dto.installmentCount || 2;
      const installmentValue = Number((valueInReais / count).toFixed(2));
      const asaasPayment = await this.asaas.createPayment({
        customerId,
        billingType: dto.billingType || 'UNDEFINED',
        value: installmentValue,
        installmentCount: count,
        installmentValue,
        totalValue: valueInReais,
        dueDate: dto.dueDate,
        description: `${dto.description} (Parcela 1/${count})`,
        externalReference: `client_${clientId}`,
      });
      asaasPaymentId = asaasPayment.id;
      invoiceUrl = asaasPayment.invoiceUrl;
      bankSlipUrl = asaasPayment.bankSlipUrl ?? null;
      installmentCount = count;
      installmentNumber = 1;
      finalValueCents = Math.round(dto.valueCents / count);
    } else {
      // Cobrança Única Padrão
      const asaasPayment = await this.asaas.createPayment({
        customerId,
        billingType: dto.billingType || 'UNDEFINED',
        value: valueInReais,
        dueDate: dto.dueDate,
        description: dto.description,
        externalReference: `client_${clientId}`,
      });
      asaasPaymentId = asaasPayment.id;
      invoiceUrl = asaasPayment.invoiceUrl;
      bankSlipUrl = asaasPayment.bankSlipUrl ?? null;
    }

    let pixQrCodeUrl: string | null = null;
    let pixPayload: string | null = null;

    if (dto.billingType === 'PIX' && asaasPaymentId) {
      try {
        const pixData = await this.asaas.getPixQrCode(asaasPaymentId);
        pixQrCodeUrl = `data:image/png;base64,${pixData.encodedImage}`;
        pixPayload = pixData.payload;
      } catch (err) {
        this.logger.warn(`Não foi possível gerar QR Code PIX imediato: ${err}`);
      }
    }

    // Emissão antecipada de Nota Fiscal de Serviço (NFS-e) antes do pagamento
    let nfeId: string | null = null;
    let nfeStatus: string | null = null;
    let nfeNumber: string | null = null;
    let nfePdfUrl: string | null = null;
    let nfeXmlUrl: string | null = null;

    if (dto.emitInvoice && asaasPaymentId) {
      try {
        const invoiceEffectiveDate =
          dto.invoiceEffectiveDate || new Date().toISOString().split('T')[0];
        const inv = await this.asaas.createInvoice({
          payment: asaasPaymentId,
          customer: customerId,
          serviceDescription: (
            dto.invoiceServiceDescription ||
            dto.description ||
            ''
          ).trim(),
          value: Number((finalValueCents / 100).toFixed(2)),
          effectiveDate: invoiceEffectiveDate,
          municipalServiceId: dto.municipalServiceId,
          municipalServiceCode: dto.municipalServiceCode,
          municipalServiceName: dto.municipalServiceName,
          taxes: dto.invoiceTaxes,
        });
        nfeId = inv.id;
        nfeStatus = inv.status;
        nfeNumber = inv.number || null;
        nfePdfUrl = inv.pdfUrl || null;
        nfeXmlUrl = inv.xmlUrl || null;
      } catch (nfeErr: any) {
        this.logger.warn(
          `Falha ao emitir NFS-e antecipada no Asaas: ${nfeErr?.message || nfeErr}`,
        );
        nfeStatus = 'ERROR';
      }
    }

    return this.prisma.clientCharge.create({
      data: {
        clientId,
        description: dto.description,
        valueCents: finalValueCents,
        dueDate: new Date(dto.dueDate),
        billingType: dto.billingType || 'UNDEFINED',
        status: ChargeStatus.PENDING,
        asaasPaymentId,
        asaasSubscriptionId,
        installmentCount,
        installmentNumber,
        invoiceUrl,
        bankSlipUrl,
        pixQrCodeUrl,
        pixPayload,
        nfeId,
        nfeStatus,
        nfeNumber,
        nfePdfUrl,
        nfeXmlUrl,
      },
    });
  }

  /**
   * Emite manualmente NFS-e para uma cobrança existente antes ou depois do pagamento.
   */
  async emitChargeInvoice(
    clientId: string,
    chargeId: string,
    dto: EmitChargeInvoiceDto,
  ) {
    const charge = await this.prisma.clientCharge.findFirst({
      where: { id: chargeId, clientId },
      include: { client: true },
    });
    if (!charge) throw new NotFoundException('Cobrança não encontrada.');
    if (!charge.asaasPaymentId) {
      throw new BadRequestException(
        'Esta cobrança não possui identificador Asaas válido.',
      );
    }
    if (
      charge.nfeId &&
      (charge.nfeStatus === 'AUTHORIZED' || charge.nfeStatus === 'SCHEDULED')
    ) {
      throw new BadRequestException(
        'Esta cobrança já possui uma Nota Fiscal emitida ou agendada.',
      );
    }

    const valueInReais = Number((charge.valueCents / 100).toFixed(2));
    const effectiveDate =
      dto.effectiveDate || new Date().toISOString().split('T')[0];
    const serviceDescription = (
      dto.serviceDescription ||
      charge.description ||
      ''
    ).trim();

    const inv = await this.asaas.createInvoice({
      payment: charge.asaasPaymentId,
      customer: charge.client.asaasCustomerId || undefined,
      serviceDescription,
      value: valueInReais,
      effectiveDate,
      municipalServiceId: dto.municipalServiceId,
      municipalServiceCode: dto.municipalServiceCode,
      municipalServiceName: dto.municipalServiceName,
      taxes: dto.taxes,
    });

    return this.prisma.clientCharge.update({
      where: { id: charge.id },
      data: {
        nfeId: inv.id,
        nfeStatus: inv.status,
        nfeNumber: inv.number || null,
        nfePdfUrl: inv.pdfUrl || null,
        nfeXmlUrl: inv.xmlUrl || null,
      },
    });
  }

  /**
   * Sincroniza o status da NFS-e junto ao Asaas (busca PDF, XML e status de autorização).
   */
  async syncChargeInvoice(clientId: string, chargeId: string) {
    const charge = await this.prisma.clientCharge.findFirst({
      where: { id: chargeId, clientId },
    });
    if (!charge) throw new NotFoundException('Cobrança não encontrada.');
    if (!charge.nfeId) {
      throw new BadRequestException(
        'Esta cobrança não possui Nota Fiscal vinculada.',
      );
    }

    const inv = await this.asaas.getInvoice(charge.nfeId);
    return this.prisma.clientCharge.update({
      where: { id: charge.id },
      data: {
        nfeStatus: inv.status,
        nfeNumber: inv.number || charge.nfeNumber,
        nfePdfUrl: inv.pdfUrl || charge.nfePdfUrl,
        nfeXmlUrl: inv.xmlUrl || charge.nfeXmlUrl,
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
    this.logger.log(`[Webhook Asaas v3] Evento recebido: ${event}`);

    // Se o webhook for de evento de NFS-e:
    if (
      payload?.invoice?.id ||
      (payload?.event && payload.event.startsWith('INVOICE_'))
    ) {
      const invoiceData = payload.invoice;
      const targetInvoiceId = invoiceData?.id;
      const targetPaymentId = invoiceData?.payment;

      if (targetInvoiceId || targetPaymentId) {
        const chargeWithNfe = await this.prisma.clientCharge.findFirst({
          where: {
            OR: [
              ...(targetInvoiceId ? [{ nfeId: targetInvoiceId }] : []),
              ...(targetPaymentId ? [{ asaasPaymentId: targetPaymentId }] : []),
            ],
          },
        });

        if (chargeWithNfe) {
          await this.prisma.clientCharge.update({
            where: { id: chargeWithNfe.id },
            data: {
              ...(invoiceData?.id ? { nfeId: invoiceData.id } : {}),
              ...(invoiceData?.status ? { nfeStatus: invoiceData.status } : {}),
              ...(invoiceData?.number ? { nfeNumber: invoiceData.number } : {}),
              ...(invoiceData?.pdfUrl ? { nfePdfUrl: invoiceData.pdfUrl } : {}),
              ...(invoiceData?.xmlUrl ? { nfeXmlUrl: invoiceData.xmlUrl } : {}),
            },
          });
          return { status: 'nfe_processed', invoiceId: targetInvoiceId };
        }
      }
    }

    const payment = payload?.payment;
    if (!payment?.id) return { status: 'ignored' };

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
