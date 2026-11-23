import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CampaignPlanScope, TaskPriority } from '@prisma/client';
import type { AiModelTier } from './client-ai.dto';

export class GenerateCampaignPlanDto {
  @IsEnum(CampaignPlanScope)
  scope!: CampaignPlanScope;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  objective!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsString({ each: true })
  channels!: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(40)
  itemCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  extraInstructions?: string;

  @IsOptional()
  @IsIn(['fast', 'pro'])
  modelTier?: AiModelTier;
}

export class UpdateCampaignPlanItemDto {
  @IsOptional()
  @IsDateString()
  scheduledDate?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  format?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  funnelStage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  pillar?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hook?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(6000)
  briefing?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  copyDraft?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cta?: string | null;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}

export class PublishCampaignPlanDto {
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  itemIds?: string[];
}
