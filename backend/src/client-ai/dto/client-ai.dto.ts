import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const COPY_FORMATS = [
  'INSTAGRAM_POST',
  'REELS_SCRIPT',
  'CAROUSEL',
  'BLOG_ARTICLE',
  'SALES_EMAIL',
  'AD_COPY',
  'TASK_BRIEFING',
  'CUSTOM',
] as const;

export type CopyFormat = (typeof COPY_FORMATS)[number];

export const PROJECT_ASSISTANT_ACTIONS = [
  'CONTENT_IDEAS',
  'CAMPAIGN_BRIEF',
  'COPY_VARIATIONS',
  'CUSTOM',
] as const;

export type ProjectAssistantAction = (typeof PROJECT_ASSISTANT_ACTIONS)[number];

export type AiModelTier = 'fast' | 'pro';

export class UpsertBrandProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  positioning?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  targetAudience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  painsAndDesires?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  toneOfVoice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  valueProposition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  productsAndOffers?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  ctaGuidelines?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  forbiddenWords?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  extraContext?: string;
}

export class GenerateBrandDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  extraNotes?: string;

  @IsOptional()
  @IsIn(['fast', 'pro'])
  modelTier?: AiModelTier;
}

export class CreateCompetitorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  instagramHandle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tiktokHandle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  youtubeHandle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  strengths?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  weaknesses?: string;
}

export class UpdateCompetitorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  instagramHandle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tiktokHandle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  youtubeHandle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  strengths?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  weaknesses?: string;
}

export class GenerateTaskCopyDto {
  @IsIn(COPY_FORMATS)
  format!: CopyFormat;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  extraInstructions?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  variations?: number;

  @IsOptional()
  @IsIn(['fast', 'pro'])
  modelTier?: AiModelTier;
}

export class ProjectAssistantDto {
  @IsIn(PROJECT_ASSISTANT_ACTIONS)
  action!: ProjectAssistantAction;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  prompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  channel?: string;

  @IsOptional()
  @IsIn(['fast', 'pro'])
  modelTier?: AiModelTier;
}
