import {
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LandingPageStatus } from '@prisma/client';
import type { AiModelTier } from './client-ai.dto';

export const LP_VISUAL_STYLES = [
  'MODERN_DARK',
  'EDITORIAL_LIGHT',
  'CORPORATE_CLEAN',
  'HIGH_CONVERSION',
] as const;

export type LpVisualStyle = (typeof LP_VISUAL_STYLES)[number];

export class GenerateLandingPageDto {
  @IsOptional()
  @IsUUID()
  clientId?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  objective!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  offer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ctaText?: string;

  @IsOptional()
  @IsIn(LP_VISUAL_STYLES)
  visualStyle?: LpVisualStyle;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  extraInstructions?: string;

  @IsOptional()
  @IsIn(['fast', 'pro'])
  modelTier?: AiModelTier;
}

export class IterateLandingPageDto {
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  instruction!: string;

  @IsOptional()
  @IsIn(['fast', 'pro'])
  modelTier?: AiModelTier;
}

export class UpdateLandingPageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsEnum(LandingPageStatus)
  status?: LandingPageStatus;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  metaTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaDescription?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(500_000)
  htmlContent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string | null;

  @IsOptional()
  @IsUUID()
  clientId?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;
}

export class CaptureLandingLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmCampaign?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
