import { EmailTriggerType } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { EmailDesignJson } from '../email-renderer.service';

export class CreateEmailTemplateDto {
  @IsString()
  @MinLength(3, { message: 'O nome deve ter pelo menos 3 caracteres.' })
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(3, { message: 'O assunto deve ter pelo menos 3 caracteres.' })
  @MaxLength(200)
  subject!: string;

  @IsOptional()
  @IsEnum(EmailTriggerType)
  trigger?: EmailTriggerType | null;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsObject()
  designJson?: EmailDesignJson | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsEnum(EmailTriggerType)
  trigger?: EmailTriggerType | null;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsObject()
  designJson?: EmailDesignJson | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SendTestEmailDto {
  @IsEmail({}, { message: 'Informe um e-mail de destino válido.' })
  @IsNotEmpty()
  to!: string;
}
