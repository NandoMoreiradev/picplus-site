import {
  FinancialAccountType,
  FinancialCategoryNature,
  FinancialEntryStatus,
  FinancialEntryType,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListFinancialEntriesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FinancialEntryType)
  type?: FinancialEntryType;

  @IsOptional()
  status?: FinancialEntryStatus | 'ALL';

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  costCenterId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  influencerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class CreateFinancialEntryDto {
  @IsEnum(FinancialEntryType, { message: 'Tipo deve ser INCOME ou EXPENSE' })
  type!: FinancialEntryType;

  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Título deve ter ao menos 3 caracteres' })
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt({ message: 'Valor deve ser um número inteiro em centavos' })
  @Min(1, { message: 'Valor deve ser positivo' })
  nominalAmountCents!: number;

  @IsISO8601({}, { message: 'Data de vencimento inválida' })
  dueDate!: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Data de competência inválida' })
  competenceDate?: string;

  @IsString({ message: 'Selecione uma categoria' })
  categoryId!: string;

  @IsOptional()
  @IsString()
  costCenterId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  influencerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  notes?: string;

  // Parcelamento / Recorrência
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installments?: number; // Cria N parcelas automaticamente se > 1
}

export class UpdateFinancialEntryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nominalAmountCents?: number;

  @IsOptional()
  @IsEnum(FinancialEntryStatus)
  status?: FinancialEntryStatus;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsISO8601()
  competenceDate?: string;

  @IsOptional()
  @IsISO8601()
  paidAt?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  costCenterId?: string | null;

  @IsOptional()
  @IsString()
  accountId?: string | null;

  @IsOptional()
  @IsString()
  clientId?: string | null;

  @IsOptional()
  @IsString()
  influencerId?: string | null;

  @IsOptional()
  @IsString()
  supplierId?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  attachmentUrl?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  invoiceNumber?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  notes?: string | null;
}

export class SettleFinancialEntryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Valor pago deve ser maior que zero' })
  paidAmountCents!: number;

  @IsISO8601({}, { message: 'Data de pagamento/recebimento inválida' })
  paidAt!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  interestCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  discountCents?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  paymentMethod?: string;
}

export class CreateCategoryDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  name!: string;

  @Transform(trim)
  @IsString()
  code!: string;

  @IsEnum(FinancialCategoryNature)
  nature!: FinancialCategoryNature;

  @IsOptional()
  @Transform(trim)
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateCostCenterDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  name!: string;

  @Transform(trim)
  @IsString()
  code!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  description?: string;
}

export class CreateAccountDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  bankName?: string;

  @IsEnum(FinancialAccountType)
  accountType!: FinancialAccountType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  initialBalanceCents?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateSupplierDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  document?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  email?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  phone?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  pixKey?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  category?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  notes?: string;
}
