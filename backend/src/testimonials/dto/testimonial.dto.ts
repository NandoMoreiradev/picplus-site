import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsYoutubeUrl } from '../../common/validators/is-youtube-url';
import { NAME_PATTERN } from '../../common/validators/is-br-phone';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTestimonialDto {
  /** Pessoa que dá o depoimento. */
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(NAME_PATTERN, { message: 'Informe um nome válido.' })
  clientName: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  role?: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  company: string;

  /** Frase de destaque exibida no cartão. */
  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'A frase deve ter ao menos 10 caracteres.' })
  @MaxLength(280, { message: 'A frase deve ter no máximo 280 caracteres.' })
  quote: string;

  /**
   * Fonte A — link do vídeo no YouTube (qualquer formato) ou o ID de 11 caracteres.
   * Informe esta OU o videoFile; o serviço garante que exista exatamente uma.
   */
  @IsOptional()
  // Campo vazio equivale a "não informado" (o formulário pode mandar "" ao trocar de fonte).
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : (value as unknown),
  )
  @IsYoutubeUrl()
  videoUrl?: string | null;

  /** Fonte B — URL de um vídeo enviado pelo painel (endpoint de upload, kind=video). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoFile?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo?: string;

  @IsOptional()
  @IsIn(['vertical', 'horizontal'])
  orientation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {}
