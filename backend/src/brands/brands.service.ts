import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

const ORDER = [{ order: 'asc' as const }, { name: 'asc' as const }];

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  listPublic() {
    return this.prisma.brand.findMany({
      where: { active: true },
      orderBy: ORDER,
      select: {
        id: true,
        name: true,
        logo: true,
        background: true,
        website: true,
      },
    });
  }

  listAll() {
    return this.prisma.brand.findMany({ orderBy: ORDER });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Marca não encontrada.');
    return brand;
  }

  create(dto: CreateBrandDto) {
    return this.prisma.brand.create({ data: dto });
  }

  async update(id: string, dto: UpdateBrandDto) {
    const current = await this.findOne(id);
    const updated = await this.prisma.brand.update({
      where: { id },
      data: dto,
    });
    if (dto.logo && dto.logo !== current.logo)
      await this.storage.remove(current.logo);
    return updated;
  }

  async remove(id: string) {
    const brand = await this.findOne(id);
    await this.prisma.brand.delete({ where: { id } });
    await this.storage.remove(brand.logo);
    return { ok: true };
  }
}
