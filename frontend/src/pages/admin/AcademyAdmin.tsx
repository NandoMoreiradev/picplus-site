import { useState } from 'react';
import type { FormEvent } from 'react';
import styled from 'styled-components';
import {
  ArrowDown,
  ArrowUp,
  Award,
  BookOpen,
  DollarSign,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  MessageSquare,
  Pencil,
  Plus,
  Reply,
  Ticket,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';
import {
  CellMain,
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
import { UploadField } from '../../components/admin/UploadField';
import { VideoUploadField } from '../../components/admin/VideoUploadField';
import { Avatar } from '../../components/ui/Avatar';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Chip, Chips } from '../../components/ui/Chips';
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
  COURSE_LEVEL_LABEL,
  formatCentsBRL,
  formatDuration,
} from '../../lib/academy';
import type {
  AcademyCoupon,
  AcademyOverview,
  AdminStudentItem,
  CouponDiscountType,
  Course,
  CourseLesson,
  CourseLevel,
  CourseModule,
  CourseOrderItem,
  LessonCommentItem,
  LessonVideoProvider,
} from '../../lib/academy';
import { api, assetUrl } from '../../lib/api';
import { errorMessage } from '../../lib/validation';

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 1rem;
  margin-bottom: 1.75rem;
`;

const StatCard = styled(Panel)`
  padding: 1.2rem 1.35rem;
  display: flex;
  align-items: center;
  gap: 1rem;

  .icon {
    width: 44px;
    height: 44px;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  strong {
    display: block;
    font-size: 1.45rem;
    font-weight: 800;
    line-height: 1.15;
  }
  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
`;

const CurriculumModuleCard = styled(Panel)`
  padding: 1.15rem 1.25rem;
  margin-bottom: 1rem;
  background: ${({ theme }) => theme.colors.background};

  .mod-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    margin-bottom: 0.85rem;
  }
  .mod-title {
    font-weight: 800;
    font-size: 1.05rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const LessonRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 0.5rem;

  .lesson-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }
  .lesson-title {
    font-weight: 700;
    font-size: 0.92rem;
  }
  .lesson-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textMuted};
    margin-top: 0.15rem;
  }
`;

const MaterialChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.65rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.8rem;
`;

const ProgressBar = styled.div<{ $pct: number }>`
  width: 100%;
  max-width: 140px;
  height: 7px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.borderStrong};
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $pct }) => Math.min(100, Math.max(0, $pct))}%;
    background: ${({ theme }) => theme.colors.primary};
  }
`;

type AcademyTab = 'courses' | 'students' | 'orders' | 'coupons' | 'comments';

interface CourseFormState {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  coverImage: string | null;
  promoVideoUrl: string;
  instructorName: string;
  instructorBio: string;
  instructorAvatar: string | null;
  priceBRL: string;
  compareAtPriceBRL: string;
  workloadHours: string;
  level: CourseLevel;
  category: string;
  featuresText: string;
  published: boolean;
  featured: boolean;
  order: string;
}

const EMPTY_COURSE_FORM: CourseFormState = {
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  coverImage: null,
  promoVideoUrl: '',
  instructorName: 'Equipe PicPlus',
  instructorBio: '',
  instructorAvatar: null,
  priceBRL: '297,00',
  compareAtPriceBRL: '',
  workloadHours: '10',
  level: 'BEGINNER',
  category: 'Influência & Conteúdo',
  featuresText:
    'Acesso imediato a todas as aulas\nMateriais de apoio em PDF\nCertificado oficial de conclusão',
  published: true,
  featured: false,
  order: '0',
};

function parseBRLToCents(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(',', '.');
  const val = Number.parseFloat(cleaned);
  if (Number.isNaN(val) || val < 0) return 0;
  return Math.round(val * 100);
}

function centsToBRLInput(cents?: number | null): string {
  if (cents === undefined || cents === null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

export default function AcademyAdmin() {
  const { can } = useAuth();
  const canEdit = can('academy.edit');
  const canManage = can('academy.manage');
  const toast = useToast();

  const [tab, setTab] = useState<AcademyTab>('courses');

  const overviewQuery = useFetch<AcademyOverview>('/admin/academy/overview');
  const coursesQuery = useFetch<Course[]>('/admin/academy/courses');
  const studentsQuery = useFetch<AdminStudentItem[]>('/admin/academy/students');
  const ordersQuery = useFetch<CourseOrderItem[]>('/admin/academy/orders');
  const couponsQuery = useFetch<AcademyCoupon[]>('/admin/academy/coupons');
  const commentsQuery = useFetch<LessonCommentItem[]>(
    '/admin/academy/comments',
  );

  const reloadAll = () => {
    overviewQuery.reload();
    coursesQuery.reload();
    studentsQuery.reload();
    ordersQuery.reload();
    couponsQuery.reload();
    commentsQuery.reload();
  };

  // ─── Estado de Curso (Criar / Editar) ─────────────────────
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] =
    useState<CourseFormState>(EMPTY_COURSE_FORM);
  const [savingCourse, setSavingCourse] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  // ─── Construtor de Grade (Módulos + Aulas + Materiais) ────
  const [curriculumCourseId, setCurriculumCourseId] = useState<string | null>(
    null,
  );
  const activeCurriculumCourse =
    coursesQuery.data?.find((c) => c.id === curriculumCourseId) ?? null;

  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');
  const [savingModule, setSavingModule] = useState(false);

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonProvider, setLessonProvider] =
    useState<LessonVideoProvider>('YOUTUBE');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonDurationMin, setLessonDurationMin] = useState('10');
  const [lessonFreePreview, setLessonFreePreview] = useState(false);
  const [lessonPublished, setLessonPublished] = useState(true);
  const [savingLesson, setSavingLesson] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  // ─── Matrícula Cortesia / Manual ──────────────────────────
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantCourseId, setGrantCourseId] = useState('');
  const [grantMode, setGrantMode] = useState<'existing' | 'new'>('new');
  const [grantStudentId, setGrantStudentId] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantName, setGrantName] = useState('');
  const [grantPassword, setGrantPassword] = useState('');
  const [grantSaving, setGrantSaving] = useState(false);

  // ─── Cupons ───────────────────────────────────────────────
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] =
    useState<CouponDiscountType>('PERCENTAGE');
  const [couponValue, setCouponValue] = useState('15');
  const [couponMaxUses, setCouponMaxUses] = useState('');
  const [couponExpiresAt, setCouponExpiresAt] = useState('');
  const [couponCourseId, setCouponCourseId] = useState('');
  const [savingCoupon, setSavingCoupon] = useState(false);

  // ─── Resposta de Dúvidas ──────────────────────────────────
  const [replyTarget, setReplyTarget] = useState<LessonCommentItem | null>(
    null,
  );
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // ─── Handlers: Curso ──────────────────────────────────────
  const openNewCourse = () => {
    setEditingCourse(null);
    setCourseForm(EMPTY_COURSE_FORM);
    setCourseError(null);
    setCourseModalOpen(true);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      slug: course.slug,
      subtitle: course.subtitle ?? '',
      description: course.description,
      coverImage: course.coverImage,
      promoVideoUrl: course.promoVideoUrl ?? '',
      instructorName: course.instructorName,
      instructorBio: course.instructorBio ?? '',
      instructorAvatar: course.instructorAvatar,
      priceBRL: centsToBRLInput(course.priceCents),
      compareAtPriceBRL:
        course.compareAtPriceCents !== null
          ? centsToBRLInput(course.compareAtPriceCents)
          : '',
      workloadHours: String(course.workloadHours),
      level: course.level,
      category: course.category ?? '',
      featuresText: (course.features ?? []).join('\n'),
      published: course.published,
      featured: course.featured,
      order: String(course.order),
    });
    setCourseError(null);
    setCourseModalOpen(true);
  };

  const handleSaveCourse = async (event: FormEvent) => {
    event.preventDefault();
    setSavingCourse(true);
    setCourseError(null);

    const payload = {
      title: courseForm.title.trim(),
      slug: courseForm.slug.trim() || undefined,
      subtitle: courseForm.subtitle.trim() || null,
      description: courseForm.description.trim(),
      coverImage: courseForm.coverImage,
      promoVideoUrl: courseForm.promoVideoUrl.trim() || null,
      instructorName: courseForm.instructorName.trim(),
      instructorBio: courseForm.instructorBio.trim() || null,
      instructorAvatar: courseForm.instructorAvatar,
      priceCents: parseBRLToCents(courseForm.priceBRL),
      compareAtPriceCents: courseForm.compareAtPriceBRL.trim()
        ? parseBRLToCents(courseForm.compareAtPriceBRL)
        : null,
      workloadHours: Math.max(1, Number(courseForm.workloadHours) || 1),
      level: courseForm.level,
      category: courseForm.category.trim() || null,
      features: courseForm.featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      published: courseForm.published,
      featured: courseForm.featured,
      order: Number(courseForm.order) || 0,
    };

    try {
      if (editingCourse) {
        await api.patch(`/admin/academy/courses/${editingCourse.id}`, payload);
        toast.success('Curso atualizado!');
      } else {
        const created = await api.post<Course>(
          '/admin/academy/courses',
          payload,
        );
        toast.success('Curso criado! Agora adicione os módulos e aulas.');
        setCurriculumCourseId(created.id);
      }
      setCourseModalOpen(false);
      reloadAll();
    } catch (err) {
      setCourseError(errorMessage(err));
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return;
    try {
      await api.delete(`/admin/academy/courses/${deletingCourse.id}`);
      toast.success('Curso excluído.');
      setDeletingCourse(null);
      reloadAll();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // ─── Handlers: Módulos e Aulas ────────────────────────────
  const openNewModule = () => {
    setEditingModule(null);
    setModuleTitle('');
    setModuleDesc('');
    setModuleModalOpen(true);
  };

  const openEditModule = (mod: CourseModule) => {
    setEditingModule(mod);
    setModuleTitle(mod.title);
    setModuleDesc(mod.description ?? '');
    setModuleModalOpen(true);
  };

  const handleSaveModule = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeCurriculumCourse) return;
    setSavingModule(true);
    try {
      if (editingModule) {
        await api.patch(`/admin/academy/modules/${editingModule.id}`, {
          title: moduleTitle.trim(),
          description: moduleDesc.trim() || null,
        });
        toast.success('Módulo atualizado.');
      } else {
        await api.post(
          `/admin/academy/courses/${activeCurriculumCourse.id}/modules`,
          {
            title: moduleTitle.trim(),
            description: moduleDesc.trim() || null,
          },
        );
        toast.success('Módulo adicionado.');
      }
      setModuleModalOpen(false);
      coursesQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingModule(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('Excluir este módulo e todas as suas aulas?')) return;
    try {
      await api.delete(`/admin/academy/modules/${moduleId}`);
      toast.success('Módulo removido.');
      coursesQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleMoveModule = async (index: number, dir: -1 | 1) => {
    if (!activeCurriculumCourse?.modules) return;
    const mods = [...activeCurriculumCourse.modules];
    const target = index + dir;
    if (target < 0 || target >= mods.length) return;
    [mods[index], mods[target]] = [mods[target], mods[index]];
    try {
      await api.patch(
        `/admin/academy/courses/${activeCurriculumCourse.id}/modules/reorder`,
        { ids: mods.map((m) => m.id) },
      );
      coursesQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const openNewLesson = (moduleId: string) => {
    setTargetModuleId(moduleId);
    setEditingLesson(null);
    setLessonTitle('');
    setLessonDesc('');
    setLessonProvider('YOUTUBE');
    setLessonVideoUrl('');
    setLessonDurationMin('10');
    setLessonFreePreview(false);
    setLessonPublished(true);
    setLessonModalOpen(true);
  };

  const openEditLesson = (lesson: CourseLesson) => {
    setTargetModuleId(lesson.moduleId);
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonDesc(lesson.description ?? '');
    setLessonProvider(lesson.videoProvider);
    setLessonVideoUrl(lesson.videoUrl ?? '');
    setLessonDurationMin(
      String(Math.max(1, Math.round((lesson.durationSeconds || 60) / 60))),
    );
    setLessonFreePreview(lesson.isFreePreview);
    setLessonPublished(lesson.published);
    setLessonModalOpen(true);
  };

  const handleSaveLesson = async (event: FormEvent) => {
    event.preventDefault();
    if (!targetModuleId) return;
    setSavingLesson(true);

    const payload = {
      title: lessonTitle.trim(),
      description: lessonDesc.trim() || null,
      videoProvider: lessonProvider,
      videoUrl: lessonVideoUrl.trim() || null,
      durationSeconds: Math.max(0, Number(lessonDurationMin) || 0) * 60,
      isFreePreview: lessonFreePreview,
      published: lessonPublished,
    };

    try {
      if (editingLesson) {
        await api.patch(`/admin/academy/lessons/${editingLesson.id}`, payload);
        toast.success('Aula atualizada!');
      } else {
        await api.post(
          `/admin/academy/modules/${targetModuleId}/lessons`,
          payload,
        );
        toast.success('Aula criada!');
      }
      setLessonModalOpen(false);
      coursesQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Excluir esta aula?')) return;
    try {
      await api.delete(`/admin/academy/lessons/${lessonId}`);
      toast.success('Aula excluída.');
      coursesQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleMoveLesson = async (
    mod: CourseModule,
    index: number,
    dir: -1 | 1,
  ) => {
    const list = [...mod.lessons];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    try {
      await api.patch(`/admin/academy/modules/${mod.id}/lessons/reorder`, {
        ids: list.map((l) => l.id),
      });
      coursesQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleUploadMaterial = async (lessonId: string, file?: File) => {
    if (!file) return;
    setUploadingMaterial(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', file.name);
      await api.postForm(`/admin/academy/lessons/${lessonId}/materials`, form);
      toast.success('Material adicionado à aula!');
      coursesQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      await api.delete(`/admin/academy/materials/${materialId}`);
      toast.success('Material removido.');
      coursesQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // ─── Handlers: Matrícula Cortesia ─────────────────────────
  const handleGrantEnrollment = async (event: FormEvent) => {
    event.preventDefault();
    if (!grantCourseId) {
      toast.error('Selecione um curso.');
      return;
    }
    setGrantSaving(true);
    try {
      await api.post('/admin/academy/enrollments/grant', {
        courseId: grantCourseId,
        ...(grantMode === 'existing'
          ? { studentId: grantStudentId }
          : {
              studentEmail: grantEmail.trim(),
              studentName: grantName.trim(),
              studentPassword: grantPassword.trim() || undefined,
            }),
      });
      toast.success('Matrícula liberada e e-mail enviado ao aluno!');
      setGrantModalOpen(false);
      reloadAll();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setGrantSaving(false);
    }
  };

  const handleToggleEnrollmentStatus = async (
    enrollmentId: string,
    currentStatus: 'ACTIVE' | 'REVOKED',
  ) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';
    try {
      await api.patch(`/admin/academy/enrollments/${enrollmentId}/status`, {
        status: nextStatus,
      });
      toast.success(
        nextStatus === 'ACTIVE' ? 'Matrícula reativada.' : 'Matrícula revogada.',
      );
      studentsQuery.reload();
      overviewQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // ─── Handlers: Cupons ─────────────────────────────────────
  const handleCreateCoupon = async (event: FormEvent) => {
    event.preventDefault();
    setSavingCoupon(true);
    try {
      const value =
        couponType === 'PERCENTAGE'
          ? Math.round(Number(couponValue) || 10)
          : parseBRLToCents(couponValue);

      await api.post('/admin/academy/coupons', {
        code: couponCode.trim().toUpperCase(),
        discountType: couponType,
        discountValue: value,
        maxUses: couponMaxUses ? Number(couponMaxUses) : null,
        expiresAt: couponExpiresAt || null,
        courseId: couponCourseId || null,
        active: true,
      });
      toast.success('Cupom criado!');
      setCouponModalOpen(false);
      setCouponCode('');
      couponsQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleToggleCoupon = async (coupon: AcademyCoupon) => {
    try {
      await api.patch(`/admin/academy/coupons/${coupon.id}`, {
        active: !coupon.active,
      });
      couponsQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm('Excluir este cupom?')) return;
    try {
      await api.delete(`/admin/academy/coupons/${couponId}`);
      toast.success('Cupom excluído.');
      couponsQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // ─── Handlers: Comentários ────────────────────────────────
  const handleReplyComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!replyTarget || !replyContent.trim()) return;
    setSendingReply(true);
    try {
      await api.post(`/admin/academy/comments/${replyTarget.id}/reply`, {
        content: replyContent.trim(),
      });
      toast.success('Resposta publicada e enviada por e-mail ao aluno!');
      setReplyTarget(null);
      setReplyContent('');
      commentsQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Excluir este comentário?')) return;
    try {
      await api.delete(`/admin/academy/comments/${commentId}`);
      toast.success('Comentário removido.');
      commentsQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const ov = overviewQuery.data;

  return (
    <div>
      <PageHeader
        title="PicPlus Academy"
        description="Gerencie cursos, grade de módulos e aulas, materiais complementares, alunos, vendas no Mercado Pago, cupons e dúvidas."
        actions={
          <>
            <ButtonLink to="/academy" target="_blank" $variant="secondary" $size="sm">
              <ExternalLink size={16} /> Ver Vitrine Academy
            </ButtonLink>
            {canManage && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setGrantCourseId(coursesQuery.data?.[0]?.id ?? '');
                  setGrantModalOpen(true);
                }}
              >
                <UserPlus size={16} /> Liberar Matrícula Cortesia
              </Button>
            )}
            {canEdit && (
              <Button size="sm" onClick={openNewCourse}>
                <Plus size={16} /> Novo Curso
              </Button>
            )}
          </>
        }
      />

      {ov && (
        <StatsGrid>
          <StatCard>
            <div className="icon">
              <BookOpen size={22} />
            </div>
            <div>
              <strong>
                {ov.publishedCourses}/{ov.totalCourses}
              </strong>
              <small>Cursos publicados</small>
            </div>
          </StatCard>
          <StatCard>
            <div className="icon">
              <Users size={22} />
            </div>
            <div>
              <strong>{ov.totalStudents}</strong>
              <small>Alunos cadastrados</small>
            </div>
          </StatCard>
          <StatCard>
            <div className="icon">
              <GraduationCap size={22} />
            </div>
            <div>
              <strong>{ov.activeEnrollments}</strong>
              <small>Matrículas ativas</small>
            </div>
          </StatCard>
          <StatCard>
            <div className="icon">
              <DollarSign size={22} />
            </div>
            <div>
              <strong>{formatCentsBRL(ov.totalRevenueCents)}</strong>
              <small>{ov.approvedSalesCount} vendas aprovadas</small>
            </div>
          </StatCard>
        </StatsGrid>
      )}

      <Toolbar>
        <Tabs<AcademyTab>
          value={tab}
          onChange={setTab}
          tabs={[
            {
              key: 'courses',
              label: 'Cursos & Grade',
              count: coursesQuery.data?.length,
            },
            {
              key: 'students',
              label: 'Alunos & Matrículas',
              count: studentsQuery.data?.length,
            },
            {
              key: 'orders',
              label: 'Vendas (Mercado Pago)',
              count: ordersQuery.data?.length,
            },
            {
              key: 'coupons',
              label: 'Cupons',
              count: couponsQuery.data?.length,
            },
            {
              key: 'comments',
              label: 'Dúvidas nas Aulas',
              count: commentsQuery.data?.length,
            },
          ]}
        />
      </Toolbar>

      {/* ─── ABA 1: CURSOS & GRADE ─────────────────────────── */}
      {tab === 'courses' && (
        <>
          {coursesQuery.loading && <Skeleton $h="260px" />}
          {coursesQuery.error && (
            <ErrorState
              message={coursesQuery.error.message}
              onRetry={coursesQuery.reload}
            />
          )}
          {!coursesQuery.loading &&
            (coursesQuery.data?.length ?? 0) === 0 && (
              <Panel>
                <EmptyState
                  title="Nenhum curso criado ainda"
                  description="Clique em 'Novo Curso' para publicar o primeiro treinamento da PicPlus Academy."
                />
              </Panel>
            )}

          {!coursesQuery.loading && (coursesQuery.data?.length ?? 0) > 0 && (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Preço</th>
                    <th>Conteúdo</th>
                    <th>Alunos</th>
                    <th>Status</th>
                    <th className="right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesQuery.data!.map((course) => {
                    const lessonsTotal =
                      course.modules?.reduce(
                        (s, m) => s + m.lessons.length,
                        0,
                      ) ?? 0;
                    return (
                      <tr key={course.id}>
                        <td>
                          <CellMain>
                            <Avatar
                              src={course.coverImage}
                              name={course.title}
                              size={46}
                            />
                            <div>
                              <strong>{course.title}</strong>
                              <small>
                                {course.instructorName} ·{' '}
                                {COURSE_LEVEL_LABEL[course.level]} ·{' '}
                                {course.workloadHours}h
                              </small>
                            </div>
                          </CellMain>
                        </td>
                        <td>
                          <strong>{formatCentsBRL(course.priceCents)}</strong>
                          {course.compareAtPriceCents ? (
                            <div>
                              <small style={{ textDecoration: 'line-through' }}>
                                {formatCentsBRL(course.compareAtPriceCents)}
                              </small>
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setCurriculumCourseId(course.id)}
                          >
                            <Layers size={15} /> {course.modules?.length ?? 0}{' '}
                            módulos · {lessonsTotal} aulas
                          </Button>
                        </td>
                        <td>{course._count?.enrollments ?? 0}</td>
                        <td>
                          <StatusPill
                            tone={course.published ? 'success' : 'neutral'}
                          >
                            {course.published ? 'Publicado' : 'Rascunho'}
                          </StatusPill>
                        </td>
                        <td className="right">
                          <RowActions>
                            <IconButton
                              label="Gerenciar módulos, aulas e materiais"
                              onClick={() => setCurriculumCourseId(course.id)}
                            >
                              <Layers size={17} />
                            </IconButton>
                            {canEdit && (
                              <IconButton
                                label="Editar dados do curso"
                                onClick={() => openEditCourse(course)}
                              >
                                <Pencil size={17} />
                              </IconButton>
                            )}
                            {canManage && (
                              <IconButton
                                label="Excluir curso"
                                danger
                                onClick={() => setDeletingCourse(course)}
                              >
                                <Trash2 size={17} />
                              </IconButton>
                            )}
                          </RowActions>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </>
      )}

      {/* ─── ABA 2: ALUNOS & MATRÍCULAS ────────────────────── */}
      {tab === 'students' && (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Contato / CPF</th>
                <th>Cursos Matriculados & Progresso</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {(studentsQuery.data ?? []).map((st) => (
                <tr key={st.id}>
                  <td>
                    <CellMain>
                      <Avatar src={st.avatarUrl} name={st.name} size={40} />
                      <div>
                        <strong>{st.name}</strong>
                        <small>{st.email}</small>
                      </div>
                    </CellMain>
                  </td>
                  <td>
                    <div>{st.phone || '—'}</div>
                    <small style={{ color: '#737373' }}>
                      {st.cpf ? `CPF: ${st.cpf}` : ''}
                    </small>
                  </td>
                  <td>
                    {st.enrollments.length === 0 ? (
                      <span style={{ color: '#737373' }}>
                        Nenhuma matrícula
                      </span>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.55rem',
                        }}
                      >
                        {st.enrollments.map((enr) => (
                          <div
                            key={enr.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <strong style={{ fontSize: '0.88rem' }}>
                              {enr.courseTitle}
                            </strong>
                            <StatusPill
                              tone={
                                enr.status === 'ACTIVE' ? 'success' : 'danger'
                              }
                            >
                              {enr.status === 'ACTIVE' ? 'Ativa' : 'Revogada'}
                            </StatusPill>
                            <StatusPill tone="neutral">
                              {enr.source === 'ADMIN_GRANT'
                                ? 'Cortesia'
                                : enr.source === 'FREE_COURSE'
                                  ? 'Gratuito'
                                  : 'Compra'}
                            </StatusPill>
                            <ProgressBar $pct={enr.progressPercent} />
                            <small>{enr.progressPercent}%</small>
                            {enr.certificateCode && (
                              <a
                                href={`/academy/certificado/${enr.certificateCode}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#B6E829',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <Award size={14} /> {enr.certificateCode}
                              </a>
                            )}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleEnrollmentStatus(
                                    enr.id,
                                    enr.status,
                                  )
                                }
                                style={{
                                  fontSize: '0.75rem',
                                  color:
                                    enr.status === 'ACTIVE'
                                      ? '#ef4444'
                                      : '#B6E829',
                                  textDecoration: 'underline',
                                }}
                              >
                                {enr.status === 'ACTIVE'
                                  ? 'Revogar'
                                  : 'Reativar'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="muted">
                    {new Date(st.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {/* ─── ABA 3: VENDAS & PEDIDOS ───────────────────────── */}
      {tab === 'orders' && (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Pedido / Data</th>
                <th>Aluno</th>
                <th>Curso</th>
                <th>Valor Final</th>
                <th>Status Mercado Pago</th>
              </tr>
            </thead>
            <tbody>
              {(ordersQuery.data ?? []).map((ord) => (
                <tr key={ord.id}>
                  <td>
                    <CellMain>
                      <div>
                        <strong>#{ord.id.slice(0, 8).toUpperCase()}</strong>
                        <small>
                          {new Date(ord.createdAt).toLocaleString('pt-BR')}
                        </small>
                      </div>
                    </CellMain>
                  </td>
                  <td>
                    <div>{ord.student?.name}</div>
                    <small style={{ color: '#737373' }}>
                      {ord.student?.email}
                    </small>
                  </td>
                  <td>{ord.course?.title}</td>
                  <td>
                    <strong>{formatCentsBRL(ord.finalPriceCents)}</strong>
                    {ord.coupon && (
                      <div>
                        <small style={{ color: '#B6E829' }}>
                          Cupom: {ord.coupon.code} (-
                          {formatCentsBRL(ord.discountCents)})
                        </small>
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusPill
                      tone={
                        ord.status === 'APPROVED'
                          ? 'success'
                          : ord.status === 'PENDING'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {ord.status === 'APPROVED'
                        ? 'Aprovado'
                        : ord.status === 'PENDING'
                          ? 'Aguardando pagamento'
                          : ord.status === 'REFUNDED'
                            ? 'Estornado'
                            : 'Cancelado / Recusado'}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {/* ─── ABA 4: CUPONS DE DESCONTO ─────────────────────── */}
      {tab === 'coupons' && (
        <div>
          {canManage && (
            <div style={{ marginBottom: '1rem' }}>
              <Button size="sm" onClick={() => setCouponModalOpen(true)}>
                <Ticket size={16} /> Novo Cupom de Desconto
              </Button>
            </div>
          )}
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Desconto</th>
                  <th>Curso Alvo</th>
                  <th>Usos</th>
                  <th>Status</th>
                  <th className="right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(couponsQuery.data ?? []).map((cp) => (
                  <tr key={cp.id}>
                    <td>
                      <strong
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '1rem',
                          color: '#B6E829',
                        }}
                      >
                        {cp.code}
                      </strong>
                    </td>
                    <td>
                      {cp.discountType === 'PERCENTAGE'
                        ? `${cp.discountValue}% OFF`
                        : `${formatCentsBRL(cp.discountValue)} OFF`}
                    </td>
                    <td>{cp.course?.title ?? 'Todos os cursos'}</td>
                    <td>
                      {cp.usedCount}
                      {cp.maxUses ? ` / ${cp.maxUses}` : ' (ilimitado)'}
                    </td>
                    <td>
                      <StatusPill tone={cp.active ? 'success' : 'neutral'}>
                        {cp.active ? 'Ativo' : 'Desativado'}
                      </StatusPill>
                    </td>
                    <td className="right">
                      {canManage && (
                        <RowActions>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleCoupon(cp)}
                          >
                            {cp.active ? 'Pausar' : 'Ativar'}
                          </Button>
                          <IconButton
                            label="Excluir cupom"
                            danger
                            onClick={() => handleDeleteCoupon(cp.id)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </RowActions>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </div>
      )}

      {/* ─── ABA 5: DÚVIDAS NAS AULAS ──────────────────────── */}
      {tab === 'comments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(commentsQuery.data ?? []).length === 0 ? (
            <Panel>
              <EmptyState
                title="Nenhuma dúvida publicada ainda"
                description="Quando os alunos enviarem perguntas nas aulas, elas aparecerão aqui para você responder."
              />
            </Panel>
          ) : (
            commentsQuery.data!.map((c) => (
              <Panel key={c.id} style={{ padding: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    marginBottom: '0.65rem',
                  }}
                >
                  <div>
                    <strong>{c.student?.name ?? c.adminUser?.name}</strong>
                    <span
                      style={{
                        color: '#737373',
                        fontSize: '0.82rem',
                        marginLeft: '0.6rem',
                      }}
                    >
                      em{' '}
                      <strong style={{ color: '#B6E829' }}>
                        {c.lesson?.module.course.title}
                      </strong>{' '}
                      → {c.lesson?.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {canEdit && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setReplyTarget(c);
                            setReplyContent('');
                          }}
                        >
                          <Reply size={15} /> Responder
                        </Button>
                        <IconButton
                          label="Excluir comentário"
                          danger
                          onClick={() => handleDeleteComment(c.id)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </>
                    )}
                  </div>
                </div>
                <p style={{ color: '#e5e5e5', lineHeight: 1.6 }}>{c.content}</p>

                {(c.replies?.length ?? 0) > 0 && (
                  <div
                    style={{
                      marginTop: '0.85rem',
                      paddingLeft: '1rem',
                      borderLeft: '2px solid #B6E829',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}
                  >
                    {c.replies!.map((rep) => (
                      <div key={rep.id} style={{ fontSize: '0.9rem' }}>
                        <strong style={{ color: '#B6E829' }}>
                          {rep.adminUser
                            ? `${rep.adminUser.name} (Equipe PicPlus)`
                            : rep.student?.name}
                        </strong>
                        : {rep.content}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            ))
          )}
        </div>
      )}

      {/* ─── MODAL: CRIAR / EDITAR CURSO ───────────────────── */}
      <Modal
        open={courseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        title={editingCourse ? 'Editar Curso' : 'Novo Curso — PicPlus Academy'}
        description="Configure as informações comerciais, instrutor e apresentação do curso."
        variant="drawer"
        width="740px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCourseModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="academy-course-form" loading={savingCourse}>
              Salvar Curso
            </Button>
          </>
        }
      >
        <FormStack id="academy-course-form" onSubmit={handleSaveCourse}>
          {courseError && <Alert tone="danger">{courseError}</Alert>}

          <TextField
            label="Título do curso"
            required
            value={courseForm.title}
            onChange={(e) =>
              setCourseForm({ ...courseForm, title: e.target.value })
            }
            placeholder="Ex.: Dominando Vídeos Curtos e Posicionamento Digital"
          />

          <FormGrid $cols={2}>
            <TextField
              label="Subtítulo comercial"
              value={courseForm.subtitle}
              onChange={(e) =>
                setCourseForm({ ...courseForm, subtitle: e.target.value })
              }
              placeholder="Frase curta de impacto exibida abaixo do título"
            />
            <TextField
              label="Categoria"
              value={courseForm.category}
              onChange={(e) =>
                setCourseForm({ ...courseForm, category: e.target.value })
              }
              placeholder="Ex.: Influência, Audiovisual, Marketing"
            />
          </FormGrid>

          <FormGrid $cols={3}>
            <TextField
              label="Preço de venda (R$)"
              required
              value={courseForm.priceBRL}
              onChange={(e) =>
                setCourseForm({ ...courseForm, priceBRL: e.target.value })
              }
              placeholder="297,00 (ou 0,00 para gratuito)"
            />
            <TextField
              label="Preço 'De' riscado (R$)"
              value={courseForm.compareAtPriceBRL}
              onChange={(e) =>
                setCourseForm({
                  ...courseForm,
                  compareAtPriceBRL: e.target.value,
                })
              }
              placeholder="Ex.: 497,00"
            />
            <TextField
              label="Carga horária (horas)"
              type="number"
              min={1}
              required
              value={courseForm.workloadHours}
              onChange={(e) =>
                setCourseForm({ ...courseForm, workloadHours: e.target.value })
              }
            />
          </FormGrid>

          <FormGrid $cols={2}>
            <SelectField
              label="Nível do curso"
              value={courseForm.level}
              onChange={(e) =>
                setCourseForm({
                  ...courseForm,
                  level: e.target.value as CourseLevel,
                })
              }
              options={[
                { value: 'BEGINNER', label: 'Iniciante' },
                { value: 'INTERMEDIATE', label: 'Intermediário' },
                { value: 'ADVANCED', label: 'Avançado' },
              ]}
            />
            <TextField
              label="Vídeo Trailer / Apresentação (YouTube URL ou ID)"
              value={courseForm.promoVideoUrl}
              onChange={(e) =>
                setCourseForm({ ...courseForm, promoVideoUrl: e.target.value })
              }
              placeholder="https://youtube.com/watch?v=..."
            />
          </FormGrid>

          <UploadField
            label="Imagem de capa do curso (16:9)"
            value={courseForm.coverImage}
            onChange={(url) =>
              setCourseForm({ ...courseForm, coverImage: url })
            }
          />

          <TextArea
            label="Descrição completa do curso"
            required
            value={courseForm.description}
            onChange={(e) =>
              setCourseForm({ ...courseForm, description: e.target.value })
            }
            placeholder="Explique para quem é o curso, metodologia e transformação esperada…"
          />

          <TextArea
            label="O que está incluso / O que o aluno vai aprender (1 item por linha)"
            value={courseForm.featuresText}
            onChange={(e) =>
              setCourseForm({ ...courseForm, featuresText: e.target.value })
            }
          />

          <FormGrid $cols={2}>
            <TextField
              label="Nome do Instrutor(a)"
              required
              value={courseForm.instructorName}
              onChange={(e) =>
                setCourseForm({
                  ...courseForm,
                  instructorName: e.target.value,
                })
              }
            />
            <UploadField
              label="Foto do Instrutor(a)"
              shape="square"
              value={courseForm.instructorAvatar}
              onChange={(url) =>
                setCourseForm({ ...courseForm, instructorAvatar: url })
              }
            />
          </FormGrid>

          <TextArea
            label="Mini-bio do Instrutor(a)"
            value={courseForm.instructorBio}
            onChange={(e) =>
              setCourseForm({ ...courseForm, instructorBio: e.target.value })
            }
            style={{ minHeight: 80 }}
          />

          <FormGrid $cols={2}>
            <Switch
              label="Curso Publicado"
              description="Exibe o curso no catálogo da PicPlus Academy."
              checked={courseForm.published}
              onChange={(v) => setCourseForm({ ...courseForm, published: v })}
            />
            <Switch
              label="Curso em Destaque"
              description="Posiciona no topo da vitrine da Academy."
              checked={courseForm.featured}
              onChange={(v) => setCourseForm({ ...courseForm, featured: v })}
            />
          </FormGrid>
        </FormStack>
      </Modal>

      {/* ─── MODAL: CONSTRUTOR DE GRADE CURRICULAR ─────────── */}
      <Modal
        open={!!activeCurriculumCourse}
        onClose={() => setCurriculumCourseId(null)}
        title={
          activeCurriculumCourse
            ? `Grade Curricular: ${activeCurriculumCourse.title}`
            : 'Grade Curricular'
        }
        description="Organize os módulos, cadastre as videoaulas (YouTube, Vimeo, Panda ou Upload R2) e suba apostilas/materiais em PDF."
        width="960px"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCurriculumCourseId(null)}
            >
              Concluir Edição
            </Button>
            {canEdit && (
              <Button onClick={openNewModule}>
                <Plus size={16} /> Novo Módulo
              </Button>
            )}
          </>
        }
      >
        {activeCurriculumCourse && (
          <div>
            {(activeCurriculumCourse.modules?.length ?? 0) === 0 ? (
              <EmptyState
                title="Este curso ainda não possui módulos"
                description="Clique em 'Novo Módulo' abaixo para criar a estrutura do curso."
              />
            ) : (
              activeCurriculumCourse.modules!.map((mod, mIdx) => (
                <CurriculumModuleCard key={mod.id}>
                  <div className="mod-header">
                    <div>
                      <div className="mod-title">
                        Módulo {mIdx + 1}: {mod.title}
                      </div>
                      {mod.description && (
                        <small style={{ color: '#a3a3a3' }}>
                          {mod.description}
                        </small>
                      )}
                    </div>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openNewLesson(mod.id)}
                        >
                          <Plus size={14} /> Nova Aula
                        </Button>
                        <IconButton
                          label="Subir módulo"
                          disabled={mIdx === 0}
                          onClick={() => handleMoveModule(mIdx, -1)}
                        >
                          <ArrowUp size={15} />
                        </IconButton>
                        <IconButton
                          label="Descer módulo"
                          disabled={
                            mIdx ===
                            (activeCurriculumCourse.modules?.length ?? 1) - 1
                          }
                          onClick={() => handleMoveModule(mIdx, 1)}
                        >
                          <ArrowDown size={15} />
                        </IconButton>
                        <IconButton
                          label="Editar módulo"
                          onClick={() => openEditModule(mod)}
                        >
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton
                          label="Excluir módulo"
                          danger
                          onClick={() => handleDeleteModule(mod.id)}
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    )}
                  </div>

                  {mod.lessons.length === 0 ? (
                    <p
                      style={{
                        color: '#737373',
                        fontSize: '0.85rem',
                        padding: '0.5rem 0',
                      }}
                    >
                      Nenhuma aula neste módulo. Clique em "+ Nova Aula".
                    </p>
                  ) : (
                    mod.lessons.map((lesson, lIdx) => (
                      <LessonRow key={lesson.id}>
                        <div className="lesson-info">
                          <Video size={18} color="#B6E829" />
                          <div>
                            <div className="lesson-title">
                              {mIdx + 1}.{lIdx + 1} — {lesson.title}
                            </div>
                            <div className="lesson-meta">
                              <span>Fonte: {lesson.videoProvider}</span>
                              {lesson.durationSeconds > 0 && (
                                <span>
                                  · {formatDuration(lesson.durationSeconds)}
                                </span>
                              )}
                              {lesson.isFreePreview && (
                                <StatusPill tone="primary">
                                  Prévia Grátis
                                </StatusPill>
                              )}
                              {!lesson.published && (
                                <StatusPill tone="neutral">Oculta</StatusPill>
                              )}
                            </div>

                            {/* Materiais da aula */}
                            {(lesson.materials?.length ?? 0) > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '0.4rem',
                                  marginTop: '0.45rem',
                                }}
                              >
                                {lesson.materials!.map((mat) => (
                                  <MaterialChip key={mat.id}>
                                    <FileText size={13} color="#B6E829" />
                                    <a
                                      href={assetUrl(mat.fileUrl)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {mat.title}
                                    </a>
                                    {canEdit && (
                                      <button
                                        type="button"
                                        title="Remover material"
                                        onClick={() =>
                                          handleDeleteMaterial(mat.id)
                                        }
                                        style={{ color: '#ef4444' }}
                                      >
                                        ×
                                      </button>
                                    )}
                                  </MaterialChip>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {canEdit && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <label
                              style={{
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.78rem',
                                padding: '0.35rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #404040',
                                color: '#d4d4d4',
                              }}
                              title="Anexar apostila/PDF ou arquivo complementar"
                            >
                              <Upload size={13} />
                              {uploadingMaterial ? 'Enviando…' : '+ Material'}
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void handleUploadMaterial(lesson.id, f);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <IconButton
                              label="Subir aula"
                              disabled={lIdx === 0}
                              onClick={() =>
                                handleMoveLesson(mod, lIdx, -1)
                              }
                            >
                              <ArrowUp size={15} />
                            </IconButton>
                            <IconButton
                              label="Descer aula"
                              disabled={lIdx === mod.lessons.length - 1}
                              onClick={() => handleMoveLesson(mod, lIdx, 1)}
                            >
                              <ArrowDown size={15} />
                            </IconButton>
                            <IconButton
                              label="Editar aula"
                              onClick={() => openEditLesson(lesson)}
                            >
                              <Pencil size={15} />
                            </IconButton>
                            <IconButton
                              label="Excluir aula"
                              danger
                              onClick={() => handleDeleteLesson(lesson.id)}
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </div>
                        )}
                      </LessonRow>
                    ))
                  )}
                </CurriculumModuleCard>
              ))
            )}
          </div>
        )}
      </Modal>

      {/* ─── MODAL: CRIAR / EDITAR MÓDULO ──────────────────── */}
      <Modal
        open={moduleModalOpen}
        onClose={() => setModuleModalOpen(false)}
        title={editingModule ? 'Editar Módulo' : 'Novo Módulo'}
        width="480px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModuleModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="academy-module-form"
              loading={savingModule}
            >
              Salvar Módulo
            </Button>
          </>
        }
      >
        <FormStack id="academy-module-form" onSubmit={handleSaveModule}>
          <TextField
            label="Título do módulo"
            required
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            placeholder="Ex.: Módulo 1 — Fundamentos e Posicionamento"
          />
          <TextField
            label="Objetivo / resumo do módulo"
            value={moduleDesc}
            onChange={(e) => setModuleDesc(e.target.value)}
            placeholder="Breve descrição do que será abordado neste módulo"
          />
        </FormStack>
      </Modal>

      {/* ─── MODAL: CRIAR / EDITAR AULA (VÍDEO HÍBRIDO) ────── */}
      <Modal
        open={lessonModalOpen}
        onClose={() => setLessonModalOpen(false)}
        title={editingLesson ? 'Editar Aula' : 'Nova Aula'}
        description="Escolha entre link externo (YouTube, Vimeo, Panda Video) ou envie o vídeo direto para o Cloudflare R2."
        width="640px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLessonModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="academy-lesson-form"
              loading={savingLesson}
            >
              Salvar Aula
            </Button>
          </>
        }
      >
        <FormStack id="academy-lesson-form" onSubmit={handleSaveLesson}>
          <FormGrid $cols={2}>
            <TextField
              label="Título da aula"
              required
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Ex.: Aula 01 — Como estruturar seu roteiro"
            />
            <TextField
              label="Duração estimada (em minutos)"
              type="number"
              min={1}
              value={lessonDurationMin}
              onChange={(e) => setLessonDurationMin(e.target.value)}
            />
          </FormGrid>

          <div>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                marginBottom: '0.45rem',
              }}
            >
              Fonte do vídeo da aula
            </p>
            <Chips>
              <Chip
                type="button"
                $active={lessonProvider === 'YOUTUBE'}
                onClick={() => setLessonProvider('YOUTUBE')}
              >
                YouTube (Não listado / Público)
              </Chip>
              <Chip
                type="button"
                $active={lessonProvider === 'VIMEO'}
                onClick={() => setLessonProvider('VIMEO')}
              >
                Vimeo
              </Chip>
              <Chip
                type="button"
                $active={lessonProvider === 'PANDA'}
                onClick={() => setLessonProvider('PANDA')}
              >
                Panda Video / Embed
              </Chip>
              <Chip
                type="button"
                $active={lessonProvider === 'UPLOAD'}
                onClick={() => setLessonProvider('UPLOAD')}
              >
                Enviar arquivo (Cloudflare R2)
              </Chip>
            </Chips>
          </div>

          {lessonProvider === 'UPLOAD' ? (
            <VideoUploadField
              label="Arquivo de vídeo da aula (MP4, WebM ou MOV)"
              value={lessonVideoUrl || null}
              onChange={(url) => setLessonVideoUrl(url ?? '')}
              onProbe={(probe) => {
                if (probe.duration) {
                  setLessonDurationMin(
                    String(Math.max(1, Math.round(probe.duration / 60))),
                  );
                }
              }}
            />
          ) : (
            <TextField
              label={
                lessonProvider === 'YOUTUBE'
                  ? 'Link ou ID do YouTube'
                  : lessonProvider === 'VIMEO'
                    ? 'Link ou ID do Vimeo'
                    : 'URL do Player (Embed Panda Video)'
              }
              value={lessonVideoUrl}
              onChange={(e) => setLessonVideoUrl(e.target.value)}
              placeholder={
                lessonProvider === 'YOUTUBE'
                  ? 'https://youtu.be/... ou ID de 11 caracteres'
                  : 'https://...'
              }
            />
          )}

          <TextArea
            label="Resumo / Anotações da aula"
            value={lessonDesc}
            onChange={(e) => setLessonDesc(e.target.value)}
            placeholder="Texto complementar, links úteis ou resumo exibido abaixo do player…"
          />

          <FormGrid $cols={2}>
            <Switch
              label="Aula Demonstrativa Grátis"
              description="Permite que visitantes assistam esta aula na página de vendas antes de comprar."
              checked={lessonFreePreview}
              onChange={setLessonFreePreview}
            />
            <Switch
              label="Aula Publicada"
              description="Desative para manter a aula oculta enquanto prepara o conteúdo."
              checked={lessonPublished}
              onChange={setLessonPublished}
            />
          </FormGrid>
        </FormStack>
      </Modal>

      {/* ─── MODAL: MATRÍCULA CORTESIA / MANUAL ────────────── */}
      <Modal
        open={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        title="Liberar Matrícula Manual / Cortesia"
        description="Conceda acesso gratuito a qualquer curso para um aluno já cadastrado ou crie a conta dele agora."
        width="520px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setGrantModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="grant-enrollment-form"
              loading={grantSaving}
            >
              Liberar Acesso Agora
            </Button>
          </>
        }
      >
        <FormStack id="grant-enrollment-form" onSubmit={handleGrantEnrollment}>
          <SelectField
            label="Curso a ser liberado"
            required
            value={grantCourseId}
            onChange={(e) => setGrantCourseId(e.target.value)}
            placeholder="Selecione o curso…"
            options={(coursesQuery.data ?? []).map((c) => ({
              value: c.id,
              label: c.title,
            }))}
          />

          <Chips>
            <Chip
              type="button"
              $active={grantMode === 'new'}
              onClick={() => setGrantMode('new')}
            >
              Informar E-mail (Cria conta se não existir)
            </Chip>
            <Chip
              type="button"
              $active={grantMode === 'existing'}
              onClick={() => setGrantMode('existing')}
            >
              Selecionar Aluno da Lista
            </Chip>
          </Chips>

          {grantMode === 'existing' ? (
            <SelectField
              label="Aluno cadastrado"
              required
              value={grantStudentId}
              onChange={(e) => setGrantStudentId(e.target.value)}
              placeholder="Escolha o aluno…"
              options={(studentsQuery.data ?? []).map((s) => ({
                value: s.id,
                label: `${s.name} (${s.email})`,
              }))}
            />
          ) : (
            <>
              <TextField
                label="Nome completo do aluno"
                required
                value={grantName}
                onChange={(e) => setGrantName(e.target.value)}
                placeholder="Ex.: Lucas Ferreira"
              />
              <TextField
                label="E-mail do aluno"
                type="email"
                required
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="lucas@exemplo.com.br"
              />
              <TextField
                label="Senha inicial (se o aluno ainda não tiver conta)"
                value={grantPassword}
                onChange={(e) => setGrantPassword(e.target.value)}
                placeholder="Ex.: Mudar123! (se vazio, gera automaticamente)"
              />
            </>
          )}
        </FormStack>
      </Modal>

      {/* ─── MODAL: NOVO CUPOM ─────────────────────────────── */}
      <Modal
        open={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        title="Novo Cupom de Desconto"
        width="500px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCouponModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="academy-coupon-form"
              loading={savingCoupon}
            >
              Criar Cupom
            </Button>
          </>
        }
      >
        <FormStack id="academy-coupon-form" onSubmit={handleCreateCoupon}>
          <TextField
            label="Código do cupom"
            required
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Ex.: PICPLUS20"
          />
          <FormGrid $cols={2}>
            <SelectField
              label="Tipo de desconto"
              value={couponType}
              onChange={(e) =>
                setCouponType(e.target.value as CouponDiscountType)
              }
              options={[
                { value: 'PERCENTAGE', label: 'Porcentagem (%)' },
                { value: 'FIXED_CENTS', label: 'Valor fixo (R$)' },
              ]}
            />
            <TextField
              label={
                couponType === 'PERCENTAGE'
                  ? 'Percentual (1 a 100%)'
                  : 'Valor do desconto (R$)'
              }
              required
              value={couponValue}
              onChange={(e) => setCouponValue(e.target.value)}
              placeholder={couponType === 'PERCENTAGE' ? '15' : '50,00'}
            />
          </FormGrid>
          <FormGrid $cols={2}>
            <TextField
              label="Limite máximo de usos"
              type="number"
              min={1}
              value={couponMaxUses}
              onChange={(e) => setCouponMaxUses(e.target.value)}
              placeholder="Vazio = ilimitado"
            />
            <TextField
              label="Válido até"
              type="date"
              value={couponExpiresAt}
              onChange={(e) => setCouponExpiresAt(e.target.value)}
            />
          </FormGrid>
          <SelectField
            label="Restringir a um curso específico"
            value={couponCourseId}
            onChange={(e) => setCouponCourseId(e.target.value)}
            placeholder="Válido em todos os cursos"
            options={(coursesQuery.data ?? []).map((c) => ({
              value: c.id,
              label: c.title,
            }))}
          />
        </FormStack>
      </Modal>

      {/* ─── MODAL: RESPONDER DÚVIDA DO ALUNO ──────────────── */}
      <Modal
        open={!!replyTarget}
        onClose={() => setReplyTarget(null)}
        title="Responder Dúvida do Aluno"
        description={
          replyTarget
            ? `Respondendo a ${replyTarget.student?.name} na aula "${replyTarget.lesson?.title}"`
            : undefined
        }
        width="540px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReplyTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="reply-comment-form"
              loading={sendingReply}
            >
              <MessageSquare size={16} /> Publicar Resposta
            </Button>
          </>
        }
      >
        <FormStack id="reply-comment-form" onSubmit={handleReplyComment}>
          {replyTarget && (
            <div
              style={{
                padding: '0.85rem',
                background: '#0a0a0a',
                borderRadius: '8px',
                borderLeft: '3px solid #B6E829',
                fontSize: '0.9rem',
                color: '#d4d4d4',
              }}
            >
              "{replyTarget.content}"
            </div>
          )}
          <TextArea
            label="Sua resposta (como Equipe PicPlus)"
            required
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Escreva a orientação para o aluno…"
          />
        </FormStack>
      </Modal>

      <ConfirmDialog
        open={!!deletingCourse}
        title="Excluir Curso"
        message={
          <>
            Tem certeza que deseja excluir o curso{' '}
            <strong>{deletingCourse?.title}</strong> e todas as suas aulas? Esta
            ação não pode ser desfeita.
          </>
        }
        onConfirm={handleDeleteCourse}
        onCancel={() => setDeletingCourse(null)}
      />
    </div>
  );
}
