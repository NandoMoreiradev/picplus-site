import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermissions,
  Resource,
} from '../common/decorators/permissions.decorator';
import {
  CreateProjectDto,
  CreateStageDto,
  CreateTagDto,
  ReorderStagesDto,
  UpdateProjectDto,
  UpdateStageDto,
  UpdateTagDto,
} from './dto/project.dto';
import {
  BulkIdsDto,
  BulkUpdateDto,
  CreateCommentDto,
  CreateTaskDto,
  FilterTasksDto,
  ReorderDto,
  UpdateCommentDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { TaskAttachmentsService } from './task-attachments.service';
import { TaskCommentsService } from './task-comments.service';
import { TaskProjectsService } from './task-projects.service';
import { TasksService } from './tasks.service';

/**
 * Gestão de tarefas. O verbo HTTP define a permissão padrão (GET → tasks.view, POST →
 * tasks.create, PATCH → tasks.edit, DELETE → tasks.delete); o que foge disso declara a
 * permissão no método. Rotas estáticas vêm antes das de ":id".
 */
@Resource('tasks')
@Controller('admin/tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly projects: TaskProjectsService,
    private readonly comments: TaskCommentsService,
    private readonly attachments: TaskAttachmentsService,
  ) {}

  /* ── Apoio ─────────────────────────────────────────── */

  @Get('users')
  users() {
    return this.tasks.assignableUsers();
  }

  /* ── Projetos ──────────────────────────────────────── */

  @Get('projects')
  listProjects() {
    return this.projects.list();
  }

  @Get('projects/trash')
  @RequirePermissions('tasks.delete')
  projectsTrash() {
    return this.projects.trash();
  }

  @Post('projects')
  @RequirePermissions('tasks.manage')
  createProject(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projects.create(dto, user.sub);
  }

  @Patch('projects/:id')
  @RequirePermissions('tasks.manage')
  updateProject(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto);
  }

  @Patch('projects/:id/pin')
  togglePin(@Param('id') id: string) {
    return this.projects.togglePin(id);
  }

  @Post('projects/:id/duplicate')
  @RequirePermissions('tasks.manage')
  duplicateProject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projects.duplicate(id, user.sub);
  }

  @Post('projects/:id/restore')
  @RequirePermissions('tasks.delete')
  restoreProject(@Param('id') id: string) {
    return this.projects.restore(id);
  }

  @Delete('projects/:id/hard-delete')
  @RequirePermissions('tasks.delete', 'tasks.manage')
  hardDeleteProject(@Param('id') id: string) {
    return this.projects.hardDelete(id);
  }

  @Delete('projects/:id')
  @RequirePermissions('tasks.delete', 'tasks.manage')
  removeProject(@Param('id') id: string) {
    return this.projects.remove(id);
  }

  /* ── Estágios ──────────────────────────────────────── */

  @Get('stages')
  stages(@Query('projectId') projectId?: string) {
    if (!projectId) throw new BadRequestException('Informe o projectId.');
    return this.projects.stages(projectId);
  }

  @Post('stages')
  @RequirePermissions('tasks.manage')
  createStage(@Body() dto: CreateStageDto) {
    return this.projects.createStage(dto);
  }

  @Patch('stages/reorder')
  @RequirePermissions('tasks.manage')
  reorderStages(@Body() dto: ReorderStagesDto) {
    return this.projects.reorderStages(dto);
  }

  @Patch('stages/:id')
  @RequirePermissions('tasks.manage')
  updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.projects.updateStage(id, dto);
  }

  @Delete('stages/:id')
  @RequirePermissions('tasks.manage')
  removeStage(@Param('id') id: string) {
    return this.projects.removeStage(id);
  }

  /* ── Tags ──────────────────────────────────────────── */

  @Get('tags')
  listTags() {
    return this.projects.tags();
  }

  // Quem edita tarefas pode criar uma tag na hora; renomear e excluir é gestão.
  @Post('tags')
  @RequireAnyPermission('tasks.manage', 'tasks.edit')
  createTag(@Body() dto: CreateTagDto) {
    return this.projects.createTag(dto);
  }

  @Patch('tags/:id')
  @RequirePermissions('tasks.manage')
  updateTag(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.projects.updateTag(id, dto);
  }

  @Delete('tags/:id')
  @RequirePermissions('tasks.manage')
  removeTag(@Param('id') id: string) {
    return this.projects.removeTag(id);
  }

  /* ── Comentários e anexos (rotas sem o id da tarefa) ── */

  @Patch('comments/:commentId')
  @RequirePermissions('tasks.comment')
  updateComment(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.comments.update(commentId, dto, user);
  }

  @Delete('comments/:commentId')
  @RequirePermissions('tasks.comment')
  removeComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.comments.remove(commentId, user);
  }

  @Delete('attachments/:attachmentId')
  @RequirePermissions('tasks.comment')
  removeAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attachments.remove(attachmentId, user);
  }

  /* ── Tarefas ───────────────────────────────────────── */

  @Get()
  list(@Query() filters: FilterTasksDto, @CurrentUser() user: AuthUser) {
    return this.tasks.list(filters, user.sub);
  }

  @Get('trash')
  @RequirePermissions('tasks.delete')
  trash() {
    return this.tasks.trash();
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasks.create(dto, user.sub);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.tasks.reorder(dto);
  }

  @Patch('bulk-update')
  bulkUpdate(@Body() dto: BulkUpdateDto, @CurrentUser() user: AuthUser) {
    return this.tasks.bulkUpdate(dto, user.sub);
  }

  @Post('bulk-delete')
  @RequirePermissions('tasks.delete')
  bulkDelete(@Body() dto: BulkIdsDto, @CurrentUser() user: AuthUser) {
    return this.tasks.bulkDelete(dto.ids, user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasks.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasks.update(id, dto, user.sub);
  }

  // tasks.edit também passa: é o que permite remover itens do checklist (o serviço exige
  // tasks.delete para excluir uma tarefa de verdade).
  @Delete(':id')
  @RequireAnyPermission('tasks.delete', 'tasks.edit')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasks.remove(id, user);
  }

  @Post(':id/restore')
  @RequirePermissions('tasks.delete')
  restore(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasks.restore(id, user.sub);
  }

  @Delete(':id/hard-delete')
  hardDelete(@Param('id') id: string) {
    return this.tasks.hardDelete(id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasks.duplicate(id, user.sub);
  }

  @Patch(':id/subtasks/reorder')
  reorderSubtasks(@Param('id') id: string, @Body() dto: ReorderDto) {
    return this.tasks.reorderSubtasks(id, dto);
  }

  @Get(':id/activities')
  activities(@Param('id') id: string) {
    return this.tasks.activities(id);
  }

  @Get(':id/comments')
  listComments(@Param('id') id: string) {
    return this.comments.list(id);
  }

  @Post(':id/comments')
  @RequirePermissions('tasks.comment')
  createComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.comments.create(id, dto, user);
  }

  @Get(':id/attachments')
  listAttachments(@Param('id') id: string) {
    return this.attachments.list(id);
  }

  @Post(':id/attachments')
  @RequirePermissions('tasks.comment')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    }),
  )
  addAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.attachments.add(id, file, user);
  }
}
