import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CaseMetricDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  value: string;
}

export class CreateCaseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  clientName: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  segment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  summary?: string;

  @IsString()
  @MinLength(10, { message: 'A descrição deve ter ao menos 10 caracteres.' })
  @MaxLength(10_000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  results?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CaseMetricDto)
  metrics?: CaseMetricDto[];

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateCaseDto extends PartialType(CreateCaseDto) {}
