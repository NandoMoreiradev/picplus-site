import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateProjectDto,
  CreateStageDto,
  CreateTagDto,
  ReorderStagesDto,
  UpdateProjectDto,
  UpdateStageDto,
  UpdateTagDto,
} from './dto/project.dto';

/** Colunas iniciais de todo projeto novo. */
const DEFAULT_STAGES = [
  { name: 'A fazer', color: '#737373', isCompleted: false },
  { name: 'Em andamento', color: '#38bdf8', isCompleted: false },
  { name: 'Concluído', color: '#22c55e', isCompleted: true },
];

const PROJECT_INCLUDE = {
  owner: { select: { id: true, name: true } },
  stages: {
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
      color: true,
      order: true,
      isCompleted: true,
    },
  },
  _count: {
    select: { tasks: { where: { deletedAt: null, parentTaskId: null } } },
  },
} as const;

@Injectable()
export class TaskProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /* ── Projetos ──────────────────────────────────────── */

  list() {
    return this.prisma.taskProject.findMany({
      where: { deletedAt: null },
      include: PROJECT_INCLUDE,
      orderBy: [{ isPinned: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateProjectDto, userId: string) {
    await this.assertNameFree(dto.name);
    return this.prisma.taskProject.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        color: dto.color,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        ownerId: userId,
        stages: {
          create: DEFAULT_STAGES.map((stage, order) => ({ ...stage, order })),
        },
      },
      include: PROJECT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.requireProject(id);
    if (dto.name && dto.name.toLowerCase() !== project.name.toLowerCase()) {
      await this.assertNameFree(dto.name, id);
    }
    return this.prisma.taskProject.update({
      where: { id },
      data: {
        name: dto.name,
        description:
          dto.description === undefined ? undefined : dto.description || null,
        color: dto.color,
        status: dto.status,
        startDate:
          dto.startDate === undefined
            ? undefined
            : dto.startDate
              ? new Date(dto.startDate)
              : null,
        endDate:
          dto.endDate === undefined
            ? undefined
            : dto.endDate
              ? new Date(dto.endDate)
              : null,
      },
      include: PROJECT_INCLUDE,
    });
  }

  async togglePin(id: string) {
    const project = await this.requireProject(id);
    return this.prisma.taskProject.update({
      where: { id },
      data: { isPinned: !project.isPinned },
      include: PROJECT_INCLUDE,
    });
  }

  /** Copia o projeto e seus estágios (sem as tarefas). */
  async duplicate(id: string, userId: string) {
    const original = await this.prisma.taskProject.findFirst({
      where: { id, deletedAt: null },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    if (!original) throw new NotFoundException('Projeto não encontrado.');

    let name = `${original.name} (cópia)`;
    for (let n = 2; await this.nameTaken(name); n += 1) {
      name = `${original.name} (cópia ${n})`;
    }
    return this.prisma.taskProject.create({
      data: {
        name,
        description: original.description,
        color: original.color,
        startDate: original.startDate,
        endDate: original.endDate,
        ownerId: userId,
        stages: {
          create: original.stages.map((s) => ({
            name: s.name,
            color: s.color,
            order: s.order,
            isCompleted: s.isCompleted,
          })),
        },
      },
      include: PROJECT_INCLUDE,
    });
  }

  /** Projeto e tarefas vão à lixeira com o mesmo instante: restaurar devolve só o que caiu junto. */
  async remove(id: string) {
    await this.requireProject(id);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.taskProject.update({
        where: { id },
        data: { deletedAt: now },
      }),
      this.prisma.task.updateMany({
        where: { projectId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);
    return { ok: true };
  }

  trash() {
    return this.prisma.taskProject.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        name: true,
        color: true,
        deletedAt: true,
        owner: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async restore(id: string) {
    const project = await this.prisma.taskProject.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!project?.deletedAt) {
      throw new NotFoundException('Projeto não encontrado na lixeira.');
    }
    if (await this.nameTaken(project.name)) {
      throw new ConflictException(
        'Já existe outro projeto com este nome. Renomeie-o antes de restaurar.',
      );
    }
    await this.prisma.$transaction([
      this.prisma.taskProject.update({
        where: { id },
        data: { deletedAt: null },
      }),
      this.prisma.task.updateMany({
        where: { projectId: id, deletedAt: project.deletedAt },
        data: { deletedAt: null },
      }),
    ]);
    return this.prisma.taskProject.findUnique({
      where: { id },
      include: PROJECT_INCLUDE,
    });
  }

  /** Só do que já está na lixeira; apaga também os arquivos anexados às tarefas. */
  async hardDelete(id: string) {
    const project = await this.prisma.taskProject.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Projeto não encontrado na lixeira.');
    }
    const files = await this.prisma.taskAttachment.findMany({
      where: { task: { projectId: id } },
      select: { url: true },
    });
    await this.prisma.taskProject.delete({ where: { id } });
    await Promise.all(files.map((file) => this.storage.remove(file.url)));
    return { ok: true };
  }

  /* ── Estágios ──────────────────────────────────────── */

  stages(projectId: string) {
    return this.prisma.taskStage.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });
  }

  async createStage(dto: CreateStageDto) {
    await this.requireProject(dto.projectId);
    const last = await this.prisma.taskStage.aggregate({
      where: { projectId: dto.projectId },
      _max: { order: true },
    });
    return this.prisma.taskStage.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        color: dto.color,
        isCompleted: dto.isCompleted ?? false,
        order: (last._max.order ?? -1) + 1,
      },
    });
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    const stage = await this.prisma.taskStage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('Estágio não encontrado.');
    return this.prisma.taskStage.update({ where: { id }, data: dto });
  }

  async reorderStages(dto: ReorderStagesDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.taskStage.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
    return { ok: true };
  }

  async removeStage(id: string) {
    const stage = await this.prisma.taskStage.findUnique({
      where: { id },
      include: { _count: { select: { tasks: true } } },
    });
    if (!stage) throw new NotFoundException('Estágio não encontrado.');
    if (stage._count.tasks > 0) {
      throw new BadRequestException(
        'Este estágio ainda tem tarefas (inclusive na lixeira). Mova-as para outro estágio antes de excluir.',
      );
    }
    const siblings = await this.prisma.taskStage.count({
      where: { projectId: stage.projectId },
    });
    if (siblings <= 1) {
      throw new BadRequestException(
        'O projeto precisa de ao menos um estágio.',
      );
    }
    await this.prisma.taskStage.delete({ where: { id } });
    return { ok: true };
  }

  /* ── Tags ──────────────────────────────────────────── */

  tags() {
    return this.prisma.taskTag.findMany({ orderBy: { name: 'asc' } });
  }

  async createTag(dto: CreateTagDto) {
    await this.assertTagFree(dto.name);
    return this.prisma.taskTag.create({ data: dto });
  }

  async updateTag(id: string, dto: UpdateTagDto) {
    const tag = await this.prisma.taskTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag não encontrada.');
    if (dto.name && dto.name.toLowerCase() !== tag.name.toLowerCase()) {
      await this.assertTagFree(dto.name);
    }
    return this.prisma.taskTag.update({ where: { id }, data: dto });
  }

  async removeTag(id: string) {
    const tag = await this.prisma.taskTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag não encontrada.');
    await this.prisma.taskTag.delete({ where: { id } });
    return { ok: true };
  }

  /* ── Auxiliares ────────────────────────────────────── */

  private async requireProject(id: string) {
    const project = await this.prisma.taskProject.findFirst({
      where: { id, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  private async nameTaken(name: string, exceptId?: string) {
    const found = await this.prisma.taskProject.findFirst({
      where: {
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    return !!found;
  }

  private async assertNameFree(name: string, exceptId?: string) {
    if (await this.nameTaken(name, exceptId)) {
      throw new ConflictException('Já existe um projeto com este nome.');
    }
  }

  private async assertTagFree(name: string) {
    const found = await this.prisma.taskTag.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (found) throw new ConflictException('Já existe uma tag com este nome.');
  }
}
