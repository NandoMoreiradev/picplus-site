import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { can } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { paginated, pageArgs } from '../common/utils/paginate';
import { uniqueSlug } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateArticleDto,
  ListArticlesQueryDto,
  UpdateArticleDto,
} from './dto/article.dto';

const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  category: true,
  published: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  content: false,
} satisfies Prisma.ArticleSelect;

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private searchFilter(search?: string): Prisma.ArticleWhereInput {
    if (!search) return {};
    return {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  // ── Público ────────────────────────────────────────────────

  async listPublic(query: ListArticlesQueryDto) {
    const where: Prisma.ArticleWhereInput = {
      published: true,
      ...(query.category ? { category: query.category } : {}),
      ...this.searchFilter(query.search),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { publishedAt: 'desc' },
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.article.count({ where }),
    ]);
    return paginated(items, total, query.page, query.limit);
  }

  async categories() {
    const rows = await this.prisma.article.findMany({
      where: { published: true, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((row) => row.category as string);
  }

  async findPublicBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { slug, published: true },
      include: { author: { select: { name: true } } },
    });
    if (!article) throw new NotFoundException('Artigo não encontrado.');
    return article;
  }

  /** Outros artigos publicados, para a seção "Leia também". */
  related(slug: string, take = 3) {
    return this.prisma.article.findMany({
      where: { published: true, slug: { not: slug } },
      select: LIST_SELECT,
      orderBy: { publishedAt: 'desc' },
      take,
    });
  }

  // ── Admin ──────────────────────────────────────────────────

  async listAdmin(query: ListArticlesQueryDto) {
    const where = this.searchFilter(query.search);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.article.count({ where }),
    ]);
    return paginated(items, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Artigo não encontrado.');
    return article;
  }

  async create(dto: CreateArticleDto, actor: AuthUser) {
    if (dto.published) this.assertCanPublish(actor);
    const slug = await uniqueSlug(
      dto.title,
      async (s) =>
        !!(await this.prisma.article.findUnique({ where: { slug: s } })),
    );
    return this.prisma.article.create({
      data: {
        ...dto,
        slug,
        authorId: actor.sub,
        publishedAt: dto.published ? new Date() : null,
      },
    });
  }

  async update(id: string, dto: UpdateArticleDto, actor: AuthUser) {
    const current = await this.findOne(id);
    // Publicar/despublicar é uma permissão à parte: editar o texto não basta.
    if (dto.published !== undefined && dto.published !== current.published) {
      this.assertCanPublish(actor);
    }
    const data: Prisma.ArticleUpdateInput = { ...dto };

    if (dto.title && dto.title !== current.title && !current.published) {
      // Slug só muda enquanto o artigo é rascunho, para não quebrar links publicados.
      data.slug = await uniqueSlug(dto.title, async (s) => {
        const found = await this.prisma.article.findUnique({
          where: { slug: s },
        });
        return !!found && found.id !== id;
      });
    }
    if (dto.published === true && !current.publishedAt)
      data.publishedAt = new Date();
    if (dto.published === false) data.publishedAt = null;

    const updated = await this.prisma.article.update({ where: { id }, data });
    if (dto.coverImage !== undefined && dto.coverImage !== current.coverImage) {
      await this.storage.remove(current.coverImage);
    }
    return updated;
  }

  private assertCanPublish(actor: AuthUser) {
    if (!can(actor, 'articles.publish')) {
      throw new ForbiddenException(
        'Você não tem permissão para publicar ou despublicar artigos.',
      );
    }
  }

  async remove(id: string) {
    const article = await this.findOne(id);
    await this.prisma.article.delete({ where: { id } });
    await this.storage.remove(article.coverImage);
    return { ok: true };
  }
}
