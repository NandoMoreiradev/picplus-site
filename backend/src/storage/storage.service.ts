import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { config, isR2Enabled } from '../config/configuration';

export type UploadKind = 'image' | 'pdf' | 'video';

const MAX_SIZE: Record<UploadKind, number> = {
  image: 5 * 1024 * 1024,
  pdf: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

/**
 * Marcas ("brands") da caixa ftyp que identificam vídeo MP4/MOV. HEIC, AVIF e similares
 * também começam com ftyp, mas são imagens — por isso a lista é explícita.
 */
const VIDEO_BRANDS = new Set([
  'isom',
  'iso2',
  'iso4',
  'iso5',
  'iso6',
  'mp41',
  'mp42',
  'avc1',
  'dash',
  'M4V ',
  'qt  ',
]);

const INVALID_FILE_MESSAGE: Record<UploadKind, string> = {
  image: 'Envie uma imagem válida (JPG, PNG ou WebP).',
  pdf: 'Envie um arquivo PDF válido.',
  video: 'Envie um vídeo válido (MP4, WebM ou MOV).',
};

interface Detected {
  kind: UploadKind;
  ext: string;
  mime: string;
}

/** Detecta o tipo real pelos primeiros bytes — o mimetype enviado pelo cliente não é confiável. */
function sniff(buffer: Buffer): Detected | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { kind: 'image', ext: 'jpg', mime: 'image/jpeg' };
  }
  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { kind: 'image', ext: 'png', mime: 'image/png' };
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { kind: 'image', ext: 'webp', mime: 'image/webp' };
  }
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return { kind: 'pdf', ext: 'pdf', mime: 'application/pdf' };
  }
  // MP4 / MOV: caixa "ftyp" nos bytes 4–8 e a marca nos bytes 8–12.
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (!VIDEO_BRANDS.has(brand)) return null;
    return brand === 'qt  '
      ? { kind: 'video', ext: 'mov', mime: 'video/quicktime' }
      : { kind: 'video', ext: 'mp4', mime: 'video/mp4' };
  }
  // WebM / Matroska: cabeçalho EBML (1A 45 DF A3).
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { kind: 'video', ext: 'webm', mime: 'video/webm' };
  }
  return null;
}

/**
 * Armazenamento de arquivos enviados.
 *
 * - Com as variáveis R2_* completas: Cloudflare R2 (persistente, servido por CDN).
 *   A URL pública completa é gravada no banco.
 * - Sem elas: disco local (desenvolvimento). Grava o caminho relativo /uploads/x.ext.
 *
 * `save` e `remove` mantêm a mesma assinatura nos dois modos.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly useR2 = isR2Enabled();
  private readonly s3 = this.useR2
    ? new S3Client({
        region: 'auto',
        endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.r2.accessKeyId,
          secretAccessKey: config.r2.secretAccessKey,
        },
        // O R2 não aceita os checksums adicionais que o SDK envia por padrão.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      })
    : null;

  constructor() {
    this.logger.log(
      this.useR2
        ? `Uploads no Cloudflare R2 (bucket ${config.r2.bucket})`
        : `Uploads em disco local (${config.uploads.dir}). Em produção configure o R2.`,
    );
  }

  async save(
    file: Express.Multer.File,
    expected: UploadKind,
    options: { trim?: boolean } = {},
  ): Promise<string> {
    const detected = sniff(file.buffer);
    if (!detected || detected.kind !== expected) {
      throw new BadRequestException(INVALID_FILE_MESSAGE[expected]);
    }
    if (file.size > MAX_SIZE[expected]) {
      throw new BadRequestException(
        `Arquivo muito grande. Limite de ${MAX_SIZE[expected] / 1024 / 1024} MB.`,
      );
    }

    // Logos: remove margens vazias para que o desenho (e não o arquivo) fique centralizado.
    const body =
      options.trim && expected === 'image'
        ? await this.trimMargins(file.buffer)
        : file.buffer;
    const filename = `${randomUUID()}.${detected.ext}`;

    if (this.s3) {
      const key = `uploads/${filename}`;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: config.r2.bucket,
          Key: key,
          Body: body,
          // Tipo definido pelo servidor (nunca o do cliente) e nome aleatório: o arquivo é imutável.
          ContentType: detected.mime,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      return `${config.r2.publicUrl}/${key}`;
    }

    await mkdir(config.uploads.dir, { recursive: true });
    await writeFile(join(config.uploads.dir, filename), body);
    return `${config.uploads.publicPath}/${filename}`;
  }

  /**
   * Recorta bordas transparentes ou de cor uniforme. Mantém o formato original.
   * Se a imagem for toda uniforme (nada a recortar) devolve o arquivo sem alteração.
   */
  private async trimMargins(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer).trim({ threshold: 12 }).toBuffer();
    } catch (error) {
      this.logger.warn(`Recorte ignorado: ${(error as Error).message}`);
      return buffer;
    }
  }

  /** A URL aponta para um arquivo que NÓS armazenamos (e não para um site qualquer)? */
  isOwnUrl(url: string): boolean {
    const prefix = this.s3
      ? `${config.r2.publicUrl}/uploads/`
      : `${config.uploads.publicPath}/`;
    return url.startsWith(prefix);
  }

  /** Remove um arquivo previamente salvo. Silencioso se não existir ou for de outra origem. */
  async remove(url?: string | null): Promise<void> {
    if (!url) return;

    // Arquivo no R2: a chave é o que vem depois da URL pública.
    if (this.s3 && url.startsWith(`${config.r2.publicUrl}/uploads/`)) {
      const key = url.slice(config.r2.publicUrl.length + 1);
      try {
        await this.s3.send(
          new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }),
        );
      } catch (error) {
        this.logger.warn(
          `Falha ao remover ${key}: ${(error as Error).message}`,
        );
      }
      return;
    }

    // Arquivo em disco local.
    if (!url.startsWith(`${config.uploads.publicPath}/`)) return;
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
