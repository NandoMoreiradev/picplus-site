import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import {
  RequirePermissions,
  Resource,
} from '../common/decorators/permissions.decorator';
import { ClientAiService } from './client-ai.service';
import {
  CreateCompetitorDto,
  GenerateBrandDraftDto,
  GenerateTaskCopyDto,
  ProjectAssistantDto,
  UpdateCompetitorDto,
  UpsertBrandProfileDto,
} from './dto/client-ai.dto';

@Resource('ai_studio')
@Controller('admin/ai-studio')
export class ClientAiController {
  constructor(private readonly service: ClientAiService) {}

  /* ── Inteligência do Cliente ─────────────────────────── */

  @Get('clients/:clientId')
  @RequirePermissions('ai_studio.view')
  getIntelligence(@Param('clientId') clientId: string) {
    return this.service.getIntelligence(clientId);
  }

  @Put('clients/:clientId/profile')
  @RequirePermissions('ai_studio.manage')
  upsertBrandProfile(
    @Param('clientId') clientId: string,
    @Body() dto: UpsertBrandProfileDto,
  ) {
    return this.service.upsertBrandProfile(clientId, dto);
  }

  @Post('clients/:clientId/profile/draft')
  @RequirePermissions('ai_studio.manage')
  generateBrandDraft(
    @Param('clientId') clientId: string,
    @Body() dto: GenerateBrandDraftDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.generateBrandDraft(clientId, dto, user.sub);
  }

  /* ── Concorrentes ────────────────────────────────────── */

  @Post('clients/:clientId/competitors')
  @RequirePermissions('ai_studio.manage')
  createCompetitor(
    @Param('clientId') clientId: string,
    @Body() dto: CreateCompetitorDto,
  ) {
    return this.service.createCompetitor(clientId, dto);
  }

  @Patch('clients/:clientId/competitors/:competitorId')
  @RequirePermissions('ai_studio.manage')
  updateCompetitor(
    @Param('clientId') clientId: string,
    @Param('competitorId') competitorId: string,
    @Body() dto: UpdateCompetitorDto,
  ) {
    return this.service.updateCompetitor(clientId, competitorId, dto);
  }

  @Delete('clients/:clientId/competitors/:competitorId')
  @RequirePermissions('ai_studio.manage')
  deleteCompetitor(
    @Param('clientId') clientId: string,
    @Param('competitorId') competitorId: string,
  ) {
    return this.service.deleteCompetitor(clientId, competitorId);
  }

  /* ── IA nas Tarefas e Projetos ───────────────────────── */

  @Get('tasks/:taskId/history')
  @RequirePermissions('ai_studio.view')
  getTaskHistory(@Param('taskId') taskId: string) {
    return this.service.getTaskHistory(taskId);
  }

  @Post('tasks/:taskId/generate')
  @RequirePermissions('ai_studio.manage')
  generateTaskCopy(
    @Param('taskId') taskId: string,
    @Body() dto: GenerateTaskCopyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.generateTaskCopy(taskId, dto, user.sub);
  }

  @Get('projects/:projectId/history')
  @RequirePermissions('ai_studio.view')
  getProjectHistory(@Param('projectId') projectId: string) {
    return this.service.getProjectHistory(projectId);
  }

  @Post('projects/:projectId/assistant')
  @RequirePermissions('ai_studio.manage')
  runProjectAssistant(
    @Param('projectId') projectId: string,
    @Body() dto: ProjectAssistantDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.runProjectAssistant(projectId, dto, user.sub);
  }
}
