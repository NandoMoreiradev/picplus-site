import { api, withQuery } from './api';

export type FinancialEntryType = 'INCOME' | 'EXPENSE';
export type FinancialEntryStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELED';
export type FinancialCategoryNature = 'REVENUE' | 'DEDUCTION' | 'DIRECT_COST' | 'OPERATING_EXPENSE' | 'FINANCIAL_RESULT';
export type FinancialAccountType = 'CHECKING' | 'SAVINGS' | 'PAYMENT_GATEWAY' | 'CASH';

export interface FinancialCategory {
  id: string;
  name: string;
  code: string;
  nature: FinancialCategoryNature;
  color?: string | null;
  parentId?: string | null;
}

export interface FinancialCostCenter {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

export interface FinancialAccount {
  id: string;
  name: string;
  bankName?: string | null;
  accountType: FinancialAccountType;
  initialBalanceCents: number;
  currentBalanceCents: number;
  isDefault: boolean;
}

export interface FinancialSupplier {
  id: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  pixKey?: string | null;
  category?: string | null;
  notes?: string | null;
}

export interface FinancialEntry {
  id: string;
  type: FinancialEntryType;
  status: FinancialEntryStatus;
  title: string;
  description?: string | null;
  nominalAmountCents: number;
  interestCents: number;
  discountCents: number;
  paidAmountCents: number;
  dueDate: string;
  competenceDate: string;
  paidAt?: string | null;
  categoryId: string;
  category?: FinancialCategory;
  costCenterId?: string | null;
  costCenter?: FinancialCostCenter | null;
  accountId?: string | null;
  account?: FinancialAccount | null;
  clientId?: string | null;
  client?: { id: string; tradeName: string; corporateName: string } | null;
  influencerId?: string | null;
  influencer?: { id: string; name: string; profileImage?: string | null } | null;
  supplierId?: string | null;
  supplier?: { id: string; name: string; document?: string | null } | null;
  chargeId?: string | null;
  charge?: { id: string; invoiceUrl?: string | null; bankSlipUrl?: string | null; pixQrCodeUrl?: string | null } | null;
  paymentMethod?: string | null;
  attachmentUrl?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  installmentIndex?: number | null;
  installmentTotal?: number | null;
  createdAt: string;
}

export interface FinancialStats {
  totalCashCents: number;
  totalReceivableMonthCents: number;
  totalReceivedMonthCents: number;
  totalPayableMonthCents: number;
  totalPaidMonthCents: number;
  projectedResultMonthCents: number;
  realizedResultMonthCents: number;
  overdueReceivableCents: number;
  overduePayableCents: number;
  runwayMonths: number;
  burnRateCents: number;
  healthScore: number;
  defaultRate: number;
  accounts: FinancialAccount[];
}

export interface DreMonth {
  month: number;
  grossRevenueCents: number;
  deductionsCents: number;
  netRevenueCents: number;
  directCostsCents: number;
  grossProfitCents: number;
  operatingExpensesCents: number;
  ebitdaCents: number;
  financialResultCents: number;
  netProfitCents: number;
  marginPercent: number;
}

export interface DreReport {
  year: number;
  months: DreMonth[];
  totals: {
    grossRevenueCents: number;
    deductionsCents: number;
    netRevenueCents: number;
    directCostsCents: number;
    grossProfitCents: number;
    operatingExpensesCents: number;
    ebitdaCents: number;
    financialResultCents: number;
    netProfitCents: number;
  };
}

export interface CashFlowReport {
  startDate: string;
  endDate: string;
  realized: {
    inflowCents: number;
    outflowCents: number;
    netCents: number;
  };
  projected: {
    inflowCents: number;
    outflowCents: number;
    netCents: number;
  };
  totalForecastCents: number;
}

export const financialApi = {
  getStats: () => api.get<FinancialStats>('admin/finance/stats'),
  getDre: (year?: number) => api.get<DreReport>(withQuery('admin/finance/dre', { year })),
  getCashFlow: (startDate?: string, endDate?: string) =>
    api.get<CashFlowReport>(withQuery('admin/finance/cash-flow', { startDate, endDate })),
  syncCharges: () => api.post<{ count?: number }>('admin/finance/sync-charges'),

  listEntries: (query: Record<string, unknown>) =>
    api.get<{ items: FinancialEntry[]; total: number; page: number; limit: number; totalPages: number }>(
      withQuery('admin/finance/entries', query as any),
    ),
  getEntry: (id: string) => api.get<FinancialEntry>(`admin/finance/entries/${id}`),
  createEntry: (body: unknown) => api.post<FinancialEntry>('admin/finance/entries', body),
  updateEntry: (id: string, body: unknown) => api.put<FinancialEntry>(`admin/finance/entries/${id}`, body),
  settleEntry: (id: string, body: { paidAmountCents: number; paidAt: string; accountId?: string; paymentMethod?: string }) =>
    api.post<FinancialEntry>(`admin/finance/entries/${id}/settle`, body),
  deleteEntry: (id: string) => api.delete(`admin/finance/entries/${id}`),

  listCategories: () => api.get<FinancialCategory[]>('admin/finance/categories'),
  createCategory: (body: unknown) => api.post<FinancialCategory>('admin/finance/categories', body),

  listCostCenters: () => api.get<FinancialCostCenter[]>('admin/finance/cost-centers'),
  createCostCenter: (body: unknown) => api.post<FinancialCostCenter>('admin/finance/cost-centers', body),

  listAccounts: () => api.get<FinancialAccount[]>('admin/finance/accounts'),
  createAccount: (body: unknown) => api.post<FinancialAccount>('admin/finance/accounts', body),

  listSuppliers: () => api.get<FinancialSupplier[]>('admin/finance/suppliers'),
  createSupplier: (body: unknown) => api.post<FinancialSupplier>('admin/finance/suppliers', body),
};
