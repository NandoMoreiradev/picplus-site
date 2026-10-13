import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProjectStatus } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const HEX_MESSAGE = 'A cor deve estar no formato #RRGGBB.';

export class CreateProjectDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'O nome deve ter ao menos 2 caracteres.' })
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @Matches(HEX_COLOR, { message: HEX_MESSAGE })
  color?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class CreateStageDto {
  @IsUUID()
  projectId: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: HEX_MESSAGE })
  color?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

export class UpdateStageDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: HEX_MESSAGE })
  color?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

class StageOrderDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  order: number;
}

export class ReorderStagesDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => StageOrderDto)
  items: StageOrderDto[];
}

export class CreateTagDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: HEX_MESSAGE })
  color?: string;
}

export class UpdateTagDto extends PartialType(CreateTagDto) {}
