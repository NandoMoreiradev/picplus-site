import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
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
import { IsYoutubeUrl } from '../../common/validators/is-youtube-url';

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
  @ArrayMaxSize(24)
  @IsString({ each: true })
  images?: string[];

  /**
   * Vídeo opcional, fonte A — link do YouTube (qualquer formato) ou o ID de 11 caracteres.
   * Informe este OU o videoFile; null remove o vídeo.
   */
  @IsOptional()
  // Campo vazio equivale a "não informado" (o formulário pode mandar "" ao trocar de fonte).
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : (value as unknown),
  )
  @IsYoutubeUrl()
  videoUrl?: string | null;

  /** Vídeo opcional, fonte B — URL de um vídeo enviado pelo painel (upload kind=video). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoFile?: string | null;

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
