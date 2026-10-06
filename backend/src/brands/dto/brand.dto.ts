import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  /** URL do logo (retornada pelo endpoint de upload). */
  @IsString()
  @MinLength(1, { message: 'Envie o logo da marca.' })
  @MaxLength(500)
  logo: string;

  /** Fundo do cartão no site: "dark" para logos brancos. */
  @IsOptional()
  @IsIn(['light', 'dark'])
  background?: string;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'Informe a URL completa, com https://' },
  )
  @MaxLength(300)
  website?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
