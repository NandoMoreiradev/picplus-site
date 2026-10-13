import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

/** O multer lê o nome do arquivo como latin1; reinterpreta os bytes como UTF-8 (acentos). */
const fileNameOf = (file: Express.Multer.File) => {
  const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
  return name.replace(/[\r\n\\/]/g, '_').slice(0, 180) || 'arquivo';
};

@Injectable()
export class TaskAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(taskId: string) {
    await this.requireTask(taskId);
    return this.prisma.taskAttachment.findMany({
      where: { taskId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(taskId: string, file: Express.Multer.File, user: AuthUser) {
    await this.requireTask(taskId);
    // Imagem, PDF ou vídeo: o tipo real é conferido pelo conteúdo do arquivo.
    const saved = await this.storage.saveAny(file, ['image', 'pdf', 'video']);
    const attachment = await this.prisma.taskAttachment.create({
      data: {
        taskId,
        uploadedById: user.sub,
        fileName: fileNameOf(file),
        fileType: saved.mime,
        fileSize: file.size,
        url: saved.url,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    await this.prisma.taskActivityLog.create({
      data: {
        taskId,
        userId: user.sub,
        action: 'ATTACHMENT_ADDED',
        description: `Anexo adicionado: ${attachment.fileName}`,
      },
    });
    return attachment;
  }

  async remove(attachmentId: string, user: AuthUser) {
    const attachment = await this.prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) throw new NotFoundException('Anexo não encontrado.');
    await this.prisma.taskAttachment.delete({ where: { id: attachmentId } });
    await this.storage.remove(attachment.url);
    await this.prisma.taskActivityLog.create({
      data: {
        taskId: attachment.taskId,
        userId: user.sub,
        action: 'UPDATED',
        description: `Anexo removido: ${attachment.fileName}`,
      },
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
}
