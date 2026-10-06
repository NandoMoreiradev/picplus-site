import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { uniqueSlug } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

const ORDER = [{ order: 'asc' as const }, { createdAt: 'asc' as const }];

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.service.findMany({
      where: { active: true },
      orderBy: ORDER,
    });
  }

  async findBySlug(slug: string) {
    const service = await this.prisma.service.findFirst({
      where: { slug, active: true },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado.');
    return service;
  }

  listAll() {
    return this.prisma.service.findMany({ orderBy: ORDER });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Serviço não encontrado.');
    return service;
  }

  async create(dto: CreateServiceDto) {
    const slug = await uniqueSlug(
      dto.name,
      async (s) =>
        !!(await this.prisma.service.findUnique({ where: { slug: s } })),
    );
    return this.prisma.service.create({ data: { ...dto, slug } });
  }

  async update(id: string, dto: UpdateServiceDto) {
    const current = await this.findOne(id);
    const data: Prisma.ServiceUpdateInput = { ...dto };
    if (dto.name && dto.name !== current.name) {
      data.slug = await uniqueSlug(dto.name, async (s) => {
        const found = await this.prisma.service.findUnique({
          where: { slug: s },
        });
        return !!found && found.id !== id;
      });
    }
    return this.prisma.service.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.service.delete({ where: { id } });
    return { ok: true };
  }
}
