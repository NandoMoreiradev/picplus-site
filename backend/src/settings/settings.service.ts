import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateSettingsDto } from './dto/settings.dto';

const ID = 'default';
const SELECT = { ogImage: true, blogOgImage: true } as const;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async get() {
    const row = await this.prisma.siteSettings.findUnique({
      where: { id: ID },
      select: SELECT,
    });
    return row ?? { ogImage: null, blogOgImage: null };
  }

  async update(dto: UpdateSettingsDto) {
    const current = await this.get();
    const updated = await this.prisma.siteSettings.upsert({
      where: { id: ID },
      create: { id: ID, ...dto },
      update: dto,
      select: SELECT,
    });
    // Apaga do disco a imagem que foi trocada ou removida.
    for (const key of ['ogImage', 'blogOgImage'] as const) {
      if (dto[key] !== undefined && current[key] && current[key] !== updated[key])
        await this.storage.remove(current[key]);
    }
    return updated;
  }
}
