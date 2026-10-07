import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { extractYoutubeId } from '../common/utils/youtube';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateTestimonialDto,
  UpdateTestimonialDto,
} from './dto/testimonial.dto';

const ORDER = [{ order: 'asc' as const }, { createdAt: 'asc' as const }];

/** Fonte do vídeo: exatamente uma das duas fica preenchida. */
interface VideoSource {
  youtubeId: string | null;
  videoFile: string | null;
}

/**
 * videoUrl/videoFile são só entrada do formulário: no banco ficam youtubeId/videoFile,
 * já resolvidos por resolveSource.
 */
function withoutVideoInput<T extends UpdateTestimonialDto>(dto: T): T {
  const copy = { ...dto };
  delete copy.videoUrl;
  delete copy.videoFile;
  return copy;
}

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
    return this.prisma.testimonial.create({
      data: { ...withoutVideoInput(dto), ...this.resolveSource(dto, null) },
    });
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    const current = await this.findOne(id);
    const touchesSource =
      dto.videoUrl !== undefined || dto.videoFile !== undefined;
    const source = touchesSource ? this.resolveSource(dto, current) : {};

    const updated = await this.prisma.testimonial.update({
      where: { id },
      data: { ...withoutVideoInput(dto), ...source },
    });

    // Remove do armazenamento o que deixou de ser usado (foto trocada, vídeo trocado).
    if (dto.photo !== undefined && dto.photo !== current.photo) {
      await this.storage.remove(current.photo);
    }
    if (current.videoFile && current.videoFile !== updated.videoFile) {
      await this.storage.remove(current.videoFile);
    }
    return updated;
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.prisma.testimonial.delete({ where: { id } });
    await this.storage.remove(item.photo);
    await this.storage.remove(item.videoFile);
    return { ok: true };
  }

  /**
   * Decide a fonte final do vídeo (YouTube OU arquivo). Na criação é obrigatório informar
   * uma; na edição, o que não for enviado é mantido. O arquivo só vale se tiver sido
   * enviado por nós — nunca um endereço externo qualquer.
   */
  private resolveSource(
    dto: UpdateTestimonialDto,
    current: VideoSource | null,
  ): VideoSource {
    const link = dto.videoUrl?.trim();
    const file = dto.videoFile?.trim();

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
      // null explícito limpa aquela fonte
      if (dto.videoUrl === null) youtubeId = null;
      if (dto.videoFile === null) videoFile = null;
    }

    if (!youtubeId && !videoFile) {
      throw new BadRequestException(
        'Informe o link do YouTube ou envie um arquivo de vídeo.',
      );
    }
    return { youtubeId, videoFile };
  }
}
