import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreateArticleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  excerpt?: string;

  /** Conteúdo em Markdown. */
  @IsString()
  @MinLength(20, { message: 'O conteúdo deve ter ao menos 20 caracteres.' })
  @MaxLength(100_000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}

export class ListArticlesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;
}
