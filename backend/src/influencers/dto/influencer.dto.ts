import { PartialType, PickType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { InfluencerStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true';

/** Corpo (multipart) do formulário público de cadastro. */
export class RegisterInfluencerDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Informe o seu nome.' })
  @MaxLength(120)
  name: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(160)
  email: string;

  @Transform(trim)
  @Matches(/^[\d\s()+-]{10,20}$/, {
    message: 'Informe um WhatsApp válido, com DDD.',
  })
  whatsapp: string;

  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Informe o seu nicho de atuação.' })
  @MaxLength(60)
  niche: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  location?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1200)
  description?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) instagram?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) tiktok?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) youtube?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) twitter?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) twitch?: string;

  @Transform(toBool)
  @Equals(true, { message: 'É necessário aceitar os termos para continuar.' })
  acceptTerms: boolean;

  /** Honeypot anti-bot: pessoas reais não preenchem (campo oculto no formulário). */
  @IsOptional()
  @IsString()
  website?: string;
}

export class UpdateInfluencerDto extends PartialType(
  PickType(RegisterInfluencerDto, [
    'name',
    'whatsapp',
    'niche',
    'location',
    'description',
  ] as const),
) {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  presentationPdf?: string;

  @IsOptional()
  @IsObject()
  socialNetworks?: Record<string, string>;
}

export class ApproveInfluencerDto {
  @IsOptional()
  @IsBoolean()
  showOnShowcase?: boolean;

  /** Envia e-mail de aprovação ao influenciador (padrão: sim). */
  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

export class RejectInfluencerDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(['email', 'whatsapp'], { each: true })
  channels?: ('email' | 'whatsapp')[];
}

export class ShowcaseToggleDto {
  @IsBoolean()
  show: boolean;
}

export class ListInfluencersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InfluencerStatus)
  status?: InfluencerStatus;
}

export class ListShowcaseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  niche?: string;
}
