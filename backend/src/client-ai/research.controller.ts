import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import {
  RequirePermissions,
  Resource,
} from '../common/decorators/permissions.decorator';
import type { AiModelTier } from './dto/client-ai.dto';
import {
  CreateExtensionTokenDto,
  IngestReferenceDto,
  RunResearchDto,
  ToggleReferenceViralDto,
} from './dto/research.dto';
import { ResearchService } from './research.service';

@Resource('ai_studio')
@Controller('admin/ai-studio/research')
export class ResearchController {
  constructor(private readonly service: ResearchService) {}

  @Get('clients/:clientId')
  @RequirePermissions('ai_studio.view')
  getClientResearch(@Param('clientId') clientId: string) {
    return this.service.getClientResearch(clientId);
  }

  @Post('clients/:clientId/references')
  @RequirePermissions('ai_studio.manage')
  @UseInterceptors(
    FilesInterceptor('media', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024, files: 10 },
    }),
  )
  ingestReference(
    @Param('clientId') clientId: string,
    @Body() dto: IngestReferenceDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.ingestReference(clientId, dto, files ?? [], user.sub);
  }

  @Patch('references/:id/viral')
  @RequirePermissions('ai_studio.manage')
  toggleViral(@Param('id') id: string, @Body() dto: ToggleReferenceViralDto) {
    return this.service.toggleViral(id, dto.isViral);
  }

  @Post('references/:id/reanalyze')
  @RequirePermissions('ai_studio.manage')
  reanalyze(
    @Param('id') id: string,
    @Body() body: { modelTier?: AiModelTier },
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.reanalyzeReference(id, user.sub, body?.modelTier);
  }

  @Delete('references/:id')
  @RequirePermissions('ai_studio.manage')
  deleteReference(@Param('id') id: string) {
    return this.service.deleteReference(id);
  }

  @Post('clients/:clientId/reports')
  @RequirePermissions('ai_studio.manage')
  runResearch(
    @Param('clientId') clientId: string,
    @Body() dto: RunResearchDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.runResearch(clientId, dto, user.sub);
  }

  @Delete('reports/:id')
  @RequirePermissions('ai_studio.manage')
  deleteReport(@Param('id') id: string) {
    return this.service.deleteReport(id);
  }

  /* ── Tokens da Extensão Chrome ───────────────────────── */

  @Get('extension-tokens')
  @RequirePermissions('ai_studio.view')
  listTokens(@CurrentUser() user: AuthUser) {
    return this.service.listTokens(user.sub);
  }

  @Post('extension-tokens')
  @RequirePermissions('ai_studio.manage')
  createToken(
    @Body() dto: CreateExtensionTokenDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createToken(user.sub, dto);
  }

  @Delete('extension-tokens/:id')
  @RequirePermissions('ai_studio.manage')
  revokeToken(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.revokeToken(user.sub, id);
  }
}
