import { API_URL, ApiError, assetUrl, withQuery } from './api';

const API_BASE = `${API_URL}/api`;
const STUDENT_TOKEN_KEY = 'picplus_student_token';
export const STUDENT_AUTH_EXPIRED_EVENT = 'picplus:student-auth-expired';

export const studentTokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(STUDENT_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(STUDENT_TOKEN_KEY, token);
    } catch {
      /* noop */
    }
  },
  clear() {
    try {
      localStorage.removeItem(STUDENT_TOKEN_KEY);
    } catch {
      /* noop */
    }
  },
};

type Query = Record<string, string | number | boolean | undefined | null>;

async function studentRequest<T>(
  method: string,
  path: string,
  options: { body?: unknown; form?: FormData; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = studentTokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body,
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      0,
    );
  }

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const raw = (data as { message?: string | string[] } | null)?.message;
    const details = Array.isArray(raw) ? raw : [];
    const message = Array.isArray(raw)
      ? raw[0]
      : (raw ?? 'Algo deu errado. Tente novamente.');

    if (
      response.status === 401 &&
      token &&
      !path.startsWith('/academy/auth/login')
    ) {
      studentTokenStore.clear();
      window.dispatchEvent(new Event(STUDENT_AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(message, response.status, details);
  }
  return data as T;
}

export const studentApi = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    studentRequest<T>('GET', withQuery(path, query), { signal }),
  post: <T>(path: string, body?: unknown) =>
    studentRequest<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) =>
    studentRequest<T>('PATCH', path, { body }),
  delete: <T>(path: string) => studentRequest<T>('DELETE', path),
  postForm: <T>(path: string, form: FormData) =>
    studentRequest<T>('POST', path, { form }),
};

// ─────────────────────────────────────────────────────────────
// Tipos — PicPlus Academy
// ─────────────────────────────────────────────────────────────

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type LessonVideoProvider = 'YOUTUBE' | 'VIMEO' | 'PANDA' | 'UPLOAD';
export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_CENTS';
export type CourseOrderStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'CANCELED';
export type EnrollmentSource = 'PURCHASE' | 'ADMIN_GRANT' | 'FREE_COURSE';
export type EnrollmentStatus = 'ACTIVE' | 'REVOKED';

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface LessonMaterial {
  id: string;
  title: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  order: number;
}

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  videoProvider: LessonVideoProvider;
  videoUrl: string | null;
  durationSeconds: number;
  isFreePreview: boolean;
  published: boolean;
  order: number;
  materials?: LessonMaterial[];
  materialsCount?: number;
  completed?: boolean;
  lastPositionSeconds?: number;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
  lessons: CourseLesson[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string;
  coverImage: string | null;
  promoVideoUrl: string | null;
  instructorName: string;
  instructorBio: string | null;
  instructorAvatar: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  workloadHours: number;
  level: CourseLevel;
  category: string | null;
  features: string[];
  published: boolean;
  featured: boolean;
  order: number;
  createdAt: string;
  modules?: CourseModule[];
  modulesCount?: number;
  lessonsCount?: number;
  totalDurationSeconds?: number;
  _count?: {
    modules: number;
    enrollments: number;
    orders: number;
  };
}

export interface AcademyOverview {
  totalCourses: number;
  publishedCourses: number;
  totalStudents: number;
  activeEnrollments: number;
  approvedSalesCount: number;
  totalRevenueCents: number;
  totalComments: number;
}

export interface AcademyCoupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  courseId: string | null;
  course?: { id: string; title: string } | null;
  createdAt: string;
}

export interface AdminStudentItem {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  avatarUrl: string | null;
  active: boolean;
  createdAt: string;
  enrollments: Array<{
    id: string;
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    source: EnrollmentSource;
    status: EnrollmentStatus;
    completedAt: string | null;
    certificateCode: string | null;
    progressPercent: number;
    createdAt: string;
  }>;
}

export interface CourseOrderItem {
  id: string;
  studentId: string;
  courseId: string;
  originalPriceCents: number;
  discountCents: number;
  finalPriceCents: number;
  status: CourseOrderStatus;
  mpPreferenceId: string | null;
  mpPaymentId: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
  student?: { id: string; name: string; email: string; cpf: string | null };
  course?: { id: string; title: string; slug: string; coverImage?: string | null };
  coupon?: { id?: string; code: string } | null;
}

export interface StudentEnrolledCourse {
  enrollmentId: string;
  source: EnrollmentSource;
  enrolledAt: string;
  completedAt: string | null;
  certificateCode: string | null;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  nextLessonId: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    subtitle: string | null;
    coverImage: string | null;
    instructorName: string;
    instructorAvatar: string | null;
    workloadHours: number;
    level: CourseLevel;
    category: string | null;
  };
}

export interface ClassroomPayload {
  enrollment: {
    id: string;
    completedAt: string | null;
    certificateCode: string | null;
    totalLessons: number;
    completedLessons: number;
    progressPercent: number;
  };
  course: Course & {
    modules: CourseModule[];
  };
}

export interface LessonCommentItem {
  id: string;
  content: string;
  lessonId: string;
  studentId: string | null;
  adminUserId: string | null;
  parentCommentId: string | null;
  createdAt: string;
  student?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl: string | null;
  } | null;
  adminUser?: { id: string; name: string; avatarUrl: string | null } | null;
  lesson?: {
    id: string;
    title: string;
    module: {
      id: string;
      title: string;
      course: { id: string; title: string; slug: string };
    };
  };
  replies?: LessonCommentItem[];
}

export interface CertificatePublicData {
  certificateCode: string;
  issuedAt: string;
  studentName: string;
  studentCpfMasked: string | null;
  courseTitle: string;
  courseSlug: string;
  instructorName: string;
  workloadHours: number;
}

// ─────────────────────────────────────────────────────────────
// Tipos — Templates de E-mail (inspirado no Maskot Edu)
// ─────────────────────────────────────────────────────────────

export interface EmailBlock {
  id: string;
  type:
    | 'heading'
    | 'text'
    | 'button'
    | 'image'
    | 'divider'
    | 'spacer'
    | 'list'
    | 'callout';
  props: {
    text?: string;
    html?: string;
    label?: string;
    href?: string;
    src?: string;
    alt?: string;
    height?: number;
    items?: string[];
    level?: 'h1' | 'h2' | 'h3';
  };
  style?: {
    backgroundColor?: string;
    textColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    fontSize?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    borderRadius?: string;
  };
}

export interface EmailDesignJson {
  blocks: EmailBlock[];
  settings?: {
    backgroundColor?: string;
    cardBackgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    footerText?: string;
  };
}

export interface EmailTemplateItem {
  id: string;
  name: string;
  subject: string;
  trigger: string | null;
  body: string;
  designJson: EmailDesignJson | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string } | null;
}

export interface EmailTriggerOption {
  value: string;
  label: string;
  description: string;
  category: 'academy' | 'site';
}

export interface MergeTagDefinition {
  tag: string;
  label: string;
  example: string;
  category: 'Aluno' | 'Curso' | 'Pedido' | 'Certificado' | 'Site';
}

export type EmailLogStatus =
  | 'SIMULATED'
  | 'SENT'
  | 'SCHEDULED'
  | 'DELIVERED'
  | 'DELAYED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'COMPLAINED'
  | 'SUPPRESSED'
  | 'FAILED';

export interface EmailLogItem {
  id: string;
  resendEmailId: string | null;
  trigger: string | null;
  templateId: string | null;
  templateName: string | null;
  to: string;
  subject: string;
  status: EmailLogStatus;
  lastEvent: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  sentAt: string;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  complainedAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

export interface EmailLogsResponse {
  items: EmailLogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    issues: number;
    simulated: number;
  };
  webhookConfigured: boolean;
  resendConfigured: boolean;
}

export const EMAIL_LOG_STATUS_META: Record<
  EmailLogStatus,
  { label: string; tone: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  SIMULATED: { label: 'Simulado (local)', tone: 'neutral' },
  SCHEDULED: { label: 'Agendado', tone: 'info' },
  SENT: { label: 'Enviado', tone: 'info' },
  DELAYED: { label: 'Atrasado', tone: 'warning' },
  DELIVERED: { label: 'Entregue', tone: 'success' },
  OPENED: { label: 'Aberto', tone: 'primary' },
  CLICKED: { label: 'Clicado', tone: 'primary' },
  BOUNCED: { label: 'Retornou (Bounce)', tone: 'danger' },
  COMPLAINED: { label: 'Marcado como Spam', tone: 'danger' },
  SUPPRESSED: { label: 'Suprimido', tone: 'danger' },
  FAILED: { label: 'Falhou', tone: 'danger' },
};

// ─────────────────────────────────────────────────────────────
// Utilitários de Formatação e Player Híbrido
// ─────────────────────────────────────────────────────────────

export function formatCentsBRL(cents: number): string {
  if (cents <= 0) return 'Gratuito';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs}h ${remMins}min` : `${hrs}h`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  }
  return `${secs}s`;
}

export interface CouponValidationResult {
  couponId: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  originalPriceCents: number;
  discountCents: number;
  finalPriceCents: number;
}

export interface CheckoutResponse {
  orderId: string;
  freeEnrollment: boolean;
  courseSlug: string;
  preferenceId?: string;
  checkoutUrl: string;
  simulated?: boolean;
}

export const COURSE_LEVEL_LABEL: Record<CourseLevel, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
};

export const ORDER_STATUS_LABEL: Record<CourseOrderStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  REFUNDED: 'Reembolsado',
  CANCELED: 'Cancelado',
};

/**
 * Converte a fonte de vídeo híbrida em URL de iframe ou vídeo HTML5.
 */
export function resolveLessonVideoEmbed(
  provider: LessonVideoProvider,
  videoUrl: string | null | undefined,
): { kind: 'iframe' | 'video' | 'none'; src: string } {
  if (!videoUrl) return { kind: 'none', src: '' };
  const raw = videoUrl.trim();

  if (provider === 'UPLOAD') {
    return { kind: 'video', src: assetUrl(raw) ?? raw };
  }

  if (provider === 'YOUTUBE') {
    // Pode ser apenas o ID de 11 caracteres ou uma URL completa
    const idMatch =
      /^[\w-]{11}$/.exec(raw)?.[0] ??
      /(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/.exec(raw)?.[1];
    if (!idMatch) return { kind: 'none', src: '' };
    return {
      kind: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${idMatch}?rel=0&modestbranding=1`,
    };
  }

  if (provider === 'VIMEO') {
    const vimeoId = /(?:vimeo\.com\/(?:video\/)?)(\d+)/.exec(raw)?.[1] ?? (/^\d+$/.exec(raw)?.[0]);
    if (vimeoId) {
      return {
        kind: 'iframe',
        src: `https://player.vimeo.com/video/${vimeoId}?byline=0&portrait=0`,
      };
    }
    return { kind: 'iframe', src: raw };
  }

  // PANDA VIDEO ou outro embed externo
  return { kind: 'iframe', src: raw };
}
