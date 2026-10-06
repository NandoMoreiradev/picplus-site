import {
  BadRequestException,
  Controller,
  Delete,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StorageService } from './storage.service';
import type { UploadKind } from './storage.service';

/** Upload usado pelo painel administrativo (rota protegida pelo guard global). */
@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('kind') kind: UploadKind = 'image',
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    if (kind !== 'image' && kind !== 'pdf') {
      throw new BadRequestException('Parâmetro "kind" deve ser image ou pdf.');
    }
    return { url: await this.storage.save(file, kind) };
  }

  @Delete()
  async remove(@Query('url') url: string) {
    await this.storage.remove(url);
    return { ok: true };
  }
}
