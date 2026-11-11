import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import styled from 'styled-components';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Smartphone,
  Monitor,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  CellMain,
  DetailList,
  FormStack,
  IconButton,
  PageHeader,
  Panel,
  RowActions,
  StatusPill,
  Table,
  TableWrap,
  Tabs,
  Toolbar,
} from '../../components/admin/AdminUI';
import { Button } from '../../components/ui/Button';
import {
  Alert,
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../components/ui/Feedback';
import {
  FormGrid,
  SelectField,
  Switch,
  TextArea,
  TextField,
} from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { useFetch } from '../../hooks/useFetch';
import {
  EMAIL_LOG_STATUS_META,
  type EmailBlock,
  type EmailDesignJson,
  type EmailLogItem,
  type EmailLogsResponse,
  type EmailLogStatus,
  type EmailTemplateItem,
  type EmailTriggerOption,
  type MergeTagDefinition,
} from '../../lib/academy';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/validation';

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.85rem;
  margin-bottom: 1.25rem;
`;

const SummaryCard = styled.div`
  padding: 0.9rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  span {
    display: block;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-bottom: 0.25rem;
  }
  strong {
    font-size: 1.35rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const BuilderLayout = styled.div`
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 1.25rem;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

const PaletteBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const PaletteChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.8rem;
  font-weight: 700;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const BlockCard = styled.div<{ $selected?: boolean }>`
  padding: 0.9rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  .block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .block-type {
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const MergeTagBox = styled.div`
  padding: 0.85rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  h4 {
    font-size: 0.82rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  button.tag {
    padding: 0.25rem 0.55rem;
    font-size: 0.76rem;
    font-family: monospace;
    border-radius: 6px;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    color: ${({ theme }) => theme.colors.primary};
    transition: all ${({ theme }) => theme.transitions.fast};
  }
  button.tag:hover {
    background: ${({ theme }) => theme.colors.primarySoft};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const PreviewFrameWrap = styled.div<{ $mobile?: boolean }>`
  background: #050505;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;

  iframe {
    width: ${({ $mobile }) => ($mobile ? '360px' : '100%')};
    max-width: 100%;
    height: 540px;
    border: 1px solid #262626;
    border-radius: 12px;
    background: #0a0a0a;
  }
`;

const BLOCK_LABELS: Record<EmailBlock['type'], string> = {
  heading: 'Título',
  text: 'Parágrafo de Texto',
  callout: 'Caixa de Destaque',
  button: 'Botão de Ação (CTA)',
  image: 'Imagem',
  list: 'Lista de Itens',
  divider: 'Linha Divisória',
  spacer: 'Espaçador',
};

function createDefaultBlock(type: EmailBlock['type']): EmailBlock {
  const id = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  switch (type) {
    case 'heading':
      return {
        id,
        type,
        props: { level: 'h1', text: 'Título do seu e-mail' },
      };
    case 'text':
      return {
        id,
        type,
        props: {
          text: 'Olá, {{student.first_name}}!\n\nEscreva a mensagem personalizada aqui.',
        },
      };
    case 'callout':
      return {
        id,
        type,
        props: {
          text: 'Curso: {{course.title}}\nCódigo: {{certificate.code}}',
        },
      };
    case 'button':
      return {
        id,
        type,
        props: { label: 'Acessar minha área', href: '{{action_url}}' },
      };
    case 'image':
      return {
        id,
        type,
        props: { src: '', alt: 'PicPlus Academy' },
      };
    case 'list':
      return {
        id,
        type,
        props: {
          items: [
            'Acesso imediato a todas as aulas',
            'Materiais complementares em PDF',
            'Certificado oficial de conclusão',
          ],
        },
      };
    case 'divider':
      return { id, type, props: {} };
    case 'spacer':
      return { id, type, props: { height: 24 } };
  }
}

function renderClientSidePreviewHtml(
  blocks: EmailBlock[],
  settings?: EmailDesignJson['settings'],
): string {
  const sample: Record<string, string> = {
    'student.name': 'Camila Mendes',
    'student.first_name': 'Camila',
    'student.email': 'camila@exemplo.com.br',
    'course.title': 'Posicionamento e Conteúdo para Criadores',
    'course.instructor': 'Equipe PicPlus',
    'course.workload_hours': '12',
    'course.url': 'https://picplus.com.br/academy/minha-area',
    'lesson.title': 'Aula 01 — Estrutura de Roteiro que Converte',
    'order.id': 'ORD-98F2A',
    'order.amount': 'R$ 297,00',
    'certificate.code': 'PIC-2026-A8F9K2',
    'certificate.url': 'https://picplus.com.br/academy/certificado/PIC-2026-A8F9K2',
    action_url: 'https://picplus.com.br/academy/minha-area',
    reply_content:
      'Excelente pergunta! Você pode baixar o checklist na aba de Materiais desta aula.',
  };

  const replaceVars = (str: string) =>
    (str || '').replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, k: string) =>
      sample[k] ?? `{{${k}}}`,
    );

  const accent = settings?.accentColor || '#B6E829';
  const inner = blocks
    .map((b) => {
      switch (b.type) {
        case 'heading': {
          const tag = b.props.level || 'h2';
          const size = tag === 'h1' ? '22px' : tag === 'h2' ? '18px' : '16px';
          return `<${tag} style="margin:0 0 14px;font-size:${size};font-weight:800;color:#fff;">${replaceVars(b.props.text || '')}</${tag}>`;
        }
        case 'text':
          return `<div style="margin:0 0 16px;color:#d4d4d4;font-size:15px;line-height:1.65;">${replaceVars(b.props.text || '').replace(/\n/g, '<br/>')}</div>`;
        case 'callout':
          return `<div style="margin:18px 0;padding:14px 16px;background:#0a0a0a;border-left:4px solid ${accent};border-radius:8px;color:#e5e5e5;font-size:14px;line-height:1.6;">${replaceVars(b.props.text || '').replace(/\n/g, '<br/>')}</div>`;
        case 'button':
          return `<div style="margin:24px 0;"><a href="${replaceVars(b.props.href || '#')}" style="display:inline-block;background:${accent};color:#0a0a0a;font-weight:800;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">${replaceVars(b.props.label || 'Acessar')}</a></div>`;
        case 'image':
          return b.props.src
            ? `<div style="margin:16px 0;"><img src="${replaceVars(b.props.src)}" alt="${replaceVars(b.props.alt || '')}" style="max-width:100%;border-radius:10px;" /></div>`
            : '';
        case 'list':
          return `<ul style="margin:0 0 16px;padding-left:20px;color:#d4d4d4;">${(b.props.items || []).map((it) => `<li style="margin-bottom:6px;">${replaceVars(it)}</li>`).join('')}</ul>`;
        case 'divider':
          return `<hr style="border:0;border-top:1px solid #262626;margin:20px 0;" />`;
        case 'spacer':
          return `<div style="height:${b.props.height || 20}px;"></div>`;
        default:
          return '';
      }
    })
    .join('\n');

  const bg = settings?.backgroundColor || '#0a0a0a';
  const cardBg = settings?.cardBackgroundColor || '#171717';

  return `<!doctype html><html><body style="margin:0;padding:24px 12px;background:${bg};font-family:'Nunito',Arial,sans-serif;color:#d4d4d4;">
    <div style="max-width:560px;margin:0 auto;background:${cardBg};border:1px solid #262626;border-radius:16px;overflow:hidden;">
      <div style="padding:22px 26px;border-bottom:1px solid #262626;">
        <span style="font-size:22px;font-weight:800;color:#fff;">picplus<span style="color:${accent};">.</span></span>
        <span style="margin-left:8px;font-size:10px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:3px 8px;border-radius:999px;background:rgba(182,232,41,0.14);color:${accent};">Academy</span>
      </div>
      <div style="padding:26px;">${inner}</div>
      <div style="padding:16px 26px;border-top:1px solid #262626;color:#737373;font-size:11px;text-align:center;">
        ${settings?.footerText || 'PicPlus Company · PicPlus Academy · Este é um e-mail automático.'}
      </div>
    </div>
  </body></html>`;
}

export function EmailTemplates() {
  const { can, user } = useAuth();
  const canEdit = can('email_templates.edit');
  const canDelete = can('email_templates.delete');
  const toast = useToast();

  const [tab, setTab] = useState<'templates' | 'logs'>('templates');
  const [search, setSearch] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');

  // Filtros do histórico de envios
  const [logSearch, setLogSearch] = useState('');
  const [logStatus, setLogStatus] = useState('');
  const [logTrigger, setLogTrigger] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<EmailLogItem | null>(null);

  const templatesQuery = useFetch<EmailTemplateItem[]>(
    '/admin/email-templates',
    {
      search: search || undefined,
      trigger: triggerFilter || undefined,
    },
  );
  const triggersQuery = useFetch<EmailTriggerOption[]>(
    '/admin/email-templates/triggers',
  );
  const mergeTagsQuery = useFetch<MergeTagDefinition[]>(
    '/admin/email-templates/merge-tags',
  );
  const logsQuery = useFetch<EmailLogsResponse>('/admin/email-templates/logs', {
    search: logSearch || undefined,
    status: logStatus || undefined,
    trigger: logTrigger || undefined,
    page: logPage,
    limit: 25,
  });

  // Modal de criação/edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplateItem | null>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [trigger, setTrigger] = useState('');
  const [active, setActive] = useState(true);
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMobile, setPreviewMobile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal de pré-visualização rápida
  const [previewItem, setPreviewItem] = useState<EmailTemplateItem | null>(
    null,
  );

  // Modal de envio de e-mail de teste
  const [testTarget, setTestTarget] = useState<EmailTemplateItem | null>(null);
  const [testEmail, setTestEmail] = useState(user?.email ?? '');
  const [sendingTest, setSendingTest] = useState(false);

  // Exclusão
  const [deleting, setDeleting] = useState<EmailTemplateItem | null>(null);
  const [removing, setRemoving] = useState(false);

  const triggerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of triggersQuery.data ?? []) {
      map.set(item.value, item.label);
    }
    return map;
  }, [triggersQuery.data]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setSubject('');
    setTrigger('');
    setActive(true);
    const initialBlocks: EmailBlock[] = [
      createDefaultBlock('heading'),
      createDefaultBlock('text'),
      createDefaultBlock('button'),
    ];
    setBlocks(initialBlocks);
    setSelectedBlockId(initialBlocks[0].id);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: EmailTemplateItem) => {
    setEditing(item);
    setName(item.name);
    setSubject(item.subject);
    setTrigger(item.trigger ?? '');
    setActive(item.active);
    const loadedBlocks = Array.isArray(item.designJson?.blocks)
      ? item.designJson.blocks
      : [
          {
            id: 'legacy-1',
            type: 'text' as const,
            props: { text: item.body.replace(/<[^>]+>/g, '') },
          },
        ];
    setBlocks(loadedBlocks);
    setSelectedBlockId(loadedBlocks[0]?.id ?? null);
    setFormError(null);
    setModalOpen(true);
  };

  const openDuplicate = (item: EmailTemplateItem) => {
    setEditing(null);
    setName(`${item.name} (Cópia)`);
    setSubject(item.subject);
    setTrigger(''); // Gatilho é único, então a cópia nasce como manual
    setActive(true);
    const loadedBlocks = Array.isArray(item.designJson?.blocks)
      ? item.designJson.blocks.map((b) => ({
          ...b,
          id: `${b.id}_copy_${Math.random().toString(36).slice(2, 5)}`,
        }))
      : [createDefaultBlock('text')];
    setBlocks(loadedBlocks);
    setSelectedBlockId(loadedBlocks[0]?.id ?? null);
    setFormError(null);
    setModalOpen(true);
  };

  const addBlock = (type: EmailBlock['type']) => {
    const blk = createDefaultBlock(type);
    setBlocks((prev) => [...prev, blk]);
    setSelectedBlockId(blk.id);
  };

  const updateBlockProps = (id: string, patch: Partial<EmailBlock['props']>) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, props: { ...b.props, ...patch } } : b,
      ),
    );
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const insertMergeTag = (tag: string) => {
    if (selectedBlockId) {
      const blk = blocks.find((b) => b.id === selectedBlockId);
      if (blk && (blk.type === 'text' || blk.type === 'heading' || blk.type === 'callout')) {
        updateBlockProps(blk.id, {
          text: `${blk.props.text ?? ''}${blk.props.text ? ' ' : ''}${tag}`,
        });
        toast.success(`Variável ${tag} inserida no bloco selecionado.`);
        return;
      }
    }
    setSubject((prev) => `${prev}${prev ? ' ' : ''}${tag}`);
    toast.success(`Variável ${tag} inserida no assunto.`);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      name: name.trim(),
      subject: subject.trim(),
      trigger: trigger || null,
      active,
      designJson: {
        blocks,
        settings: {
          backgroundColor: '#0a0a0a',
          cardBackgroundColor: '#171717',
          textColor: '#d4d4d4',
          accentColor: '#B6E829',
        },
      },
    };

    try {
      if (editing) {
        await api.patch(`/admin/email-templates/${editing.id}`, payload);
        toast.success('Template atualizado com sucesso!');
      } else {
        await api.post('/admin/email-templates', payload);
        toast.success('Template criado com sucesso!');
      }
      setModalOpen(false);
      templatesQuery.reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (event: FormEvent) => {
    event.preventDefault();
    if (!testTarget || !testEmail.trim()) return;
    setSendingTest(true);
    try {
      const res = await api.post<{ message: string }>(
        `/admin/email-templates/${testTarget.id}/send-test`,
        { to: testEmail.trim() },
      );
      toast.success(res.message);
      setTestTarget(null);
      logsQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSendingTest(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await api.delete(`/admin/email-templates/${deleting.id}`);
      toast.success('Template excluído.');
      setDeleting(null);
      templatesQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  const livePreviewHtml = useMemo(
    () => renderClientSidePreviewHtml(blocks),
    [blocks],
  );

  const formatDateTime = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : '—';

  return (
    <div>
      <PageHeader
        title="Templates de E-mail"
        description="Personalize os e-mails automáticos da PicPlus Academy e do site institucional e acompanhe o status de entrega."
        actions={
          <>
            {tab === 'logs' && (
              <Button variant="secondary" onClick={logsQuery.reload}>
                <RefreshCw size={16} /> Atualizar
              </Button>
            )}
            {tab === 'templates' && canEdit && (
              <Button onClick={openNew}>
                <Plus size={18} /> Novo Template
              </Button>
            )}
          </>
        }
      />

      <div style={{ marginBottom: '1.25rem' }}>
        <Tabs<'templates' | 'logs'>
          tabs={[
            {
              key: 'templates',
              label: 'Templates',
              count: templatesQuery.data?.length,
            },
            {
              key: 'logs',
              label: 'Histórico de Envios',
              count: logsQuery.data?.summary.total,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'templates' && (
        <>
          <Toolbar>
            <div className="grow">
              <TextField
                label="Buscar template"
                placeholder="Digite o nome ou assunto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ minWidth: 280 }}>
              <SelectField
                label="Filtrar por gatilho"
                value={triggerFilter}
                onChange={(e) => setTriggerFilter(e.target.value)}
                placeholder="Todos os gatilhos"
                options={[
                  { value: '__manual__', label: 'Uso manual (sem gatilho)' },
                  ...(triggersQuery.data ?? []).map((t) => ({
                    value: t.value,
                    label: t.label,
                  })),
                ]}
              />
            </div>
          </Toolbar>

          {templatesQuery.loading && <Skeleton $h="260px" />}
          {templatesQuery.error && (
            <ErrorState
              message={templatesQuery.error.message}
              onRetry={templatesQuery.reload}
            />
          )}

          {!templatesQuery.loading &&
            !templatesQuery.error &&
            (templatesQuery.data?.length ?? 0) === 0 && (
              <Panel>
                <EmptyState
                  title="Nenhum template encontrado"
                  description="Crie um novo template ou limpe os filtros de busca."
                />
              </Panel>
            )}

          {!templatesQuery.loading && (templatesQuery.data?.length ?? 0) > 0 && (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Template / Assunto</th>
                    <th>Gatilho Automático</th>
                    <th>Status</th>
                    <th className="right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {templatesQuery.data!.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <CellMain>
                          <div>
                            <strong>{item.name}</strong>
                            <small>{item.subject}</small>
                          </div>
                        </CellMain>
                      </td>
                      <td>
                        {item.trigger ? (
                          <StatusPill tone="primary">
                            {triggerMap.get(item.trigger) ?? item.trigger}
                          </StatusPill>
                        ) : (
                          <StatusPill tone="neutral">Uso manual</StatusPill>
                        )}
                      </td>
                      <td>
                        <StatusPill tone={item.active ? 'success' : 'neutral'}>
                          {item.active ? 'Ativo' : 'Pausado'}
                        </StatusPill>
                      </td>
                      <td className="right">
                        <RowActions>
                          <IconButton
                            label="Pré-visualizar"
                            onClick={() => setPreviewItem(item)}
                          >
                            <Eye size={17} />
                          </IconButton>
                          {canEdit && (
                            <>
                              <IconButton
                                label="Enviar e-mail de teste"
                                onClick={() => {
                                  setTestTarget(item);
                                  setTestEmail(user?.email ?? '');
                                }}
                              >
                                <Send size={17} />
                              </IconButton>
                              <IconButton
                                label="Duplicar template"
                                onClick={() => openDuplicate(item)}
                              >
                                <Copy size={17} />
                              </IconButton>
                              <IconButton
                                label="Editar template"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil size={17} />
                              </IconButton>
                            </>
                          )}
                          {canDelete && (
                            <IconButton
                              label="Excluir template"
                              danger
                              onClick={() => setDeleting(item)}
                            >
                              <Trash2 size={17} />
                            </IconButton>
                          )}
                        </RowActions>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </>
      )}

      {tab === 'logs' && (
        <>
          {logsQuery.data && !logsQuery.data.webhookConfigured && (
            <div style={{ marginBottom: '1rem' }}>
              <Alert tone="info">
                Os envios já estão sendo gravados automaticamente. Para receber atualizações em tempo real de{' '}
                <strong>Entregue</strong>, <strong>Aberto</strong>, <strong>Clicado</strong> e <strong>Bounce</strong>,
                cadastre no painel do Resend o webhook <code>/api/webhooks/resend</code> e defina a variável{' '}
                <code>RESEND_WEBHOOK_SECRET</code> no backend.
              </Alert>
            </div>
          )}

          {logsQuery.data && (
            <SummaryGrid>
              <SummaryCard>
                <span>Total de registros</span>
                <strong>{logsQuery.data.summary.total}</strong>
              </SummaryCard>
              <SummaryCard>
                <span>Entregues</span>
                <strong style={{ color: '#22c55e' }}>
                  {logsQuery.data.summary.delivered}
                </strong>
              </SummaryCard>
              <SummaryCard>
                <span>Abertos</span>
                <strong style={{ color: '#B6E829' }}>
                  {logsQuery.data.summary.opened}
                </strong>
              </SummaryCard>
              <SummaryCard>
                <span>Cliques</span>
                <strong style={{ color: '#B6E829' }}>
                  {logsQuery.data.summary.clicked}
                </strong>
              </SummaryCard>
              <SummaryCard>
                <span>Bounces / Falhas</span>
                <strong style={{ color: '#ef4444' }}>
                  {logsQuery.data.summary.issues}
                </strong>
              </SummaryCard>
            </SummaryGrid>
          )}

          <Toolbar>
            <div className="grow">
              <TextField
                label="Buscar envio"
                placeholder="Destinatário, assunto, template ou ID Resend…"
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogPage(1);
                }}
              />
            </div>
            <div style={{ minWidth: 210 }}>
              <SelectField
                label="Status"
                value={logStatus}
                onChange={(e) => {
                  setLogStatus(e.target.value);
                  setLogPage(1);
                }}
                placeholder="Todos os status"
                options={(
                  Object.keys(EMAIL_LOG_STATUS_META) as EmailLogStatus[]
                ).map((key) => ({
                  value: key,
                  label: EMAIL_LOG_STATUS_META[key].label,
                }))}
              />
            </div>
            <div style={{ minWidth: 240 }}>
              <SelectField
                label="Gatilho"
                value={logTrigger}
                onChange={(e) => {
                  setLogTrigger(e.target.value);
                  setLogPage(1);
                }}
                placeholder="Todos os gatilhos"
                options={[
                  { value: '__manual__', label: 'Sistema / Aviso interno' },
                  ...(triggersQuery.data ?? []).map((t) => ({
                    value: t.value,
                    label: t.label,
                  })),
                ]}
              />
            </div>
          </Toolbar>

          {logsQuery.loading && <Skeleton $h="260px" />}
          {logsQuery.error && (
            <ErrorState
              message={logsQuery.error.message}
              onRetry={logsQuery.reload}
            />
          )}

          {!logsQuery.loading &&
            !logsQuery.error &&
            (logsQuery.data?.items.length ?? 0) === 0 && (
              <Panel>
                <EmptyState
                  title="Nenhum envio registrado"
                  description="Assim que um e-mail automático ou de teste for disparado, ele aparecerá aqui com o status atualizado."
                />
              </Panel>
            )}

          {!logsQuery.loading && (logsQuery.data?.items.length ?? 0) > 0 && (
            <>
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th>Destinatário / Assunto</th>
                      <th>Gatilho / Template</th>
                      <th>Status</th>
                      <th>Enviado em</th>
                      <th className="right">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsQuery.data!.items.map((log) => {
                      const meta = EMAIL_LOG_STATUS_META[log.status] ?? {
                        label: log.status,
                        tone: 'neutral' as const,
                      };
                      return (
                        <tr key={log.id}>
                          <td>
                            <CellMain>
                              <div>
                                <strong>{log.to}</strong>
                                <small>{log.subject}</small>
                              </div>
                            </CellMain>
                          </td>
                          <td>
                            <CellMain>
                              <div>
                                <strong>
                                  {log.trigger
                                    ? (triggerMap.get(log.trigger) ?? log.trigger)
                                    : 'Sistema / Interno'}
                                </strong>
                                <small>{log.templateName || '—'}</small>
                              </div>
                            </CellMain>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                              <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                              {log.errorMessage && (
                                <small style={{ color: '#ef4444', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {log.errorMessage}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <CellMain>
                              <div>
                                <strong>{formatDateTime(log.sentAt)}</strong>
                                {log.openedAt && (
                                  <small>Aberto: {formatDateTime(log.openedAt)}</small>
                                )}
                                {!log.openedAt && log.deliveredAt && (
                                  <small>Entregue: {formatDateTime(log.deliveredAt)}</small>
                                )}
                              </div>
                            </CellMain>
                          </td>
                          <td className="right">
                            <RowActions>
                              <IconButton
                                label="Ver detalhes do envio"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye size={17} />
                              </IconButton>
                            </RowActions>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </TableWrap>

              {logsQuery.data!.meta.totalPages > 1 && (
                <PaginationRow>
                  <span>
                    Página {logsQuery.data!.meta.page} de{' '}
                    {logsQuery.data!.meta.totalPages} ({logsQuery.data!.meta.total}{' '}
                    registros)
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={logPage <= 1}
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={logPage >= logsQuery.data!.meta.totalPages}
                      onClick={() => setLogPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </PaginationRow>
              )}
            </>
          )}
        </>
      )}

      {/* Modal Construtor de E-mail */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Template de E-mail' : 'Novo Template de E-mail'}
        description="Monte os blocos do e-mail e clique nas variáveis dinâmicas para personalizar com os dados do aluno ou curso."
        width="1140px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="email-template-form" loading={saving}>
              Salvar Template
            </Button>
          </>
        }
      >
        <FormStack id="email-template-form" onSubmit={handleSave}>
          {formError && <Alert tone="danger">{formError}</Alert>}

          <FormGrid $cols={3}>
            <TextField
              label="Nome interno do template"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Compra Aprovada — Academy"
            />
            <SelectField
              label="Gatilho de disparo"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="Uso manual (sem gatilho automático)"
              options={(triggersQuery.data ?? []).map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />
            <Switch
              label="Template ativo"
              description="Desative para pausar o envio automático deste gatilho."
              checked={active}
              onChange={setActive}
            />
          </FormGrid>

          <TextField
            label="Assunto do e-mail"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex.: Acesso liberado: {{course.title}} 🎉"
            hint="Você pode usar variáveis como {{student.first_name}} e {{course.title}} no assunto."
          />

          <MergeTagBox>
            <h4>
              <Sparkles size={14} /> Variáveis Dinâmicas (clique para inserir no
              bloco selecionado ou no assunto)
            </h4>
            <div className="tags">
              {(mergeTagsQuery.data ?? []).map((m) => (
                <button
                  key={m.tag}
                  type="button"
                  className="tag"
                  title={`${m.label} (Ex.: ${m.example})`}
                  onClick={() => insertMergeTag(m.tag)}
                >
                  {m.tag}
                </button>
              ))}
            </div>
          </MergeTagBox>

          <BuilderLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <PaletteBar>
                {(Object.keys(BLOCK_LABELS) as EmailBlock['type'][]).map(
                  (type) => (
                    <PaletteChip
                      key={type}
                      type="button"
                      onClick={() => addBlock(type)}
                    >
                      <Plus size={14} /> {BLOCK_LABELS[type]}
                    </PaletteChip>
                  ),
                )}
              </PaletteBar>

              {blocks.map((blk, idx) => (
                <BlockCard
                  key={blk.id}
                  $selected={selectedBlockId === blk.id}
                  onClick={() => setSelectedBlockId(blk.id)}
                >
                  <div className="block-head">
                    <span className="block-type">
                      #{idx + 1} · {BLOCK_LABELS[blk.type]}
                    </span>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      <IconButton
                        label="Mover para cima"
                        disabled={idx === 0}
                        onClick={() => moveBlock(idx, -1)}
                      >
                        <ArrowUp size={15} />
                      </IconButton>
                      <IconButton
                        label="Mover para baixo"
                        disabled={idx === blocks.length - 1}
                        onClick={() => moveBlock(idx, 1)}
                      >
                        <ArrowDown size={15} />
                      </IconButton>
                      <IconButton
                        label="Remover bloco"
                        danger
                        onClick={() => removeBlock(blk.id)}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </div>

                  {blk.type === 'heading' && (
                    <FormGrid $cols={2}>
                      <TextField
                        label="Texto do título"
                        required
                        value={blk.props.text ?? ''}
                        onChange={(e) =>
                          updateBlockProps(blk.id, { text: e.target.value })
                        }
                      />
                      <SelectField
                        label="Tamanho"
                        value={blk.props.level ?? 'h1'}
                        onChange={(e) =>
                          updateBlockProps(blk.id, {
                            level: e.target.value as 'h1' | 'h2' | 'h3',
                          })
                        }
                        options={[
                          { value: 'h1', label: 'H1 — Grande (24px)' },
                          { value: 'h2', label: 'H2 — Médio (20px)' },
                          { value: 'h3', label: 'H3 — Subtítulo (17px)' },
                        ]}
                      />
                    </FormGrid>
                  )}

                  {(blk.type === 'text' || blk.type === 'callout') && (
                    <TextArea
                      label={
                        blk.type === 'callout'
                          ? 'Texto de destaque (caixa com borda verde)'
                          : 'Conteúdo do parágrafo'
                      }
                      value={blk.props.text ?? ''}
                      onChange={(e) =>
                        updateBlockProps(blk.id, { text: e.target.value })
                      }
                      style={{ minHeight: 84 }}
                    />
                  )}

                  {blk.type === 'button' && (
                    <FormGrid $cols={2}>
                      <TextField
                        label="Texto do botão"
                        required
                        value={blk.props.label ?? ''}
                        onChange={(e) =>
                          updateBlockProps(blk.id, { label: e.target.value })
                        }
                      />
                      <TextField
                        label="URL / Variável de destino"
                        required
                        value={blk.props.href ?? ''}
                        onChange={(e) =>
                          updateBlockProps(blk.id, { href: e.target.value })
                        }
                        placeholder="{{course.url}} ou https://..."
                      />
                    </FormGrid>
                  )}

                  {blk.type === 'image' && (
                    <FormGrid $cols={2}>
                      <TextField
                        label="URL da imagem"
                        value={blk.props.src ?? ''}
                        onChange={(e) =>
                          updateBlockProps(blk.id, { src: e.target.value })
                        }
                        placeholder="https://..."
                      />
                      <TextField
                        label="Texto alternativo (alt)"
                        value={blk.props.alt ?? ''}
                        onChange={(e) =>
                          updateBlockProps(blk.id, { alt: e.target.value })
                        }
                      />
                    </FormGrid>
                  )}

                  {blk.type === 'list' && (
                    <TextArea
                      label="Itens da lista (um por linha)"
                      value={(blk.props.items ?? []).join('\n')}
                      onChange={(e) =>
                        updateBlockProps(blk.id, {
                          items: e.target.value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      style={{ minHeight: 80 }}
                    />
                  )}

                  {blk.type === 'spacer' && (
                    <TextField
                      label="Altura em pixels"
                      type="number"
                      min={4}
                      max={120}
                      value={String(blk.props.height ?? 20)}
                      onChange={(e) =>
                        updateBlockProps(blk.id, {
                          height: Number(e.target.value || 20),
                        })
                      }
                    />
                  )}
                </BlockCard>
              ))}
            </div>

            <PreviewFrameWrap $mobile={previewMobile}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <strong style={{ fontSize: '0.85rem', color: '#a3a3a3' }}>
                  Prévia em tempo real (com dados de exemplo)
                </strong>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <Button
                    size="sm"
                    variant={!previewMobile ? 'primary' : 'ghost'}
                    onClick={() => setPreviewMobile(false)}
                  >
                    <Monitor size={15} /> Desktop
                  </Button>
                  <Button
                    size="sm"
                    variant={previewMobile ? 'primary' : 'ghost'}
                    onClick={() => setPreviewMobile(true)}
                  >
                    <Smartphone size={15} /> Mobile
                  </Button>
                </div>
              </div>
              <iframe
                title="Prévia do e-mail"
                srcDoc={livePreviewHtml}
                sandbox=""
              />
            </PreviewFrameWrap>
          </BuilderLayout>
        </FormStack>
      </Modal>

      {/* Modal de Pré-visualização Rápida */}
      <Modal
        open={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title={previewItem?.name ?? 'Prévia do Template'}
        description={previewItem ? `Assunto: ${previewItem.subject}` : undefined}
        width="680px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreviewItem(null)}>
              Fechar
            </Button>
            {canEdit && previewItem && (
              <Button
                onClick={() => {
                  const target = previewItem;
                  setPreviewItem(null);
                  openEdit(target);
                }}
              >
                <Pencil size={16} /> Editar Template
              </Button>
            )}
          </>
        }
      >
        {previewItem && (
          <PreviewFrameWrap>
            <iframe
              title="Prévia do template salvo"
              srcDoc={
                previewItem.designJson?.blocks
                  ? renderClientSidePreviewHtml(
                      previewItem.designJson.blocks,
                      previewItem.designJson.settings,
                    )
                  : previewItem.body
              }
              sandbox=""
            />
          </PreviewFrameWrap>
        )}
      </Modal>

      {/* Modal de Disparo de Teste */}
      <Modal
        open={!!testTarget}
        onClose={() => setTestTarget(null)}
        title="Enviar E-mail de Teste"
        description={
          testTarget
            ? `Enviaremos uma prévia de "${testTarget.name}" preenchida com dados de demonstração.`
            : undefined
        }
        width="460px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTestTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="send-test-email-form"
              loading={sendingTest}
            >
              <Mail size={16} /> Disparar Teste
            </Button>
          </>
        }
      >
        <FormStack id="send-test-email-form" onSubmit={handleSendTest}>
          <TextField
            label="E-mail de destino"
            type="email"
            required
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="seuemail@picplus.com.br"
          />
        </FormStack>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Excluir Template"
        message={
          <>
            Tem certeza que deseja excluir o template{' '}
            <strong>{deleting?.name}</strong>? Se ele estiver associado a um
            gatilho automático, o sistema voltará a usar o layout padrão.
          </>
        }
        loading={removing}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleting(null)}
      />

      {/* Modal de Detalhes do Envio */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Detalhes do E-mail Enviado"
        width="620px"
        footer={
          <Button variant="ghost" onClick={() => setSelectedLog(null)}>
            Fechar
          </Button>
        }
      >
        {selectedLog && (
          <DetailList>
            <div>
              <dt>Status atual</dt>
              <dd>
                <StatusPill
                  tone={
                    EMAIL_LOG_STATUS_META[selectedLog.status]?.tone ?? 'neutral'
                  }
                >
                  {EMAIL_LOG_STATUS_META[selectedLog.status]?.label ??
                    selectedLog.status}
                </StatusPill>
              </dd>
            </div>
            <div>
              <dt>Último evento</dt>
              <dd>{selectedLog.lastEvent || '—'}</dd>
            </div>
            <div>
              <dt>Destinatário</dt>
              <dd>{selectedLog.to}</dd>
            </div>
            <div>
              <dt>Assunto</dt>
              <dd>{selectedLog.subject}</dd>
            </div>
            <div>
              <dt>Gatilho</dt>
              <dd>
                {selectedLog.trigger
                  ? (triggerMap.get(selectedLog.trigger) ?? selectedLog.trigger)
                  : 'Sistema / Interno'}
              </dd>
            </div>
            <div>
              <dt>Template</dt>
              <dd>{selectedLog.templateName || '—'}</dd>
            </div>
            <div>
              <dt>ID Resend</dt>
              <dd>
                <code>{selectedLog.resendEmailId || '—'}</code>
              </dd>
            </div>
            <div>
              <dt>Enviado em</dt>
              <dd>{formatDateTime(selectedLog.sentAt)}</dd>
            </div>
            <div>
              <dt>Entregue em</dt>
              <dd>{formatDateTime(selectedLog.deliveredAt)}</dd>
            </div>
            <div>
              <dt>Aberto em</dt>
              <dd>{formatDateTime(selectedLog.openedAt)}</dd>
            </div>
            <div>
              <dt>Clicado em</dt>
              <dd>{formatDateTime(selectedLog.clickedAt)}</dd>
            </div>
            {selectedLog.bouncedAt && (
              <div>
                <dt>Bounce em</dt>
                <dd>{formatDateTime(selectedLog.bouncedAt)}</dd>
              </div>
            )}
            {selectedLog.complainedAt && (
              <div>
                <dt>Marcado como spam em</dt>
                <dd>{formatDateTime(selectedLog.complainedAt)}</dd>
              </div>
            )}
            {selectedLog.failedAt && (
              <div>
                <dt>Falha em</dt>
                <dd>{formatDateTime(selectedLog.failedAt)}</dd>
              </div>
            )}
            {selectedLog.errorMessage && (
              <div style={{ gridColumn: '1 / -1' }}>
                <dt>Detalhe do erro / bounce</dt>
                <dd style={{ color: '#ef4444' }}>{selectedLog.errorMessage}</dd>
              </div>
            )}
          </DetailList>
        )}
      </Modal>
    </div>
  );
}
