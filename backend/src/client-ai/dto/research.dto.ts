import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReferencePlatform, ResearchReportKind } from '@prisma/client';
import type { AiModelTier } from './client-ai.dto';

const toBoolOptional = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  return value === true || value === 'true' || value === '1';
};

export class CreateExtensionTokenDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}

export class IngestReferenceDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  competitorId?: string;

  @IsOptional()
  @IsEnum(ReferencePlatform)
  platform?: ReferencePlatform;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  authorHandle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  caption?: string;

  /** Aceita JSON string (FormData) ou objeto (JSON body). */
  @IsOptional()
  metrics?: unknown;

  @IsOptional()
  @Transform(toBoolOptional)
  @IsBoolean()
  isViral?: boolean;

  /** Aceita string separada por vírgulas (FormData) ou array de strings. */
  @IsOptional()
  tags?: string | string[];

  @IsOptional()
  @Transform(toBoolOptional)
  @IsBoolean()
  analyzeNow?: boolean;

  @IsOptional()
  @IsIn(['fast', 'pro'])
  modelTier?: AiModelTier;
}

export class ToggleReferenceViralDto {
  @IsBoolean()
  isViral!: boolean;
}

export class RunResearchDto {
  @IsEnum(ResearchReportKind)
  kind!: ResearchReportKind;

  @IsString()
  @MinLength(2)
  @MaxLength(400)
  topic!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  targetUrl?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsBoolean()
  useWebSearch?: boolean;

  @IsOptional()
  @IsIn(['fast', 'pro'])
  modelTier?: AiModelTier;
}
