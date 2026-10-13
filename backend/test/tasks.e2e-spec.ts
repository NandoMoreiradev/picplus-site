import { PGlite } from '@electric-sql/pglite';
import { PrismaClient } from '@prisma/client';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AuthUser } from '../src/common/decorators/current-user.decorator';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { StorageService } from '../src/storage/storage.service';
import { TaskAttachmentsService } from '../src/tasks/task-attachments.service';
import { TaskCommentsService } from '../src/tasks/task-comments.service';
import { TaskProjectsService } from '../src/tasks/task-projects.service';
import { TasksService } from '../src/tasks/tasks.service';

/**
 * Gestão de tarefas contra um PostgreSQL de verdade (PGlite, em memória), com as migrações
 * reais do projeto. Cobre as regras que um banco "mockado" não pegaria: exclusões em
 * cascata, lixeira com restauração, chaves únicas e relações.
 */
describe('Gestão de tarefas (integração, PGlite)', () => {
  let db: PGlite;
  let prisma: PrismaClient;
  let tasks: TasksService;
  let projects: TaskProjectsService;
  let comments: TaskCommentsService;
  let attachments: TaskAttachmentsService;
  const removedFiles: string[] = [];

  const storage = {
    saveAny: (file: { originalname: string }) =>
      Promise.resolve({
        url: `/uploads/${file.originalname}`,
        mime: 'image/png',
      }),
    remove: (url: string) => {
      removedFiles.push(url);
      return Promise.resolve();
    },
  };

  const asUser = (id: string, extra: string[] = []): AuthUser => ({
    sub: id,
    email: `${id}@x.com`,
    name: id,
    isOwner: false,
    roleId: null,
    roleName: null,
    permissions: new Set(['tasks.comment', ...extra]),
  });

  let ana: { id: string };
  let bia: { id: string };
  let cadu: { id: string };

  beforeAll(async () => {
    db = new PGlite();
    const dir = join(__dirname, '../prisma/migrations');
    for (const name of readdirSync(dir).sort()) {
      const file = join(dir, name, 'migration.sql');
      try {
        await db.exec(readFileSync(file, 'utf8'));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    prisma = new PrismaClient({ adapter: new PrismaPGlite(db) });
    const service = prisma as unknown as PrismaService;
    const files = storage as unknown as StorageService;
    tasks = new TasksService(service, files);
    projects = new TaskProjectsService(service, files);
    comments = new TaskCommentsService(service);
    attachments = new TaskAttachmentsService(service, files);

    const user = (name: string, active = true) =>
      prisma.user.create({
        data: { email: `${name}@x.com`, password: 'x', name, active },
      });
    ana = await user('Ana');
    bia = await user('Bia');
    cadu = await user('Cadu', false);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await db.close();
  });

  // Estado compartilhado entre os testes (cada um continua de onde o anterior parou).
  let project: Awaited<ReturnType<TaskProjectsService['create']>>;
  let todo: { id: string };
  let doing: { id: string };
  let done: { id: string };
  let tag: { id: string };
  let t1: Awaited<ReturnType<TasksService['create']>>;
  let t2: Awaited<ReturnType<TasksService['create']>>;
  let t3: Awaited<ReturnType<TasksService['create']>>;
  let s1: Awaited<ReturnType<TasksService['create']>>;
  let s2: Awaited<ReturnType<TasksService['create']>>;

  it('cria projeto com os 3 estágios padrão e nome único (sem diferenciar maiúsculas)', async () => {
    project = await projects.create({ name: 'Campanha Verão' }, ana.id);
    expect(project.stages.map((s) => s.name)).toEqual([
      'A fazer',
      'Em andamento',
      'Concluído',
    ]);
    [todo, doing, done] = project.stages;
    await expect(
      projects.create({ name: 'campanha verão' }, ana.id),
    ).rejects.toThrow(/já existe/i);
  });

  it('cria tags e recusa nome repetido', async () => {
    tag = await projects.createTag({ name: 'Urgente', color: '#ff0000' });
    await expect(projects.createTag({ name: 'URGENTE' })).rejects.toThrow(
      /já existe/i,
    );
  });

  it('cria tarefas: estágio padrão, colaboradores sem repetir o responsável, ordem no fim', async () => {
    t1 = await tasks.create(
      {
        title: 'Briefing',
        projectId: project.id,
        assignedToId: ana.id,
        coAssigneeIds: [bia.id, ana.id],
        tags: [tag.id],
        dueDate: '2020-01-01T00:00:00.000Z',
      },
      ana.id,
    );
    expect(t1.stageId).toBe(todo.id);
    expect(t1.coAssignees).toHaveLength(1);
    expect(t1.tags).toHaveLength(1);
    expect(t1.completedAt).toBeNull();

    t2 = await tasks.create(
      { title: 'Roteiro', projectId: project.id, stageId: doing.id },
      ana.id,
    );
    t3 = await tasks.create({ title: 'Edição', projectId: project.id }, bia.id);
    expect(t3.order).toBeGreaterThan(t1.order);

    await expect(
      tasks.create(
        { title: 'x', projectId: project.id, assignedToId: cadu.id },
        ana.id,
      ),
    ).rejects.toThrow(/não existe/);
    await expect(tasks.create({ title: 'x' }, ana.id)).rejects.toThrow(
      /projeto/i,
    );
  });

  it('checklist: herda o projeto, não aninha, alterna conclusão e reordena', async () => {
    s1 = await tasks.create({ title: 'Item A', parentTaskId: t1.id }, ana.id);
    s2 = await tasks.create({ title: 'Item B', parentTaskId: t1.id }, ana.id);
    expect(s1.projectId).toBe(project.id);
    await expect(
      tasks.create({ title: 'neto', parentTaskId: s1.id }, ana.id),
    ).rejects.toThrow(/dentro dele/);

    const list = await tasks.list({}, ana.id);
    expect(list).toHaveLength(3); // o checklist não aparece na listagem
    const listed = list.find((t) => t.id === t1.id);
    expect(listed?.subtasks).toHaveLength(2);
    expect(listed?._count.subtasks).toBe(2);

    await tasks.update(s1.id, { completed: true }, ana.id);
    let item = (await tasks.findOne(t1.id)).subtasks.find(
      (s) => s.id === s1.id,
    );
    expect(item?.completedAt).not.toBeNull();
    await tasks.update(s1.id, { completed: false }, ana.id);
    item = (await tasks.findOne(t1.id)).subtasks.find((s) => s.id === s1.id);
    expect(item?.completedAt).toBeNull();

    await tasks.reorderSubtasks(t1.id, {
      items: [
        { id: s1.id, order: 5 },
        { id: s2.id, order: 1 },
      ],
    });
    expect((await tasks.findOne(t1.id)).subtasks.map((s) => s.title)).toEqual([
      'Item B',
      'Item A',
    ]);
  });

  it('filtra por pessoa, busca, tag, prioridade e estágio', async () => {
    expect(await tasks.list({ mine: true }, bia.id)).toHaveLength(1);
    expect(await tasks.list({ mine: true }, ana.id)).toHaveLength(1);
    expect(await tasks.list({ assignedToId: bia.id }, ana.id)).toHaveLength(1);
    expect(await tasks.list({ search: 'roteiro' }, ana.id)).toHaveLength(1);
    expect(await tasks.list({ tags: [tag.id] }, ana.id)).toHaveLength(1);
    expect(await tasks.list({ priority: ['URGENT'] }, ana.id)).toHaveLength(0);
    expect(await tasks.list({ stageId: doing.id }, ana.id)).toHaveLength(1);
  });

  it('mover para estágio concluído conclui; reabrir volta ao primeiro em aberto; histórico com nomes', async () => {
    const moved = await tasks.update(t1.id, { stageId: done.id }, ana.id);
    expect(moved.completedAt).not.toBeNull();

    const reopened = await tasks.update(t1.id, { completed: false }, ana.id);
    expect(reopened.completedAt).toBeNull();
    expect(reopened.stageId).toBe(todo.id);

    const finished = await tasks.update(t2.id, { completed: true }, ana.id);
    expect(finished.stageId).toBe(done.id);
    expect(finished.completedAt).not.toBeNull();

    const log = await tasks.activities(t1.id);
    const actions = log.map((a) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining(['CREATED', 'COMPLETED', 'REOPENED']),
    );
    const completed = log.find((a) => a.action === 'COMPLETED');
    expect(completed?.changes).toMatchObject({
      stage: { old: 'A fazer', new: 'Concluído' },
    });
  });

  it('edita campos, colaboradores e tags, e limpa tudo', async () => {
    const edited = await tasks.update(
      t3.id,
      {
        title: 'Edição final',
        priority: 'URGENT',
        assignedToId: bia.id,
        coAssigneeIds: [ana.id],
        tags: [tag.id],
        dueDate: null,
        description: '<p>oi</p>',
      },
      ana.id,
    );
    expect(edited.title).toBe('Edição final');
    expect(edited.priority).toBe('URGENT');
    expect(edited.coAssignees[0].userId).toBe(ana.id);
    expect(edited.tags[0].id).toBe(tag.id);

    await tasks.update(
      t3.id,
      { assignedToId: null, tags: [], coAssigneeIds: [] },
      ana.id,
    );
    const cleared = await tasks.findOne(t3.id);
    expect(cleared.assignedToId).toBeNull();
    expect(cleared.tags).toHaveLength(0);
    expect(cleared.coAssignees).toHaveLength(0);
  });

  it('reordena e muda de projeto levando o checklist para a primeira coluna do destino', async () => {
    await tasks.reorder({
      items: [
        { id: t3.id, order: 0 },
        { id: t1.id, order: 1 },
      ],
    });
    expect((await tasks.findOne(t3.id)).order).toBe(0);

    const other = await projects.create({ name: 'Outro projeto' }, ana.id);
    const moved = await tasks.update(t1.id, { projectId: other.id }, ana.id);
    expect(moved.projectId).toBe(other.id);
    expect(moved.stageId).toBe(other.stages[0].id);
    const kids = await prisma.task.findMany({ where: { parentTaskId: t1.id } });
    expect(
      kids.every(
        (k) => k.projectId === other.id && k.stageId === other.stages[0].id,
      ),
    ).toBe(true);
    // estágio de outro projeto é recusado
    await expect(
      tasks.update(t1.id, { stageId: todo.id }, ana.id),
    ).rejects.toThrow(/não pertence/);

    const copy = await tasks.duplicate(t1.id, bia.id);
    expect(copy.title).toBe('Briefing (cópia)');
    expect(copy.projectId).toBe(other.id);
    expect(copy.tags).toHaveLength(1);
  });

  it('lixeira de tarefa: restaura em cascata e trata item de checklist isolado', async () => {
    const all = asUser(ana.id, ['tasks.delete']);
    await tasks.remove(t1.id, all);
    expect((await tasks.list({}, ana.id)).find((t) => t.id === t1.id)).toBe(
      undefined,
    );
    await expect(tasks.findOne(t1.id)).rejects.toThrow(/não encontrada/);
    expect((await tasks.trash()).map((t) => t.title)).toContain('Briefing');

    const restored = await tasks.restore(t1.id, ana.id);
    expect(restored.subtasks).toHaveLength(2); // o checklist volta junto
    expect((await tasks.trash()).map((t) => t.title)).not.toContain('Briefing');

    // item excluído antes do pai só volta quando restaurado sozinho
    await tasks.remove(s1.id, all);
    await tasks.remove(t1.id, all);
    await tasks.restore(t1.id, ana.id);
    expect((await tasks.findOne(t1.id)).subtasks).toHaveLength(1);
    await tasks.restore(s1.id, ana.id);
    expect((await tasks.findOne(t1.id)).subtasks).toHaveLength(2);
  });

  it('exclusão: tarefa exige tasks.delete; item de checklist, só tasks.edit', async () => {
    const editor = asUser(bia.id, ['tasks.edit']);
    await expect(tasks.remove(t3.id, editor)).rejects.toThrow(/permissão/);
    await expect(tasks.remove(s2.id, editor)).resolves.toEqual({ ok: true });
    await tasks.restore(s2.id, ana.id);
  });

  it('comentários em fio: edição só do autor, exclusão lógica e contador', async () => {
    const c1 = await comments.create(
      t1.id,
      { content: '<p>Primeiro</p>' },
      asUser(ana.id),
    );
    const c2 = await comments.create(
      t1.id,
      { content: '<p>Resposta</p>', parentCommentId: c1.id },
      asUser(bia.id),
    );
    const c3 = await comments.create(
      t1.id,
      { content: '<p>Neta</p>', parentCommentId: c2.id },
      asUser(ana.id),
    );
    let tree = await comments.list(t1.id);
    expect(tree).toHaveLength(1);
    expect(tree[0].replies[0].replies[0].id).toBe(c3.id);

    await expect(
      comments.update(c1.id, { content: 'x' }, asUser(bia.id)),
    ).rejects.toThrow(/só pode editar/);
    expect(
      (
        await comments.update(
          c1.id,
          { content: '<p>Editado</p>' },
          asUser(ana.id),
        )
      ).isEdited,
    ).toBe(true);

    await expect(comments.remove(c2.id, asUser(ana.id))).rejects.toThrow(
      /não pode excluir/,
    );
    await comments.remove(c2.id, asUser(ana.id, ['tasks.delete']));
    tree = await comments.list(t1.id);
    expect(tree[0].replies[0].content).toBe(''); // marcador, sem o texto
    expect(tree[0].replies[0].replies).toHaveLength(1);

    await comments.remove(c3.id, asUser(ana.id));
    tree = await comments.list(t1.id);
    expect(tree[0].replies).toHaveLength(0);
    const listed = (await tasks.list({}, ana.id)).find((t) => t.id === t1.id);
    expect(listed?._count.comments).toBe(1);
  });

  it('anexos: envio, listagem e remoção apaga o arquivo', async () => {
    const file = {
      originalname: 'Proposta.png',
      size: 10,
      buffer: Buffer.from('x'),
    } as Express.Multer.File;
    const attachment = await attachments.add(t1.id, file, asUser(ana.id));
    expect(attachment.fileName).toBe('Proposta.png');
    expect(await attachments.list(t1.id)).toHaveLength(1);
    await attachments.remove(attachment.id, asUser(ana.id));
    expect(removedFiles).toContain('/uploads/Proposta.png');
    expect(await attachments.list(t1.id)).toHaveLength(0);
  });

  it('ações em massa: atualizar e excluir', async () => {
    const bulk = await tasks.bulkUpdate(
      { ids: [t3.id, t2.id], priority: 'LOW' },
      ana.id,
    );
    expect(bulk.count).toBe(2);
    expect((await tasks.findOne(t3.id)).priority).toBe('LOW');
    expect((await tasks.bulkDelete([t3.id, t2.id], ana.id)).count).toBe(2);
  });

  it('estágios: criar, editar, reordenar e bloqueios de exclusão', async () => {
    const extra = await projects.createStage({
      projectId: project.id,
      name: 'Revisão',
      color: '#a855f7',
    });
    expect(extra.order).toBe(3);
    await projects.updateStage(extra.id, { name: 'Em revisão' });
    await projects.reorderStages({
      items: [
        { id: extra.id, order: 1 },
        { id: doing.id, order: 3 },
      ],
    });
    expect((await projects.stages(project.id))[1].name).toBe('Em revisão');
    await expect(projects.removeStage(done.id)).rejects.toThrow(
      /ainda tem tarefas/,
    );
    await projects.removeStage(extra.id);

    const alone = await projects.create({ name: 'Solitário' }, ana.id);
    await projects.removeStage(alone.stages[0].id);
    await projects.removeStage(alone.stages[1].id);
    await expect(projects.removeStage(alone.stages[2].id)).rejects.toThrow(
      /ao menos um estágio/,
    );
  });

  it('projetos: fixar, duplicar, lixeira com tarefas e restauração', async () => {
    const [other] = (await projects.list()).filter(
      (p) => p.name === 'Outro projeto',
    );
    expect((await projects.togglePin(other.id)).isPinned).toBe(true);
    expect((await projects.list())[0].id).toBe(other.id);

    const copy = await projects.duplicate(project.id, bia.id);
    expect(copy.name).toBe('Campanha Verão (cópia)');
    expect(copy.stages).toHaveLength(3);
    expect((await projects.duplicate(project.id, bia.id)).name).toBe(
      'Campanha Verão (cópia 2)',
    );

    await projects.remove(other.id);
    expect((await projects.list()).find((p) => p.id === other.id)).toBe(
      undefined,
    );
    expect(
      (await tasks.list({}, ana.id)).filter((t) => t.projectId === other.id),
    ).toHaveLength(0);
    expect(
      (await tasks.trash()).filter((t) => t.project.id === other.id),
    ).toHaveLength(0); // voltam com o projeto, não aparecem soltas
    expect(await projects.trash()).toHaveLength(1);

    const inside = await prisma.task.findFirstOrThrow({
      where: { projectId: other.id, parentTaskId: null },
    });
    await expect(tasks.restore(inside.id, ana.id)).rejects.toThrow(/projeto/i);

    // o nome de um projeto na lixeira fica livre; restaurar com o nome ocupado é recusado
    const squatter = await projects.create({ name: 'Outro projeto' }, ana.id);
    await expect(projects.restore(other.id)).rejects.toThrow(
      /já existe outro projeto/i,
    );
    await projects.remove(squatter.id);
    await projects.hardDelete(squatter.id);

    await projects.restore(other.id);
    expect(
      (await tasks.list({}, ana.id)).some((t) => t.projectId === other.id),
    ).toBe(true);
  });

  it('exclusão definitiva só do que está na lixeira, e remover usuário preserva o conteúdo', async () => {
    const [other] = (await projects.list()).filter(
      (p) => p.name === 'Outro projeto',
    );
    await projects.remove(other.id);
    await projects.hardDelete(other.id);
    expect(await prisma.task.count({ where: { projectId: other.id } })).toBe(0);
    expect(
      await prisma.taskStage.count({ where: { projectId: other.id } }),
    ).toBe(0);

    // t1 está em "Outro projeto": já foi apagada junto. Uma tarefa viva não pode ser apagada de vez.
    const live = await tasks.create(
      { title: 'Da Bia', projectId: project.id, assignedToId: bia.id },
      bia.id,
    );
    await expect(tasks.hardDelete(live.id)).rejects.toThrow(/não encontrada/);
    await comments.create(live.id, { content: '<p>oi</p>' }, asUser(bia.id));

    await prisma.user.delete({ where: { id: bia.id } });
    const after = await tasks.findOne(live.id);
    expect(after.createdBy).toBeNull();
    expect(after.assignedTo).toBeNull();
    expect((await comments.list(live.id))[0].user).toBeNull();
  });
});
