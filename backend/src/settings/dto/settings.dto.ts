import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Texto vazio vira null (remove a imagem).
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export class UpdateSettingsDto {
  /** URL da imagem de compartilhamento (retornada pelo endpoint de upload). */
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  ogImage?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  blogOgImage?: string | null;
}
