import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { uniqueSlug } from '../common/utils/slug';
import { extractYoutubeId } from '../common/utils/youtube';
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
    // videoUrl/videoFile são só entrada do formulário: no banco ficam youtubeId/videoFile.
    const { videoUrl, videoFile, ...rest } = dto;
    return this.prisma.successCase.create({
      data: {
        ...rest,
        ...this.resolveVideo({ videoUrl, videoFile }, null),
        slug,
        metrics: dto.metrics as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, dto: UpdateCaseDto) {
    const current = await this.findOne(id);
    const { metrics, videoUrl, videoFile, ...rest } = dto;
    const data: Prisma.SuccessCaseUpdateInput = { ...rest };
    if (metrics !== undefined)
      data.metrics = metrics as unknown as Prisma.InputJsonValue;
    if (videoUrl !== undefined || videoFile !== undefined)
      Object.assign(
        data,
        this.resolveVideo({ videoUrl, videoFile }, current),
      );
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
    if (current.videoFile && current.videoFile !== updated.videoFile) {
      await this.storage.remove(current.videoFile);
    }
    return updated;
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.prisma.successCase.delete({ where: { id } });
    await Promise.all(
      [item.coverImage, ...item.images, item.videoFile].map((url) =>
        this.storage.remove(url),
      ),
    );
    return { ok: true };
  }

  /**
   * Decide a fonte final do vídeo (YouTube OU arquivo, ou nenhum). O que não for enviado
   * é mantido; null explícito limpa aquela fonte. O arquivo só vale se tiver sido enviado
   * por nós — nunca um endereço externo qualquer.
   */
  private resolveVideo(
    input: { videoUrl?: string | null; videoFile?: string | null },
    current: { youtubeId: string | null; videoFile: string | null } | null,
  ) {
    const link = input.videoUrl?.trim();
    const file = input.videoFile?.trim();

    if (link && file) {
      throw new BadRequestException(
        'Escolha só uma fonte de vídeo: o link do YouTube ou o arquivo enviado.',
      );
    }
    if (file && !this.storage.isOwnUrl(file)) {
      throw new BadRequestException(
        'O vídeo precisa ser enviado pelo painel (não aceitamos links externos de arquivo).',
      );
    }

    let youtubeId = current?.youtubeId ?? null;
    let videoFile = current?.videoFile ?? null;

    if (link) {
      youtubeId = extractYoutubeId(link); // o DTO já garantiu que o link é válido
      videoFile = null;
    } else if (file) {
      videoFile = file;
      youtubeId = null;
    } else {
      if (input.videoUrl === null) youtubeId = null;
      if (input.videoFile === null) videoFile = null;
    }
    return { youtubeId, videoFile };
  }
}
