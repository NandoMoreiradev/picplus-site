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
import { RequireAnyPermission } from '../common/decorators/permissions.decorator';
import { StorageService } from './storage.service';
import type { UploadKind } from './storage.service';

/**
 * Upload usado pelo painel. Exige permissão de criar ou editar em algum módulo
 * que aceite arquivos (a regra por módulo é aplicada ao salvar o registro).
 */
@RequireAnyPermission(
  'articles.create',
  'articles.edit',
  'cases.create',
  'cases.edit',
  'services.create',
  'services.edit',
  'brands.create',
  'brands.edit',
  'team.create',
  'team.edit',
  'testimonials.create',
  'testimonials.edit',
  'influencers.edit',
)
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
    // trim=1: recorta margens vazias da imagem (usado nos logos para centralizar o desenho)
    @Query('trim') trim?: string,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    if (kind !== 'image' && kind !== 'pdf') {
      throw new BadRequestException('Parâmetro "kind" deve ser image ou pdf.');
    }
    return { url: await this.storage.save(file, kind, { trim: trim === '1' }) };
  }

  @Delete()
  async remove(@Query('url') url: string) {
    await this.storage.remove(url);
    return { ok: true };
  }
}
