import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { extractYoutubeId } from '../common/utils/youtube';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateTestimonialDto,
  UpdateTestimonialDto,
} from './dto/testimonial.dto';

const ORDER = [{ order: 'asc' as const }, { createdAt: 'asc' as const }];

@Injectable()
export class TestimonialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  listPublic() {
    return this.prisma.testimonial.findMany({
      where: { active: true },
      orderBy: ORDER,
    });
  }

  listAll() {
    return this.prisma.testimonial.findMany({ orderBy: ORDER });
  }

  async findOne(id: string) {
    const item = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Depoimento não encontrado.');
    return item;
  }

  create(dto: CreateTestimonialDto) {
    const { videoUrl, ...rest } = dto;
    return this.prisma.testimonial.create({
      // O DTO já garantiu que o link é do YouTube, então o ID existe.
      data: { ...rest, youtubeId: extractYoutubeId(videoUrl) as string },
    });
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    const current = await this.findOne(id);
    const { videoUrl, ...rest } = dto;
    const data: Prisma.TestimonialUpdateInput = { ...rest };
    if (videoUrl !== undefined)
      data.youtubeId = extractYoutubeId(videoUrl) as string;

    const updated = await this.prisma.testimonial.update({
      where: { id },
      data,
    });
    if (dto.photo !== undefined && dto.photo !== current.photo) {
      await this.storage.remove(current.photo);
    }
    return updated;
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.prisma.testimonial.delete({ where: { id } });
    await this.storage.remove(item.photo);
    return { ok: true };
  }
}
