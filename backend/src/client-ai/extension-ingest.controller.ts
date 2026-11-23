import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Options,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { Public } from '../common/decorators/public.decorator';
import { IngestReferenceDto } from './dto/research.dto';
import { ResearchService } from './research.service';

@Public()
@Controller('public/extension')
export class ExtensionIngestController {
  constructor(private readonly research: ResearchService) {}

  private setCors(res: Response) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, x-extension-token',
    );
  }

  @Options('clients')
  @HttpCode(204)
  preflightClients(@Res() res: Response) {
    this.setCors(res);
    res.status(204).send();
  }

  @Options('ingest')
  @HttpCode(204)
  preflightIngest(@Res() res: Response) {
    this.setCors(res);
    res.status(204).send();
  }

  @Get('clients')
  async listClients(
    @Headers('x-extension-token') token: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setCors(res);
    const user = await this.research.authenticateExtensionToken(token);
    const clients = await this.research.listExtensionClients();
    return {
      user: { id: user.id, name: user.name },
      clients,
    };
  }

  @Post('ingest')
  @UseInterceptors(
    FilesInterceptor('media', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024, files: 10 },
    }),
  )
  async ingest(
    @Headers('x-extension-token') token: string | undefined,
    @Body() dto: IngestReferenceDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setCors(res);
    const user = await this.research.authenticateExtensionToken(token);
    if (!dto.clientId) {
      throw new BadRequestException('Informe o cliente de destino (clientId).');
    }
    return this.research.ingestReference(
      dto.clientId,
      dto,
      files ?? [],
      user.id,
    );
  }
}
