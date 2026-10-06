import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ArticlesService } from './articles.service';
import {
  CreateArticleDto,
  ListArticlesQueryDto,
  UpdateArticleDto,
} from './dto/article.dto';

@Public()
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  list(@Query() query: ListArticlesQueryDto) {
    return this.articles.listPublic(query);
  }

  // Declarada antes de ":slug" para não ser capturada pelo parâmetro.
  @Get('categories')
  categories() {
    return this.articles.categories();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.articles.findPublicBySlug(slug);
  }

  @Get(':slug/related')
  related(@Param('slug') slug: string) {
    return this.articles.related(slug);
  }
}

@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  list(@Query() query: ListArticlesQueryDto) {
    return this.articles.listAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articles.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateArticleDto, @CurrentUser() user: AuthUser) {
    return this.articles.create(dto, user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articles.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.articles.remove(id);
  }
}
