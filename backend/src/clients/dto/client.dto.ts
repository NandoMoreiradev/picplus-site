import { ChargeBillingType, ClientStatus, ContractType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListClientsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trim)
  status?: ClientStatus | 'ALL';
}

export class CreateClientDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Informe a Razão Social.' })
  @MaxLength(200)
  corporateName!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Informe o Nome Fantasia.' })
  @MaxLength(200)
  tradeName!: string;

  @Transform(trim)
  @IsString()
  @MinLength(11, { message: 'Informe um CNPJ ou CPF válido.' })
  @MaxLength(20)
  cnpjCpf!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  stateRegistration?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  segment?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  website?: string | null;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  // Endereço fiscal
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10)
  postalCode?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  addressNumber?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  complement?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  neighborhood?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2)
  state?: string | null;

  // Parâmetros do Contrato
  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyFeeCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  contractStart?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  contractEnd?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  accountManagerId?: string | null;

  // Contato primário opcional no cadastro
  @IsOptional()
  @Transform(trim)
  @IsString()
  primaryContactName?: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail({}, { message: 'Informe um e-mail válido para o contato.' })
  primaryContactEmail?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  primaryContactPhone?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  primaryContactRole?: string;
}

export class UpdateClientDto extends CreateClientDto {}

export class CreateClientContactDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Informe o nome do contato.' })
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  role?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(160)
  email!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  whatsapp?: string;

  @IsOptional()
  @IsBoolean()
  isFinancial?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateClientNoteDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'O conteúdo da nota não pode ser vazio.' })
  content!: string;
}

export class InvoiceTaxesDto {
  @IsOptional()
  @IsBoolean()
  retainIss?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  iss?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cofins?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  csll?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  inss?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ir?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pis?: number;
}

export class CreateClientChargeDto {
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Informe a descrição da cobrança.' })
  @MaxLength(255)
  description!: string;

  @Type(() => Number)
  @IsInt()
  @Min(100, { message: 'O valor mínimo é R$ 1,00 (100 centavos).' })
  valueCents!: number;

  @Transform(trim)
  @IsString()
  dueDate!: string; // YYYY-MM-DD

  @IsOptional()
  @IsEnum(ChargeBillingType)
  billingType?: ChargeBillingType;

  // Modalidade de Cobrança: Única, Assinatura Recorrente ou Parcelada
  @IsOptional()
  @Transform(trim)
  @IsString()
  chargeKind?: 'SINGLE' | 'RECURRENT' | 'INSTALLMENT';

  @IsOptional()
  @Transform(trim)
  @IsString()
  cycle?: 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(24)
  installmentCount?: number;

  // Emissão de Nota Fiscal de Serviço (NFS-e)
  @IsOptional()
  @IsBoolean()
  emitInvoice?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  invoiceServiceDescription?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  invoiceEffectiveDate?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  municipalServiceId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  municipalServiceCode?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  municipalServiceName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceTaxesDto)
  invoiceTaxes?: InvoiceTaxesDto;
}

export class UpdateClientChargeDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Informe a descrição da cobrança.' })
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100, { message: 'O valor mínimo é R$ 1,00 (100 centavos).' })
  valueCents?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  dueDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsEnum(ChargeBillingType)
  billingType?: ChargeBillingType;
}

export class EmitChargeInvoiceDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  serviceDescription?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  effectiveDate?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  municipalServiceId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  municipalServiceCode?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  municipalServiceName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceTaxesDto)
  taxes?: InvoiceTaxesDto;
}

export class ConvertContactToClientDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  tradeName!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  corporateName?: string;

  @Transform(trim)
  @IsString()
  @MinLength(11)
  cnpjCpf!: string;

  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyFeeCents?: number;
}
