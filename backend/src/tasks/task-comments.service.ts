import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/task.dto';

const AUTHOR = {
  select: { id: true, name: true, avatarUrl: true },
} as const;

interface CommentNode {
  id: string;
  parentCommentId: string | null;
  isDeleted: boolean;
  content: string;
  replies: CommentNode[];
}

/** Monta a árvore de respostas a partir da lista plana (uma consulta só). */
function toTree<T extends Omit<CommentNode, 'replies'>>(rows: T[]) {
  type Node = T & { replies: Node[] };
  const byId = new Map<string, Node>(
    rows.map((row) => [row.id, { ...row, replies: [] }]),
  );
  const roots: Node[] = [];
  for (const node of byId.values()) {
    const parent = node.parentCommentId
      ? byId.get(node.parentCommentId)
      : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

/**
 * Comentário apagado que ainda tem respostas vira um marcador (sem texto); sem respostas, some.
 * O texto de um comentário apagado nunca sai da API.
 */
function prune<N extends CommentNode>(nodes: N[]): N[] {
  return nodes
    .map((node) => ({
      ...node,
      content: node.isDeleted ? '' : node.content,
      replies: prune(node.replies as N[]),
    }))
    .filter((node) => !node.isDeleted || node.replies.length > 0);
}

@Injectable()
export class TaskCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(taskId: string) {
    await this.requireTask(taskId);
    const rows = await this.prisma.taskComment.findMany({
      where: { taskId },
      include: { user: AUTHOR },
      orderBy: { createdAt: 'asc' },
    });
    return prune(toTree(rows));
  }

  async create(taskId: string, dto: CreateCommentDto, user: AuthUser) {
    await this.requireTask(taskId);
    if (dto.parentCommentId) {
      const parent = await this.prisma.taskComment.findFirst({
        where: { id: dto.parentCommentId, taskId },
        select: { id: true },
      });
      if (!parent) throw new NotFoundException('Comentário não encontrado.');
    }
    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        userId: user.sub,
        content: dto.content,
        parentCommentId: dto.parentCommentId,
      },
      include: { user: AUTHOR },
    });
    await this.prisma.taskActivityLog.create({
      data: {
        taskId,
        userId: user.sub,
        action: 'COMMENT_ADDED',
        description: 'Novo comentário',
      },
    });
    return { ...comment, replies: [] };
  }

  async update(commentId: string, dto: UpdateCommentDto, user: AuthUser) {
    const comment = await this.requireComment(commentId);
    // Só quem escreveu edita: o conteúdo é a "voz" da pessoa.
    if (comment.userId !== user.sub) {
      throw new ForbiddenException('Você só pode editar os seus comentários.');
    }
    const updated = await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { content: dto.content, isEdited: true },
      include: { user: AUTHOR },
    });
    return { ...updated, replies: [] };
  }

  async remove(commentId: string, user: AuthUser) {
    const comment = await this.requireComment(commentId);
    if (comment.userId !== user.sub && !user.permissions.has('tasks.delete')) {
      throw new ForbiddenException('Você não pode excluir este comentário.');
    }
    await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
    return { ok: true };
  }

  private async requireTask(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
  }

  private async requireComment(commentId: string) {
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, isDeleted: false },
    });
    if (!comment) throw new NotFoundException('Comentário não encontrado.');
    return comment;
  }
}
