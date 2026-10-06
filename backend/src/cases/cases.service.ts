import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { uniqueSlug } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateCaseDto, UpdateCaseDto } from './dto/case.dto';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  listPublic() {
    return this.prisma.successCase.findMany({
      where: { published: true },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findPublicBySlug(slug: string) {
    const item = await this.prisma.successCase.findFirst({
      where: { slug, published: true },
    });
    if (!item) throw new NotFoundException('Case não encontrado.');
    return item;
  }

  listAdmin() {
    return this.prisma.successCase.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const item = await this.prisma.successCase.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Case não encontrado.');
    return item;
  }

  async create(dto: CreateCaseDto) {
    const slug = await uniqueSlug(
      dto.title,
      async (s) =>
        !!(await this.prisma.successCase.findUnique({ where: { slug: s } })),
    );
    return this.prisma.successCase.create({
      data: {
        ...dto,
        slug,
        metrics: dto.metrics as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, dto: UpdateCaseDto) {
    const current = await this.findOne(id);
    const { metrics, ...rest } = dto;
    const data: Prisma.SuccessCaseUpdateInput = { ...rest };
    if (metrics !== undefined)
      data.metrics = metrics as unknown as Prisma.InputJsonValue;
    if (dto.title && dto.title !== current.title) {
      data.slug = await uniqueSlug(dto.title, async (s) => {
        const found = await this.prisma.successCase.findUnique({
          where: { slug: s },
        });
        return !!found && found.id !== id;
      });
    }

    const updated = await this.prisma.successCase.update({
      where: { id },
      data,
    });

    // Remove do disco as imagens que deixaram de ser usadas.
    const kept = new Set([updated.coverImage, ...updated.images]);
    const previous = [current.coverImage, ...current.images];
    await Promise.all(
      previous
        .filter((url) => url && !kept.has(url))
        .map((url) => this.storage.remove(url)),
    );
    return updated;
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.prisma.successCase.delete({ where: { id } });
    await Promise.all(
      [item.coverImage, ...item.images].map((url) => this.storage.remove(url)),
    );
    return { ok: true };
  }
}
