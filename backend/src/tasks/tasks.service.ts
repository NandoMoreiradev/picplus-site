import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskActivityAction } from '@prisma/client';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  BulkUpdateDto,
  CreateTaskDto,
  FilterTasksDto,
  ReorderDto,
  UpdateTaskDto,
} from './dto/task.dto';

const PERSON = { select: { id: true, name: true } } as const;

/** Tudo que a listagem, o Kanban e o detalhe precisam de uma tarefa. */
const TASK_INCLUDE = {
  assignedTo: PERSON,
  createdBy: PERSON,
  coAssignees: { include: { user: PERSON } },
  project: { select: { id: true, name: true, color: true } },
  stage: { select: { id: true, name: true, color: true, isCompleted: true } },
  tags: { orderBy: { name: 'asc' } },
  parentTask: { select: { id: true, title: true } },
  // O filtro de exclusão lógica precisa ser repetido nas relações.
  subtasks: {
    where: { deletedAt: null },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      completedAt: true,
      priority: true,
      dueDate: true,
      assignedTo: PERSON,
    },
  },
  _count: {
    select: {
      comments: { where: { isDeleted: false } },
      attachments: true,
      subtasks: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.TaskInclude;

/** Teto de segurança da listagem (o painel carrega tudo de uma vez). */
const LIST_LIMIT = 3000;

type Changes = Record<string, unknown>;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /* ── Consulta ──────────────────────────────────────── */

  async list(filters: FilterTasksDto, userId: string) {
    const and: Prisma.TaskWhereInput[] = [
      { deletedAt: null, parentTaskId: null, project: { deletedAt: null } },
    ];

    if (filters.search) {
      and.push({
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }
    if (filters.projectId) and.push({ projectId: filters.projectId });
    if (filters.stageId) and.push({ stageId: filters.stageId });
    if (filters.priority?.length) {
      and.push({ priority: { in: filters.priority } });
    }
    if (filters.tags?.length) {
      and.push({ tags: { some: { id: { in: filters.tags } } } });
    }
    const personId = filters.mine ? userId : filters.assignedToId;
    if (personId) {
      and.push({
        OR: [
          { assignedToId: personId },
          { coAssignees: { some: { userId: personId } } },
        ],
      });
    }

    return this.prisma.task.findMany({
      where: { AND: and },
      include: TASK_INCLUDE,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      take: LIST_LIMIT,
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null, project: { deletedAt: null } },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    return task;
  }

  /** Pessoas que podem receber tarefas (usuários ativos). */
  assignableUsers() {
    return this.prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }

  activities(taskId: string) {
    return this.prisma.taskActivityLog.findMany({
      where: { taskId },
      include: { user: PERSON },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /* ── Criação ───────────────────────────────────────── */

  async create(dto: CreateTaskDto, userId: string) {
    const parent = dto.parentTaskId
      ? await this.requireParent(dto.parentTaskId)
      : null;

    // Item de checklist herda projeto e estágio da tarefa-pai.
    const projectId = parent?.projectId ?? dto.projectId;
    if (!projectId) throw new BadRequestException('Informe o projeto.');
    await this.requireProject(projectId);

    const stage = parent
      ? { id: parent.stageId, isCompleted: false }
      : await this.resolveStage(projectId, dto.stageId);
    await this.assertUsers([
      ...(dto.assignedToId ? [dto.assignedToId] : []),
      ...(dto.coAssigneeIds ?? []),
    ]);
    await this.assertTags(dto.tags);

    const last = await this.prisma.task.aggregate({
      where: { projectId, stageId: stage.id, parentTaskId: parent?.id ?? null },
      _max: { order: true },
    });

    const coAssigneeIds = [...new Set(dto.coAssigneeIds ?? [])].filter(
      (id) => id !== dto.assignedToId,
    );

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        priority: dto.priority,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedMinutes: dto.estimatedMinutes ?? null,
        completedAt: stage.isCompleted ? new Date() : null,
        order: (last._max.order ?? -1) + 1,
        projectId,
        stageId: stage.id,
        assignedToId: dto.assignedToId ?? null,
        createdById: userId,
        parentTaskId: parent?.id ?? null,
        tags: dto.tags?.length
          ? { connect: [...new Set(dto.tags)].map((id) => ({ id })) }
          : undefined,
        coAssignees: coAssigneeIds.length
          ? { create: coAssigneeIds.map((id) => ({ userId: id })) }
          : undefined,
      },
      include: TASK_INCLUDE,
    });

    await this.log(task.id, userId, 'CREATED', 'Tarefa criada');
    if (parent) {
      await this.log(
        parent.id,
        userId,
        'SUBTASK_ADDED',
        `Item de checklist adicionado: ${task.title}`,
      );
    }
    return task;
  }

  /* ── Edição ────────────────────────────────────────── */

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    const current = await this.prisma.task.findFirst({
      where: { id, deletedAt: null, project: { deletedAt: null } },
      include: {
        tags: true,
        coAssignees: { include: { user: PERSON } },
        stage: true,
        project: { select: { id: true, name: true } },
        assignedTo: PERSON,
      },
    });
    if (!current) throw new NotFoundException('Tarefa não encontrada.');

    const data: Prisma.TaskUncheckedUpdateInput = {};
    const changes: Changes = {};
    const note = (field: string, from: unknown, to: unknown) => {
      changes[field] = { old: from ?? null, new: to ?? null };
    };

    if (dto.title !== undefined && dto.title !== current.title) {
      data.title = dto.title;
      note('title', current.title, dto.title);
    }
    if (dto.description !== undefined) {
      const next = dto.description || null;
      if (next !== current.description) {
        data.description = next;
        note('description', 'texto anterior', 'texto atualizado');
      }
    }
    if (dto.priority !== undefined && dto.priority !== current.priority) {
      data.priority = dto.priority;
      note('priority', current.priority, dto.priority);
    }
    if (dto.estimatedMinutes !== undefined) {
      data.estimatedMinutes = dto.estimatedMinutes ?? null;
    }
    for (const field of ['startDate', 'dueDate'] as const) {
      if (dto[field] === undefined) continue;
      const next = dto[field] ? new Date(dto[field]) : null;
      if (next?.getTime() !== current[field]?.getTime()) {
        data[field] = next;
        note(field, current[field], next);
      }
    }

    if (dto.assignedToId !== undefined) {
      const next = dto.assignedToId ?? null;
      if (next !== current.assignedToId) {
        await this.assertUsers(next ? [next] : []);
        data.assignedToId = next;
        const nextName = next
          ? (await this.prisma.user.findUnique({ where: { id: next } }))?.name
          : null;
        note('assignedTo', current.assignedTo?.name, nextName);
      }
    }

    // Projeto e estágio: trocar de projeto leva a tarefa (e o checklist) à primeira coluna do destino.
    let movedStageId: string | null = null;
    if (!current.parentTaskId) {
      let requestedStageId = dto.stageId;
      const targetProjectId = dto.projectId ?? current.projectId;
      const projectChanged = targetProjectId !== current.projectId;
      if (projectChanged) await this.requireProject(targetProjectId);

      if (dto.completed !== undefined) {
        const wantDone = dto.completed;
        if (wantDone !== !!current.completedAt || projectChanged) {
          const stage = await this.stageForCompletion(
            targetProjectId,
            wantDone,
            projectChanged ? undefined : current.stageId,
          );
          requestedStageId = stage.id;
        }
      }

      if (
        projectChanged ||
        (requestedStageId && requestedStageId !== current.stageId)
      ) {
        const stage = await this.resolveStage(
          targetProjectId,
          requestedStageId,
        );
        const last = await this.prisma.task.aggregate({
          where: { projectId: targetProjectId, stageId: stage.id },
          _max: { order: true },
        });
        data.projectId = targetProjectId;
        data.stageId = stage.id;
        data.order = (last._max.order ?? -1) + 1;
        data.completedAt = stage.isCompleted
          ? (current.completedAt ?? new Date())
          : null;
        movedStageId = stage.id;
        if (projectChanged) {
          const project = await this.prisma.taskProject.findUnique({
            where: { id: targetProjectId },
            select: { name: true },
          });
          note('project', current.project.name, project?.name);
        }
        if (stage.id !== current.stageId) {
          note('stage', current.stage.name, stage.name);
        }
      } else if (
        dto.completed !== undefined &&
        dto.completed !== !!current.completedAt
      ) {
        // O projeto não tem estágio do tipo pedido: só marca a conclusão.
        data.completedAt = dto.completed ? new Date() : null;
      }
    } else if (dto.completed !== undefined) {
      // Item de checklist: só alterna a conclusão.
      data.completedAt = dto.completed ? new Date() : null;
    }

    // Colaboradores e tags: o diff mostra o que entrou e o que saiu.
    let coAssigneeIds: string[] | undefined;
    if (dto.coAssigneeIds !== undefined) {
      const assignee = (data.assignedToId ?? current.assignedToId) as
        | string
        | null;
      coAssigneeIds = [...new Set(dto.coAssigneeIds)].filter(
        (uid) => uid !== assignee,
      );
      await this.assertUsers(coAssigneeIds);
      const before = new Set(current.coAssignees.map((c) => c.userId));
      const after = new Set(coAssigneeIds);
      if (
        before.size !== after.size ||
        [...after].some((uid) => !before.has(uid))
      ) {
        const names = await this.prisma.user.findMany({
          where: { id: { in: [...after] } },
          select: { id: true, name: true },
        });
        note(
          'coAssignees',
          current.coAssignees.map((c) => c.user.name),
          names.map((n) => n.name),
        );
      }
    }

    let tagIds: string[] | undefined;
    if (dto.tags !== undefined) {
      tagIds = [...new Set(dto.tags)];
      await this.assertTags(tagIds);
      const before = new Set(current.tags.map((t) => t.id));
      if (
        before.size !== tagIds.length ||
        tagIds.some((tid) => !before.has(tid))
      ) {
        const names = await this.prisma.taskTag.findMany({
          where: { id: { in: tagIds } },
          select: { name: true },
        });
        note(
          'tags',
          current.tags.map((t) => t.name),
          names.map((n) => n.name),
        );
      }
    }

    // Conclusão de item de checklist ou da tarefa por estágio.
    const wasDone = !!current.completedAt;
    const willBeDone =
      'completedAt' in data ? data.completedAt !== null : wasDone;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (coAssigneeIds) {
        await tx.taskAssignee.deleteMany({ where: { taskId: id } });
        if (coAssigneeIds.length) {
          await tx.taskAssignee.createMany({
            data: coAssigneeIds.map((uid) => ({ taskId: id, userId: uid })),
          });
        }
      }
      // Levar a tarefa a outro projeto leva o checklist junto.
      if (data.projectId || movedStageId) {
        await tx.task.updateMany({
          where: { parentTaskId: id },
          data: {
            ...(data.projectId ? { projectId: data.projectId as string } : {}),
            ...(movedStageId ? { stageId: movedStageId } : {}),
          },
        });
      }
      return tx.task.update({
        where: { id },
        data: {
          ...data,
          ...(tagIds
            ? { tags: { set: tagIds.map((tid) => ({ id: tid })) } }
            : {}),
        },
        include: TASK_INCLUDE,
      });
    });

    if (wasDone !== willBeDone) {
      await this.log(
        id,
        userId,
        willBeDone ? 'COMPLETED' : 'REOPENED',
        willBeDone ? 'Tarefa concluída' : 'Tarefa reaberta',
        changes,
      );
    } else if (Object.keys(changes).length) {
      await this.log(id, userId, 'UPDATED', 'Tarefa atualizada', changes);
    }
    return updated;
  }

  /** Ordem manual das tarefas (arrastar dentro/entre colunas). */
  async reorder(dto: ReorderDto) {
    if (!dto.items.length) return { ok: true };
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.task.updateMany({
          where: {
            id: item.id,
            deletedAt: null,
            ...(dto.stageId ? { stageId: dto.stageId } : {}),
          },
          data: { order: item.order },
        }),
      ),
    );
    return { ok: true };
  }

  async reorderSubtasks(parentId: string, dto: ReorderDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.task.updateMany({
          where: { id: item.id, parentTaskId: parentId },
          data: { order: item.order },
        }),
      ),
    );
    return { ok: true };
  }

  async duplicate(id: string, userId: string) {
    const original = await this.prisma.task.findFirst({
      where: { id, deletedAt: null, parentTaskId: null },
      include: { tags: true, coAssignees: true },
    });
    if (!original) throw new NotFoundException('Tarefa não encontrada.');

    const last = await this.prisma.task.aggregate({
      where: { projectId: original.projectId, stageId: original.stageId },
      _max: { order: true },
    });
    const copy = await this.prisma.task.create({
      data: {
        title: `${original.title} (cópia)`,
        description: original.description,
        priority: original.priority,
        startDate: original.startDate,
        dueDate: original.dueDate,
        estimatedMinutes: original.estimatedMinutes,
        projectId: original.projectId,
        stageId: original.stageId,
        order: (last._max.order ?? -1) + 1,
        assignedToId: original.assignedToId,
        createdById: userId,
        tags: { connect: original.tags.map((t) => ({ id: t.id })) },
        coAssignees: {
          create: original.coAssignees.map((c) => ({ userId: c.userId })),
        },
      },
      include: TASK_INCLUDE,
    });
    await this.log(
      copy.id,
      userId,
      'CREATED',
      `Duplicada de: ${original.title}`,
    );
    return copy;
  }

  /* ── Ações em massa ────────────────────────────────── */

  async bulkUpdate(dto: BulkUpdateDto, userId: string) {
    const { ids, ...patch } = dto;
    const errors: { id: string; message: string }[] = [];
    let count = 0;
    for (const id of ids) {
      try {
        await this.update(id, patch, userId);
        count += 1;
      } catch (error) {
        errors.push({ id, message: (error as Error).message });
      }
    }
    return { count, errors };
  }

  async bulkDelete(ids: string[], userId: string) {
    let count = 0;
    for (const id of ids) {
      if (await this.softDelete(id, userId)) count += 1;
    }
    return { count };
  }

  /* ── Lixeira ───────────────────────────────────────── */

  /**
   * Excluir uma tarefa exige tasks.delete; remover um item de checklist, só tasks.edit
   * (quem edita a tarefa mantém o checklist dela).
   */
  async remove(id: string, user: AuthUser) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      select: { parentTaskId: true },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    if (!task.parentTaskId && !user.permissions.has('tasks.delete')) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir tarefas.',
      );
    }
    await this.softDelete(id, user.sub);
    return { ok: true };
  }

  /**
   * Leva a tarefa e seu checklist à lixeira com o MESMO instante, para que restaurar
   * devolva só o que caiu junto (e não itens excluídos antes).
   */
  private async softDelete(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, title: true, parentTaskId: true },
    });
    if (!task) return false;
    const now = new Date();
    await this.prisma.task.updateMany({
      where: { OR: [{ id }, { parentTaskId: id }], deletedAt: null },
      data: { deletedAt: now },
    });
    await this.log(id, userId, 'DELETED', 'Tarefa movida para a lixeira');
    return true;
  }

  /**
   * Itens excluídos. Item de checklist só aparece se foi excluído sozinho, e tarefas de um
   * projeto na lixeira voltam junto com o projeto (não aparecem aqui).
   */
  trash() {
    return this.prisma.task.findMany({
      where: {
        deletedAt: { not: null },
        project: { deletedAt: null },
        OR: [{ parentTaskId: null }, { parentTask: { deletedAt: null } }],
      },
      select: {
        id: true,
        title: true,
        deletedAt: true,
        priority: true,
        parentTask: { select: { id: true, title: true } },
        project: { select: { id: true, name: true, color: true } },
        createdBy: PERSON,
      },
      orderBy: { deletedAt: 'desc' },
      take: 300,
    });
  }

  async restore(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: { not: null } },
      select: {
        deletedAt: true,
        project: { select: { deletedAt: true } },
        parentTask: { select: { deletedAt: true } },
      },
    });
    if (!task?.deletedAt) throw new NotFoundException('Tarefa não encontrada.');
    if (task.project.deletedAt) {
      throw new BadRequestException(
        'O projeto desta tarefa está na lixeira. Restaure o projeto primeiro.',
      );
    }
    if (task.parentTask?.deletedAt) {
      throw new BadRequestException(
        'A tarefa deste item está na lixeira. Restaure a tarefa primeiro.',
      );
    }
    await this.prisma.task.updateMany({
      where: {
        deletedAt: task.deletedAt,
        OR: [{ id }, { parentTaskId: id }],
      },
      data: { deletedAt: null },
    });
    await this.log(id, userId, 'RESTORED', 'Tarefa restaurada');
    return this.findOne(id);
  }

  /** Exclusão definitiva: só do que já está na lixeira. Apaga também os arquivos anexados. */
  async hardDelete(id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: { not: null } },
      select: {
        id: true,
        attachments: { select: { url: true } },
        subtasks: { select: { attachments: { select: { url: true } } } },
      },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');

    const urls = [
      ...task.attachments.map((a) => a.url),
      ...task.subtasks.flatMap((s) => s.attachments.map((a) => a.url)),
    ];
    await this.prisma.task.delete({ where: { id } });
    await Promise.all(urls.map((url) => this.storage.remove(url)));
    return { ok: true };
  }

  /* ── Auxiliares ────────────────────────────────────── */

  private async log(
    taskId: string,
    userId: string,
    action: TaskActivityAction,
    description: string,
    changes?: Changes,
  ) {
    await this.prisma.taskActivityLog.create({
      data: {
        taskId,
        userId,
        action,
        description,
        changes:
          changes && Object.keys(changes).length
            ? (changes as Prisma.InputJsonValue)
            : undefined,
      },
    });
  }

  private async requireParent(parentTaskId: string) {
    const parent = await this.prisma.task.findFirst({
      where: { id: parentTaskId, deletedAt: null },
      select: { id: true, projectId: true, stageId: true, parentTaskId: true },
    });
    if (!parent) throw new NotFoundException('Tarefa-pai não encontrada.');
    if (parent.parentTaskId) {
      throw new BadRequestException(
        'Um item de checklist não pode ter outros itens dentro dele.',
      );
    }
    return parent;
  }

  private async requireProject(projectId: string) {
    const project = await this.prisma.taskProject.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
  }

  /** O estágio pedido (do projeto) ou, na falta dele, o primeiro da fila. */
  private async resolveStage(projectId: string, stageId?: string) {
    const stage = stageId
      ? await this.prisma.taskStage.findFirst({
          where: { id: stageId, projectId },
        })
      : await this.prisma.taskStage.findFirst({
          where: { projectId },
          orderBy: { order: 'asc' },
        });
    if (!stage) {
      throw new BadRequestException(
        stageId
          ? 'O estágio não pertence a este projeto.'
          : 'O projeto não tem estágios. Crie ao menos um nas configurações.',
      );
    }
    return stage;
  }

  /**
   * Estágio para concluir (o primeiro marcado como "concluído") ou reabrir (o primeiro
   * em aberto). Se o projeto não tiver o tipo pedido, mantém a coluna atual.
   */
  private async stageForCompletion(
    projectId: string,
    done: boolean,
    currentStageId?: string,
  ) {
    const wanted = await this.prisma.taskStage.findFirst({
      where: { projectId, isCompleted: done },
      orderBy: { order: 'asc' },
    });
    if (wanted) return wanted;
    return this.resolveStage(projectId, currentStageId);
  }

  private async assertUsers(ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return;
    const found = await this.prisma.user.count({
      where: { id: { in: unique }, active: true },
    });
    if (found !== unique.length) {
      throw new BadRequestException('Uma das pessoas informadas não existe.');
    }
  }

  private async assertTags(ids?: string[]) {
    const unique = [...new Set(ids ?? [])];
    if (!unique.length) return;
    const found = await this.prisma.taskTag.count({
      where: { id: { in: unique } },
    });
    if (found !== unique.length) {
      throw new NotFoundException('Uma das tags informadas não existe.');
    }
  }
}
