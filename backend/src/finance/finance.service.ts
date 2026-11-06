import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  FinancialAccountType,
  FinancialCategoryNature,
  FinancialEntryStatus,
  FinancialEntryType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAccountDto,
  CreateCategoryDto,
  CreateCostCenterDto,
  CreateFinancialEntryDto,
  CreateSupplierDto,
  ListFinancialEntriesQueryDto,
  SettleFinancialEntryDto,
  UpdateFinancialEntryDto,
} from './dto/finance.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class FinanceService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
    await this.syncClientCharges();
  }

  // ─────────────────────────────────────────────────────────────
  // Inicialização & Sincronização Padrão
  // ─────────────────────────────────────────────────────────────

  async seedDefaults() {
    const categoryCount = await this.prisma.financialCategory.count();
    if (categoryCount === 0) {
      const defaultCategories: Array<{
        code: string;
        name: string;
        nature: FinancialCategoryNature;
        color?: string;
      }> = [
        { code: '1.1', name: 'Receitas de Agência (Contratos & Gestão)', nature: FinancialCategoryNature.REVENUE, color: '#10B981' },
        { code: '1.2', name: 'Receitas da PicPlus Academy (Cursos)', nature: FinancialCategoryNature.REVENUE, color: '#059669' },
        { code: '1.3', name: 'Produção Audiovisual & Diárias', nature: FinancialCategoryNature.REVENUE, color: '#34D399' },
        { code: '1.4', name: 'Outras Receitas Operacionais', nature: FinancialCategoryNature.REVENUE, color: '#6EE7B7' },
        
        { code: '2.1', name: 'Impostos Diretos (DAS / Simples / ISS)', nature: FinancialCategoryNature.DEDUCTION, color: '#F59E0B' },
        { code: '2.2', name: 'Taxas de Gateway & Cobrança (Asaas)', nature: FinancialCategoryNature.DEDUCTION, color: '#D97706' },
        
        { code: '3.1', name: 'Repasse / Cachê de Influenciadores', nature: FinancialCategoryNature.DIRECT_COST, color: '#EF4444' },
        { code: '3.2', name: 'Videomakers & Editores Freelancers', nature: FinancialCategoryNature.DIRECT_COST, color: '#DC2626' },
        { code: '3.3', name: 'Tráfego Pago Direto (Mídia)', nature: FinancialCategoryNature.DIRECT_COST, color: '#B91C1C' },
        
        { code: '4.1', name: 'Folha de Pagamento & Pró-labore', nature: FinancialCategoryNature.OPERATING_EXPENSE, color: '#6366F1' },
        { code: '4.2', name: 'Softwares, Cloud & TI (Adobe, OpenAI, Railway)', nature: FinancialCategoryNature.OPERATING_EXPENSE, color: '#8B5CF6' },
        { code: '4.3', name: 'Aluguel, Estúdio & Ocupação', nature: FinancialCategoryNature.OPERATING_EXPENSE, color: '#A855F7' },
        { code: '4.4', name: 'Assessoria Contábil & Jurídica', nature: FinancialCategoryNature.OPERATING_EXPENSE, color: '#EC4899' },
        { code: '4.5', name: 'Marketing & Vendas Internas', nature: FinancialCategoryNature.OPERATING_EXPENSE, color: '#F43F5E' },
        
        { code: '5.1', name: 'Rendimentos de Aplicações', nature: FinancialCategoryNature.FINANCIAL_RESULT, color: '#3B82F6' },
        { code: '5.2', name: 'Juros, Multas e Tarifas Bancárias', nature: FinancialCategoryNature.FINANCIAL_RESULT, color: '#64748B' },
      ];

      for (const cat of defaultCategories) {
        await this.prisma.financialCategory.create({ data: cat });
      }
    }

    const costCenterCount = await this.prisma.financialCostCenter.count();
    if (costCenterCount === 0) {
      await this.prisma.financialCostCenter.createMany({
        data: [
          { code: 'AGENCIA', name: 'Agência & Influenciadores', description: 'Gestão de marcas e campanhas' },
          { code: 'ACADEMY', name: 'PicPlus Academy', description: 'Cursos, matrículas e comunidade' },
          { code: 'PRODUTORA', name: 'Audiovisual & Estúdio', description: 'Gravação e pós-produção' },
          { code: 'GERAL', name: 'Geral & Administrativo', description: 'Custos corporativos e sócios' },
        ],
      });
    }

    const accountCount = await this.prisma.financialAccount.count();
    if (accountCount === 0) {
      await this.prisma.financialAccount.createMany({
        data: [
          { name: 'Conta Asaas (Gateway)', bankName: 'Asaas IP S.A.', accountType: FinancialAccountType.PAYMENT_GATEWAY, isDefault: true },
          { name: 'Banco Inter (Operacional)', bankName: 'Banco Inter', accountType: FinancialAccountType.CHECKING, isDefault: false },
          { name: 'Caixa Interno (Espécie)', bankName: 'Dinheiro', accountType: FinancialAccountType.CASH, isDefault: false },
        ],
      });
    }
  }

  /**
   * Sincroniza cobranças de clientes (ClientCharge) existentes para o módulo financeiro
   */
  async syncClientCharges() {
    const unlinkedCharges = await this.prisma.clientCharge.findMany({
      where: { financialEntry: null },
      include: { client: true },
    });

    if (unlinkedCharges.length === 0) return;

    const defaultCategory = await this.prisma.financialCategory.findFirst({
      where: { code: '1.1' },
    });
    const defaultCostCenter = await this.prisma.financialCostCenter.findFirst({
      where: { code: 'AGENCIA' },
    });
    const defaultAccount = await this.prisma.financialAccount.findFirst({
      where: { isDefault: true },
    });

    if (!defaultCategory) return;

    for (const charge of unlinkedCharges) {
      let status: FinancialEntryStatus = FinancialEntryStatus.PENDING;
      if (charge.status === 'RECEIVED' || charge.status === 'CONFIRMED') {
        status = FinancialEntryStatus.PAID;
      } else if (charge.status === 'OVERDUE') {
        status = FinancialEntryStatus.OVERDUE;
      } else if (charge.status === 'CANCELED' || charge.status === 'REFUNDED') {
        status = FinancialEntryStatus.CANCELED;
      }

      await this.prisma.financialEntry.create({
        data: {
          type: FinancialEntryType.INCOME,
          status,
          title: `Cobrança: ${charge.description} - ${charge.client.tradeName || charge.client.corporateName}`,
          nominalAmountCents: charge.valueCents,
          paidAmountCents: status === FinancialEntryStatus.PAID ? charge.valueCents : 0,
          dueDate: charge.dueDate,
          competenceDate: charge.createdAt,
          paidAt: charge.paidAt,
          categoryId: defaultCategory.id,
          costCenterId: defaultCostCenter?.id,
          accountId: defaultAccount?.id,
          clientId: charge.clientId,
          chargeId: charge.id,
          paymentMethod: charge.billingType,
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Lançamentos Financeiros (AP / AR)
  // ─────────────────────────────────────────────────────────────

  async listEntries(query: ListFinancialEntriesQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.FinancialEntryWhereInput = {};

    if (query.type) where.type = query.type;
    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.costCenterId) where.costCenterId = query.costCenterId;
    if (query.accountId) where.accountId = query.accountId;
    if (query.clientId) where.clientId = query.clientId;
    if (query.influencerId) where.influencerId = query.influencerId;
    if (query.supplierId) where.supplierId = query.supplierId;

    if (query.startDate || query.endDate) {
      where.dueDate = {};
      if (query.startDate) where.dueDate.gte = new Date(query.startDate);
      if (query.endDate) where.dueDate.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { client: { tradeName: { contains: query.search, mode: 'insensitive' } } },
        { client: { corporateName: { contains: query.search, mode: 'insensitive' } } },
        { influencer: { name: { contains: query.search, mode: 'insensitive' } } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.financialEntry.count({ where }),
      this.prisma.financialEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          category: true,
          costCenter: true,
          account: true,
          client: { select: { id: true, tradeName: true, corporateName: true } },
          influencer: { select: { id: true, name: true, profileImage: true } },
          supplier: { select: { id: true, name: true, document: true } },
          charge: { select: { id: true, invoiceUrl: true, bankSlipUrl: true, pixQrCodeUrl: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getEntryById(id: string) {
    const entry = await this.prisma.financialEntry.findUnique({
      where: { id },
      include: {
        category: true,
        costCenter: true,
        account: true,
        client: true,
        influencer: true,
        supplier: true,
        charge: true,
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    if (!entry) throw new NotFoundException('Lançamento financeiro não encontrado.');
    return entry;
  }

  async createEntry(dto: CreateFinancialEntryDto, userId?: string) {
    const installments = dto.installments && dto.installments > 1 ? dto.installments : 1;
    const baseDueDate = new Date(dto.dueDate);
    const baseCompetenceDate = dto.competenceDate ? new Date(dto.competenceDate) : baseDueDate;
    const recurrenceGroupId = installments > 1 ? randomUUID() : undefined;

    const createdEntries = [];

    for (let i = 1; i <= installments; i++) {
      const dueDate = new Date(baseDueDate);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      const competenceDate = new Date(baseCompetenceDate);
      competenceDate.setMonth(competenceDate.getMonth() + (i - 1));

      const title = installments > 1 ? `${dto.title} (${i}/${installments})` : dto.title;

      const entry = await this.prisma.financialEntry.create({
        data: {
          type: dto.type,
          title,
          description: dto.description,
          nominalAmountCents: dto.nominalAmountCents,
          dueDate,
          competenceDate,
          categoryId: dto.categoryId,
          costCenterId: dto.costCenterId,
          accountId: dto.accountId,
          clientId: dto.clientId,
          influencerId: dto.influencerId,
          supplierId: dto.supplierId,
          paymentMethod: dto.paymentMethod,
          attachmentUrl: dto.attachmentUrl,
          invoiceNumber: dto.invoiceNumber,
          notes: dto.notes,
          createdById: userId,
          installmentIndex: installments > 1 ? i : null,
          installmentTotal: installments > 1 ? installments : null,
          recurrenceGroupId,
        },
        include: {
          category: true,
          client: true,
          influencer: true,
          supplier: true,
        },
      });

      createdEntries.push(entry);
    }

    return installments === 1 ? createdEntries[0] : { count: createdEntries.length, entries: createdEntries };
  }

  async updateEntry(id: string, dto: UpdateFinancialEntryDto) {
    await this.getEntryById(id);

    return this.prisma.financialEntry.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        nominalAmountCents: dto.nominalAmountCents,
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        competenceDate: dto.competenceDate ? new Date(dto.competenceDate) : undefined,
        paidAt: dto.paidAt !== undefined ? (dto.paidAt ? new Date(dto.paidAt) : null) : undefined,
        categoryId: dto.categoryId,
        costCenterId: dto.costCenterId,
        accountId: dto.accountId,
        clientId: dto.clientId,
        influencerId: dto.influencerId,
        supplierId: dto.supplierId,
        paymentMethod: dto.paymentMethod,
        attachmentUrl: dto.attachmentUrl,
        invoiceNumber: dto.invoiceNumber,
        notes: dto.notes,
      },
      include: {
        category: true,
        costCenter: true,
        account: true,
        client: true,
        influencer: true,
        supplier: true,
      },
    });
  }

  async settleEntry(id: string, dto: SettleFinancialEntryDto, userId?: string) {
    const entry = await this.getEntryById(id);

    if (entry.status === FinancialEntryStatus.PAID) {
      throw new BadRequestException('Este título já está liquidado.');
    }

    const paidAt = new Date(dto.paidAt);
    const accountId = dto.accountId || entry.accountId;
    const isFullPayment = dto.paidAmountCents >= entry.nominalAmountCents;
    const newStatus = isFullPayment ? FinancialEntryStatus.PAID : FinancialEntryStatus.PARTIALLY_PAID;

    // Atualiza saldo bancário se uma conta for informada
    if (accountId) {
      const balanceDelta = entry.type === FinancialEntryType.INCOME ? dto.paidAmountCents : -dto.paidAmountCents;
      await this.prisma.financialAccount.update({
        where: { id: accountId },
        data: { currentBalanceCents: { increment: balanceDelta } },
      });
    }

    // Se tiver cobrança do Asaas vinculada e for receita, marca como RECEIVED
    if (entry.chargeId && entry.type === FinancialEntryType.INCOME) {
      await this.prisma.clientCharge.update({
        where: { id: entry.chargeId },
        data: { status: 'RECEIVED', paidAt },
      });
    }

    return this.prisma.financialEntry.update({
      where: { id },
      data: {
        status: newStatus,
        paidAmountCents: { increment: dto.paidAmountCents },
        interestCents: dto.interestCents ?? entry.interestCents,
        discountCents: dto.discountCents ?? entry.discountCents,
        paidAt,
        accountId,
        paymentMethod: dto.paymentMethod || entry.paymentMethod,
        approvedById: userId,
      },
      include: {
        category: true,
        account: true,
        client: true,
        influencer: true,
        supplier: true,
      },
    });
  }

  async deleteEntry(id: string) {
    const entry = await this.getEntryById(id);
    if (entry.status === FinancialEntryStatus.PAID && entry.chargeId) {
      throw new BadRequestException('Não é permitido excluir uma cobrança oficial do Asaas já liquidada.');
    }
    return this.prisma.financialEntry.delete({ where: { id } });
  }

  // ─────────────────────────────────────────────────────────────
  // Painel de Saúde Financeira & Estatísticas do Mês
  // ─────────────────────────────────────────────────────────────

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Contas bancárias
    const accounts = await this.prisma.financialAccount.findMany({
      orderBy: { isDefault: 'desc' },
    });
    const totalCashCents = accounts.reduce((acc, a) => acc + a.currentBalanceCents, 0);

    // Lançamentos do mês
    const monthEntries = await this.prisma.financialEntry.findMany({
      where: {
        dueDate: { gte: startOfMonth, lte: endOfMonth },
        status: { not: FinancialEntryStatus.CANCELED },
      },
    });

    let totalReceivableMonthCents = 0;
    let totalReceivedMonthCents = 0;
    let totalPayableMonthCents = 0;
    let totalPaidMonthCents = 0;

    for (const e of monthEntries) {
      if (e.type === FinancialEntryType.INCOME) {
        totalReceivableMonthCents += e.nominalAmountCents;
        if (e.status === FinancialEntryStatus.PAID) totalReceivedMonthCents += e.paidAmountCents;
      } else {
        totalPayableMonthCents += e.nominalAmountCents;
        if (e.status === FinancialEntryStatus.PAID) totalPaidMonthCents += e.paidAmountCents;
      }
    }

    // Inadimplência geral (títulos vencidos não pagos)
    const overdueEntries = await this.prisma.financialEntry.findMany({
      where: {
        status: FinancialEntryStatus.OVERDUE,
      },
    });

    const overdueReceivableCents = overdueEntries
      .filter((e) => e.type === FinancialEntryType.INCOME)
      .reduce((sum, e) => sum + e.nominalAmountCents, 0);

    const overduePayableCents = overdueEntries
      .filter((e) => e.type === FinancialEntryType.EXPENSE)
      .reduce((sum, e) => sum + e.nominalAmountCents, 0);

    // Burn rate estimado (média das despesas operacionais dos últimos 3 meses)
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const pastExpenses = await this.prisma.financialEntry.findMany({
      where: {
        type: FinancialEntryType.EXPENSE,
        competenceDate: { gte: threeMonthsAgo, lte: endOfMonth },
        status: { not: FinancialEntryStatus.CANCELED },
      },
    });

    const totalPastExpenses = pastExpenses.reduce((sum, e) => sum + e.nominalAmountCents, 0);
    const burnRateCents = Math.round(totalPastExpenses / 3) || totalPayableMonthCents || 1;

    // Runway em meses
    const runwayMonths = burnRateCents > 0 ? Number((totalCashCents / burnRateCents).toFixed(1)) : 0;

    // Cálculo do Health Score (0 - 100)
    let score = 50;
    if (runwayMonths >= 6) score += 25;
    else if (runwayMonths >= 3) score += 15;
    else if (runwayMonths < 1) score -= 20;

    const projectedMargin = totalReceivableMonthCents > 0
      ? ((totalReceivableMonthCents - totalPayableMonthCents) / totalReceivableMonthCents) * 100
      : 0;

    if (projectedMargin >= 25) score += 20;
    else if (projectedMargin >= 10) score += 10;
    else if (projectedMargin < 0) score -= 25;

    const defaultRate = totalReceivableMonthCents > 0 ? (overdueReceivableCents / totalReceivableMonthCents) * 100 : 0;
    if (defaultRate <= 5) score += 15;
    else if (defaultRate > 20) score -= 20;

    const healthScore = Math.max(5, Math.min(100, Math.round(score)));

    return {
      totalCashCents,
      totalReceivableMonthCents,
      totalReceivedMonthCents,
      totalPayableMonthCents,
      totalPaidMonthCents,
      projectedResultMonthCents: totalReceivableMonthCents - totalPayableMonthCents,
      realizedResultMonthCents: totalReceivedMonthCents - totalPaidMonthCents,
      overdueReceivableCents,
      overduePayableCents,
      runwayMonths,
      burnRateCents,
      healthScore,
      defaultRate: Number(defaultRate.toFixed(1)),
      accounts,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // DRE Gerencial (Regime de Competência)
  // ─────────────────────────────────────────────────────────────

  async getDre(year: number) {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const entries = await this.prisma.financialEntry.findMany({
      where: {
        competenceDate: { gte: startDate, lte: endDate },
        status: { not: FinancialEntryStatus.CANCELED },
      },
      include: { category: true },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      grossRevenueCents: 0,
      deductionsCents: 0,
      netRevenueCents: 0,
      directCostsCents: 0,
      grossProfitCents: 0,
      operatingExpensesCents: 0,
      ebitdaCents: 0,
      financialResultCents: 0,
      netProfitCents: 0,
      marginPercent: 0,
    }));

    for (const e of entries) {
      const monthIdx = new Date(e.competenceDate).getMonth();
      const amount = e.nominalAmountCents;
      const m = months[monthIdx];

      switch (e.category.nature) {
        case FinancialCategoryNature.REVENUE:
          m.grossRevenueCents += amount;
          break;
        case FinancialCategoryNature.DEDUCTION:
          m.deductionsCents += amount;
          break;
        case FinancialCategoryNature.DIRECT_COST:
          m.directCostsCents += amount;
          break;
        case FinancialCategoryNature.OPERATING_EXPENSE:
          m.operatingExpensesCents += amount;
          break;
        case FinancialCategoryNature.FINANCIAL_RESULT:
          if (e.type === FinancialEntryType.INCOME) {
            m.financialResultCents += amount;
          } else {
            m.financialResultCents -= amount;
          }
          break;
      }
    }

    // Calcula os subtotais e margens
    for (const m of months) {
      m.netRevenueCents = m.grossRevenueCents - m.deductionsCents;
      m.grossProfitCents = m.netRevenueCents - m.directCostsCents;
      m.ebitdaCents = m.grossProfitCents - m.operatingExpensesCents;
      m.netProfitCents = m.ebitdaCents + m.financialResultCents;
      m.marginPercent = m.netRevenueCents > 0 ? Number(((m.netProfitCents / m.netRevenueCents) * 100).toFixed(1)) : 0;
    }

    return {
      year: targetYear,
      months,
      totals: {
        grossRevenueCents: months.reduce((s, m) => s + m.grossRevenueCents, 0),
        deductionsCents: months.reduce((s, m) => s + m.deductionsCents, 0),
        netRevenueCents: months.reduce((s, m) => s + m.netRevenueCents, 0),
        directCostsCents: months.reduce((s, m) => s + m.directCostsCents, 0),
        grossProfitCents: months.reduce((s, m) => s + m.grossProfitCents, 0),
        operatingExpensesCents: months.reduce((s, m) => s + m.operatingExpensesCents, 0),
        ebitdaCents: months.reduce((s, m) => s + m.ebitdaCents, 0),
        financialResultCents: months.reduce((s, m) => s + m.financialResultCents, 0),
        netProfitCents: months.reduce((s, m) => s + m.netProfitCents, 0),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Fluxo de Caixa (Realizado vs. Previsto)
  // ─────────────────────────────────────────────────────────────

  async getCashFlow(startDateStr?: string, endDateStr?: string) {
    const now = new Date();
    const startDate = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateStr ? new Date(endDateStr) : new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const [realizedEntries, pendingEntries] = await Promise.all([
      // Realizado: usa paidAt
      this.prisma.financialEntry.findMany({
        where: {
          paidAt: { gte: startDate, lte: endDate },
          status: { in: [FinancialEntryStatus.PAID, FinancialEntryStatus.PARTIALLY_PAID] },
        },
      }),
      // Previsto / Em aberto: usa dueDate
      this.prisma.financialEntry.findMany({
        where: {
          dueDate: { gte: startDate, lte: endDate },
          status: { in: [FinancialEntryStatus.PENDING, FinancialEntryStatus.OVERDUE] },
        },
      }),
    ]);

    let totalRealizedInflow = 0;
    let totalRealizedOutflow = 0;
    for (const e of realizedEntries) {
      if (e.type === FinancialEntryType.INCOME) totalRealizedInflow += e.paidAmountCents;
      else totalRealizedOutflow += e.paidAmountCents;
    }

    let totalProjectedInflow = 0;
    let totalProjectedOutflow = 0;
    for (const e of pendingEntries) {
      if (e.type === FinancialEntryType.INCOME) totalProjectedInflow += e.nominalAmountCents;
      else totalProjectedOutflow += e.nominalAmountCents;
    }

    return {
      startDate,
      endDate,
      realized: {
        inflowCents: totalRealizedInflow,
        outflowCents: totalRealizedOutflow,
        netCents: totalRealizedInflow - totalRealizedOutflow,
      },
      projected: {
        inflowCents: totalProjectedInflow,
        outflowCents: totalProjectedOutflow,
        netCents: totalProjectedInflow - totalProjectedOutflow,
      },
      totalForecastCents: (totalRealizedInflow + totalProjectedInflow) - (totalRealizedOutflow + totalProjectedOutflow),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CRUD de Entidades Auxiliares (Categorias, Centros, Contas, Fornecedores)
  // ─────────────────────────────────────────────────────────────

  async listCategories() {
    return this.prisma.financialCategory.findMany({
      orderBy: [{ nature: 'asc' }, { code: 'asc' }],
      include: { children: true },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.financialCategory.create({ data: dto });
  }

  async listCostCenters() {
    return this.prisma.financialCostCenter.findMany({ orderBy: { name: 'asc' } });
  }

  async createCostCenter(dto: CreateCostCenterDto) {
    return this.prisma.financialCostCenter.create({ data: dto });
  }

  async listAccounts() {
    return this.prisma.financialAccount.findMany({ orderBy: { isDefault: 'desc' } });
  }

  async createAccount(dto: CreateAccountDto) {
    return this.prisma.financialAccount.create({ data: dto });
  }

  async listSuppliers() {
    return this.prisma.financialSupplier.findMany({ orderBy: { name: 'asc' } });
  }

  async createSupplier(dto: CreateSupplierDto) {
    return this.prisma.financialSupplier.create({ data: dto });
  }
}
