import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { config } from '../config/configuration';

export type UploadKind = 'image' | 'pdf';

const MAX_SIZE: Record<UploadKind, number> = {
  image: 5 * 1024 * 1024,
  pdf: 10 * 1024 * 1024,
};

/** Detecta o tipo real pelos primeiros bytes — o mimetype enviado pelo cliente não é confiável. */
function sniff(buffer: Buffer): { kind: UploadKind; ext: string } | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { kind: 'image', ext: 'jpg' };
  }
  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { kind: 'image', ext: 'png' };
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { kind: 'image', ext: 'webp' };
  }
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return { kind: 'pdf', ext: 'pdf' };
  }
  return null;
}

/**
 * Armazenamento em disco local. Para migrar para S3/Cloudinary basta
 * reimplementar `save` e `remove` mantendo a mesma assinatura.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  async save(file: Express.Multer.File, expected: UploadKind): Promise<string> {
    const detected = sniff(file.buffer);
    if (!detected || detected.kind !== expected) {
      throw new BadRequestException(
        expected === 'image'
          ? 'Envie uma imagem válida (JPG, PNG ou WebP).'
          : 'Envie um arquivo PDF válido.',
      );
    }
    if (file.size > MAX_SIZE[expected]) {
      throw new BadRequestException(
        `Arquivo muito grande. Limite de ${MAX_SIZE[expected] / 1024 / 1024} MB.`,
      );
    }

    await mkdir(config.uploads.dir, { recursive: true });
    const filename = `${randomUUID()}.${detected.ext}`;
    await writeFile(join(config.uploads.dir, filename), file.buffer);
    return `${config.uploads.publicPath}/${filename}`;
  }

  /** Remove um arquivo previamente salvo. Silencioso se não existir. */
  async remove(url?: string | null): Promise<void> {
    if (!url || !url.startsWith(`${config.uploads.publicPath}/`)) return;
    // basename impede path traversal (../)
    const filename = basename(url);
    try {
      await unlink(join(config.uploads.dir, filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(
          `Falha ao remover ${filename}: ${(error as Error).message}`,
        );
      }
    }
  }
}
