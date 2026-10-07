import { ContactStatus, ContactType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IsBrPhone, NAME_PATTERN } from '../../common/validators/is-br-phone';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SubmitContactDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Informe o seu nome.' })
  @MaxLength(120)
  @Matches(NAME_PATTERN, { message: 'Informe um nome válido.' })
  name: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(160)
  email: string;

  @IsOptional()
  @Transform(trim)
  @IsBrPhone()
  phone?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  company?: string;

  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'Conte um pouco mais (mínimo de 10 caracteres).' })
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsEnum(ContactType)
  type?: ContactType;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  serviceInterest?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  budgetRange?: string;

  /** Honeypot anti-bot. */
  @IsOptional()
  @IsString()
  website?: string;
}

export class UpdateContactStatusDto {
  @IsEnum(ContactStatus)
  status: ContactStatus;
}

export class ListContactsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsEnum(ContactType)
  type?: ContactType;
}
