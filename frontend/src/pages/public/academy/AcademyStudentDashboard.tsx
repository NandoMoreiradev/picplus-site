import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Camera,
  Mail,
  Play,
  PlayCircle,
  Receipt,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserCog,
  XCircle,
} from 'lucide-react';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { EmptyState, Skeleton } from '../../../components/ui/Feedback';
import { Container, Grid, Section } from '../../../components/ui/Layout';
import { useStudentAuth } from '../../../context/student-auth-context';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { assetUrl } from '../../../lib/api';
import {
  formatCentsBRL,
  ORDER_STATUS_LABEL,
  studentApi,
  type CourseOrderItem,
  type StudentEnrolledCourse,
  type StudentProfile,
} from '../../../lib/academy';

const PageWrapper = styled.div`
  min-height: 80vh;
  padding-bottom: 4rem;
`;

/* Section padrão tem 6rem no topo (pensado para landing); aqui é um painel. */
const DashSection = styled(Section)`
  padding-top: 2.25rem;
  padding-bottom: 2rem;

  @media (max-width: 900px) {
    padding-top: 1.5rem;
  }
`;

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] ?? '');
  return (first + last).toUpperCase();
}

function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const HeroBanner = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  background: linear-gradient(135deg, #18181b 0%, #0d0d0f 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 2.25rem 2.25rem 1.75rem;
  margin-bottom: 2rem;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);

  &::before {
    content: '';
    position: absolute;
    top: -40%;
    right: -15%;
    width: 480px;
    height: 480px;
    background: radial-gradient(circle, rgba(182, 232, 41, 0.12) 0%, transparent 65%);
    pointer-events: none;
  }
`;

const HeroTopRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.75rem;

  .student-profile {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .avatar-ring {
    position: relative;
    width: 66px;
    height: 66px;
    border-radius: 50%;
    background: linear-gradient(135deg, #b6e829, #7fae14);
    padding: 3px;
    flex-shrink: 0;
    box-shadow: 0 0 20px rgba(182, 232, 41, 0.25);
  }

  .avatar-inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #141416;
    display: grid;
    place-items: center;
    color: #b6e829;
    font-weight: 800;
    font-size: 1.35rem;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .student-name-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .student-name {
    font-size: 1.55rem;
    font-weight: 800;
    margin: 0;
    color: #ffffff;
    letter-spacing: -0.02em;
  }

  .student-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    background: rgba(182, 232, 41, 0.12);
    border: 1px solid rgba(182, 232, 41, 0.28);
    color: #b6e829;
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .student-email {
    font-size: 0.88rem;
    color: #a1a1aa;
    margin-top: 0.25rem;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 1rem;
  padding-top: 1.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  .stat-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 0.95rem 1.2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.045);
      border-color: rgba(182, 232, 41, 0.2);
    }
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(182, 232, 41, 0.1);
    color: #b6e829;
    flex-shrink: 0;
  }

  .stat-value {
    font-size: 1.45rem;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.15;
  }

  .stat-label {
    font-size: 0.76rem;
    color: #a1a1aa;
    font-weight: 600;
    margin-top: 2px;
  }
`;

const TabsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(24, 24, 27, 0.75);
  backdrop-filter: blur(12px);
  padding: 0.4rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 2rem;
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
`;

const ModernTab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: ${({ $active }) => ($active ? '#B6E829' : 'transparent')};
  color: ${({ $active }) => ($active ? '#0a0a0a' : '#a1a1aa')};
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: ${({ $active }) => ($active ? '#0a0a0a' : '#ffffff')};
    background: ${({ $active }) => ($active ? '#B6E829' : 'rgba(255, 255, 255, 0.05)')};
  }

  .badge-count {
    padding: 0.12rem 0.5rem;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 800;
    background: ${({ $active }) => ($active ? '#0a0a0a' : 'rgba(255, 255, 255, 0.1)')};
    color: ${({ $active }) => ($active ? '#B6E829' : '#ffffff')};
  }
`;

const CourseCard = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-5px);
    border-color: rgba(182, 232, 41, 0.38);
    box-shadow:
      0 20px 40px -10px rgba(0, 0, 0, 0.6),
      0 0 25px rgba(182, 232, 41, 0.12);

    .thumb img {
      transform: scale(1.05);
    }

    .play-overlay {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  .thumb {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #09090b;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
  }

  .thumb-badges {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    gap: 6px;
    z-index: 2;
  }

  .tag-badge {
    padding: 0.25rem 0.6rem;
    border-radius: 8px;
    font-size: 0.72rem;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .play-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.85);
    opacity: 0;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #b6e829;
    color: #0a0a0a;
    display: grid;
    place-items: center;
    box-shadow: 0 0 25px rgba(182, 232, 41, 0.6);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
    z-index: 3;
  }

  .card-body {
    padding: 1.45rem;
    display: flex;
    flex-direction: column;
    gap: 0.95rem;
    flex: 1;
  }

  .course-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .instructor-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.82rem;
    color: #a1a1aa;
  }

  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.025);
    padding: 0.75rem 0.9rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  .progress-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.78rem;
    color: #a1a1aa;
  }

  .progress-bar-bg {
    height: 7px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
    position: relative;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #b6e829, #95c518);
    box-shadow: 0 0 10px rgba(182, 232, 41, 0.35);
    transition: width 0.4s ease;
  }

  .card-actions {
    margin-top: auto;
    padding-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
`;

const OrdersContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const OrderCard = styled.div`
  padding: 1.35rem 1.6rem;
  border-radius: 18px;
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.16);
    background: #1b1b1e;
  }

  .order-meta {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .order-icon {
    width: 46px;
    height: 46px;
    border-radius: 13px;
    background: rgba(182, 232, 41, 0.1);
    color: #b6e829;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .order-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
  }

  .order-sub {
    font-size: 0.82rem;
    color: #a1a1aa;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .order-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
  }
`;

const ProfileLayout = styled.div`
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const ProfileColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 760px;
`;

const AvatarCard = styled.div`
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 1.75rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.6rem;

  .big-avatar {
    width: 116px;
    height: 116px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: #101012;
    border: 3px solid #b6e829;
    box-shadow: 0 0 24px rgba(182, 232, 41, 0.2);
    color: #b6e829;
    font-size: 2.2rem;
    font-weight: 800;
    margin-bottom: 0.4rem;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .av-name {
    font-size: 1.1rem;
    font-weight: 800;
    color: #fff;
  }

  .av-mail,
  .av-since {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: #a1a1aa;
    word-break: break-all;
  }

  .av-hint {
    font-size: 0.72rem;
    color: #71717a;
  }

  .av-since {
    margin-top: 0.6rem;
    padding-top: 0.9rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    width: 100%;
    justify-content: center;
  }
`;

const Feedback = styled.div<{ $type: 'success' | 'error' }>`
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.86rem;
  background: ${({ $type }) =>
    $type === 'success' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(239, 68, 68, 0.14)'};
  color: ${({ $type }) => ($type === 'success' ? '#22c55e' : '#ef4444')};
  border: 1px solid
    ${({ $type }) => ($type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)')};
`;

const ProfileCard = styled.div`
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
  }

  .notice {
    padding: 0.8rem 1rem;
    border-radius: 12px;
    background: rgba(182, 232, 41, 0.06);
    border: 1px solid rgba(182, 232, 41, 0.2);
    color: #e4e4e7;
    font-size: 0.82rem;
    line-height: 1.4;
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
  }

  .fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;

    &.full {
      grid-column: 1 / -1;
    }

    label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #a1a1aa;
    }

    small {
      font-size: 0.74rem;
      color: #71717a;
    }

    input {
      padding: 0.72rem 0.95rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: #101012;
      color: #ffffff;
      font-size: 0.92rem;
      transition: border-color 0.2s;

      &:focus {
        outline: none;
        border-color: #b6e829;
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }
`;

export function AcademyStudentDashboard() {
  usePageMeta(
    'Minha Área — PicPlus Academy',
    'Seus cursos, progresso e certificados na PicPlus Academy.',
  );

  const navigate = useNavigate();
  const { student, loading: authLoading, setStudent } = useStudentAuth();

  const [tab, setTab] = useState<'courses' | 'orders' | 'profile'>('courses');
  const [enrollments, setEnrollments] = useState<StudentEnrolledCourse[]>([]);
  const [orders, setOrders] = useState<CourseOrderItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [passwordMsg, setPasswordMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !student) {
      navigate('/academy/entrar?redirect=/academy/minha-area', { replace: true });
    }
  }, [authLoading, student, navigate]);

  useEffect(() => {
    if (!student) return;
    let active = true;

    // Utiliza Promise.allSettled para que uma eventual falha em pedidos
    // NUNCA impeça a exibição dos cursos adquiridos pelo aluno.
    Promise.allSettled([
      studentApi.get<StudentEnrolledCourse[]>('/academy/my-courses'),
      studentApi.get<CourseOrderItem[]>('/academy/my-orders'),
    ])
      .then(([coursesResult, ordersResult]) => {
        if (!active) return;
        setName(student.name);
        setPhone(student.phone ?? '');
        setCpf(student.cpf ?? '');

        if (coursesResult.status === 'fulfilled') {
          setEnrollments(coursesResult.value ?? []);
        } else {
          console.warn('Falha ao obter cursos:', coursesResult.reason);
        }

        if (ordersResult.status === 'fulfilled') {
          setOrders(ordersResult.value ?? []);
        } else {
          console.warn('Falha ao obter pedidos:', ordersResult.reason);
        }
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, [student]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await studentApi.patch<StudentProfile>('/academy/auth/me', {
        name: name.trim(),
        phone: phone.trim() || undefined,
        // string vazia limpa o campo no backend
        cpf: cpf.trim(),
      });
      setStudent(updated);
      setProfileMsg({ type: 'success', text: 'Dados atualizados com sucesso!' });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar dados cadastrais.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      await studentApi.patch('/academy/auth/password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMsg({ type: 'success', text: 'Senha atualizada com sucesso!' });
    } catch (err) {
      setPasswordMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao atualizar a senha.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMsg({ type: 'error', text: 'Selecione um arquivo de imagem.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'A imagem deve ter no máximo 5 MB.' });
      return;
    }
    setUploadingAvatar(true);
    setProfileMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const updated = await studentApi.postForm<StudentProfile>('/academy/auth/me/avatar', form);
      setStudent(updated);
      setProfileMsg({ type: 'success', text: 'Foto atualizada!' });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao enviar a foto.',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (authLoading || !student) {
    return (
      <Section>
        <Container>
          <Skeleton $h="380px" $radius="24px" />
        </Container>
      </Section>
    );
  }

  // Estatísticas calculadas
  const completedLessonsTotal = enrollments.reduce(
    (acc, curr) => acc + (curr.completedLessons || 0),
    0,
  );
  const certificatesTotal = enrollments.filter((e) => Boolean(e.certificateCode)).length;

  const avatarSrc = assetUrl(student.avatarUrl);

  return (
    <PageWrapper>
      <DashSection>
        <Container>
          {/* ─── Hero Banner do Aluno ─── */}
          <HeroBanner>
            <HeroTopRow>
              <div className="student-profile">
                <div className="avatar-ring">
                  <div className="avatar-inner">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={student.name} />
                    ) : (
                      initialsOf(student.name)
                    )}
                  </div>
                </div>
                <div>
                  <div className="student-name-row">
                    <h1 className="student-name">{student.name}</h1>
                    <span className="student-badge">
                      <Sparkles size={12} /> Aluno Academy
                    </span>
                  </div>
                  <div className="student-email">{student.email}</div>
                </div>
              </div>

              <div className="hero-actions">
                <ButtonLink to="/academy" $variant="secondary" $size="sm">
                  <GraduationCap size={16} /> Catálogo de cursos
                </ButtonLink>
              </div>
            </HeroTopRow>

            {/* ─── Métrica / KPI Counters ─── */}
            <StatsGrid>
              <div className="stat-card">
                <div className="stat-icon">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="stat-value">{enrollments.length}</div>
                  <div className="stat-label">Cursos Ativos</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <PlayCircle size={20} />
                </div>
                <div>
                  <div className="stat-value">{completedLessonsTotal}</div>
                  <div className="stat-label">Aulas Concluídas</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <Award size={20} />
                </div>
                <div>
                  <div className="stat-value">{certificatesTotal}</div>
                  <div className="stat-label">Certificados Conquistados</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <Receipt size={20} />
                </div>
                <div>
                  <div className="stat-value">{orders.length}</div>
                  <div className="stat-label">Pedidos Registrados</div>
                </div>
              </div>
            </StatsGrid>
          </HeroBanner>

          {/* ─── Navegação por Abas ─── */}
          <TabsBar>
            <ModernTab
              type="button"
              $active={tab === 'courses'}
              onClick={() => setTab('courses')}
            >
              <BookOpen size={16} /> Meus Cursos{' '}
              <span className="badge-count">{enrollments.length}</span>
            </ModernTab>
            <ModernTab type="button" $active={tab === 'orders'} onClick={() => setTab('orders')}>
              <Receipt size={16} /> Meus Pedidos{' '}
              <span className="badge-count">{orders.length}</span>
            </ModernTab>
            <ModernTab
              type="button"
              $active={tab === 'profile'}
              onClick={() => setTab('profile')}
            >
              <UserCog size={16} /> Meus Dados
            </ModernTab>
          </TabsBar>

          {/* ─── Aba 1: Meus Cursos ─── */}
          {tab === 'courses' && (
            <>
              {loadingData ? (
                <Grid $min="320px">
                  {[0, 1].map((i) => (
                    <Skeleton key={i} $h="400px" $radius="20px" />
                  ))}
                </Grid>
              ) : enrollments.length === 0 ? (
                <EmptyState
                  title="Você ainda não possui cursos ativos"
                  description="Explore nosso catálogo de cursos práticos da PicPlus Academy e comece sua evolução hoje mesmo."
                  action={
                    <ButtonLink to="/academy" $size="lg">
                      <GraduationCap size={18} /> Explorar Catálogo de Cursos{' '}
                      <ArrowRight size={16} />
                    </ButtonLink>
                  }
                />
              ) : (
                <Grid $min="320px">
                  {enrollments.map((item) => {
                    const coverSrc = assetUrl(item.course.coverImage);
                    const isCompleted = item.progressPercent === 100;
                    return (
                      <CourseCard key={item.enrollmentId}>
                        <div className="thumb">
                          <div className="thumb-badges">
                            {item.course.category && (
                              <span className="tag-badge">{item.course.category}</span>
                            )}
                            {item.course.workloadHours > 0 && (
                              <span className="tag-badge">
                                <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                                {item.course.workloadHours}h
                              </span>
                            )}
                          </div>

                          <div className="play-overlay">
                            <Play size={22} fill="#0a0a0a" />
                          </div>

                          {coverSrc ? (
                            <img src={coverSrc} alt={item.course.title} />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'grid',
                                placeItems: 'center',
                                color: '#B6E829',
                                background: '#121214',
                              }}
                            >
                              <GraduationCap size={48} />
                            </div>
                          )}
                        </div>

                        <div className="card-body">
                          <h3 className="course-title">{item.course.title}</h3>

                          {item.course.instructorName && (
                            <div className="instructor-row">
                              <UserCheck size={14} color="#B6E829" />
                              <span>{item.course.instructorName}</span>
                            </div>
                          )}

                          <div className="progress-section">
                            <div className="progress-meta">
                              <span>
                                {item.completedLessons} de {item.totalLessons} aulas concluídas
                              </span>
                              <strong style={{ color: isCompleted ? '#22c55e' : '#B6E829' }}>
                                {item.progressPercent}%
                              </strong>
                            </div>
                            <div className="progress-bar-bg">
                              <div
                                className="progress-bar-fill"
                                style={{
                                  width: `${item.progressPercent}%`,
                                  background: isCompleted ? '#22c55e' : undefined,
                                }}
                              />
                            </div>
                          </div>

                          <div className="card-actions">
                            <ButtonLink
                              to={`/academy/aula/${item.course.slug}`}
                              $size="md"
                              $block
                            >
                              <PlayCircle size={17} />{' '}
                              {item.progressPercent === 0
                                ? 'Iniciar curso'
                                : isCompleted
                                  ? 'Rever aulas'
                                  : 'Continuar assistindo'}
                            </ButtonLink>

                            {item.certificateCode && (
                              <ButtonLink
                                to={`/academy/certificado/${item.certificateCode}`}
                                $variant="secondary"
                                $size="sm"
                                $block
                              >
                                <Award size={16} /> Ver Certificado Oficial
                              </ButtonLink>
                            )}
                          </div>
                        </div>
                      </CourseCard>
                    );
                  })}
                </Grid>
              )}
            </>
          )}

          {/* ─── Aba 2: Meus Pedidos ─── */}
          {tab === 'orders' && (
            <OrdersContainer>
              {orders.length === 0 ? (
                <EmptyState
                  title="Nenhum pedido registrado"
                  description="Seus pedidos de cursos adquiridos e históricos de transações aparecerão aqui."
                />
              ) : (
                orders.map((order) => {
                  const courseTitle = order.course?.title ?? 'Curso';
                  const courseSlug = order.course?.slug ?? '';
                  const isApproved = order.status === 'APPROVED';
                  const isPending = order.status === 'PENDING';

                  return (
                    <OrderCard key={order.id}>
                      <div className="order-meta">
                        <div className="order-icon">
                          <Receipt size={22} />
                        </div>
                        <div>
                          <h4 className="order-title">{courseTitle}</h4>
                          <div className="order-sub">
                            <span>Pedido #{order.id.slice(0, 8)}</span>
                            <span>•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={13} />
                              {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1.25rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
                            {formatCentsBRL(order.finalPriceCents)}
                          </div>
                          <div
                            className="order-status-badge"
                            style={{
                              background: isApproved
                                ? 'rgba(34, 197, 94, 0.12)'
                                : isPending
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : 'rgba(239, 68, 68, 0.12)',
                              color: isApproved ? '#22c55e' : isPending ? '#f59e0b' : '#ef4444',
                              border: `1px solid ${
                                isApproved
                                  ? 'rgba(34, 197, 94, 0.3)'
                                  : isPending
                                    ? 'rgba(245, 158, 11, 0.3)'
                                    : 'rgba(239, 68, 68, 0.3)'
                              }`,
                            }}
                          >
                            {isApproved ? (
                              <CheckCircle2 size={13} />
                            ) : isPending ? (
                              <Clock size={13} />
                            ) : (
                              <XCircle size={13} />
                            )}
                            {ORDER_STATUS_LABEL[order.status]}
                          </div>
                        </div>

                        {courseSlug && isApproved && (
                          <ButtonLink to={`/academy/aula/${courseSlug}`} $size="sm">
                            Acessar curso <ArrowRight size={15} />
                          </ButtonLink>
                        )}
                        {courseSlug && !isApproved && (
                          <ButtonLink
                            to={`/academy/curso/${courseSlug}`}
                            $variant="secondary"
                            $size="sm"
                          >
                            Ver detalhes
                          </ButtonLink>
                        )}
                      </div>
                    </OrderCard>
                  );
                })
              )}
            </OrdersContainer>
          )}

          {/* ─── Aba 3: Meus Dados Cadastrais ─── */}
          {tab === 'profile' && (
            <ProfileLayout>
              {/* Coluna lateral: foto + resumo */}
              <AvatarCard>
                <div className="big-avatar">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={student.name} />
                  ) : (
                    initialsOf(student.name)
                  )}
                </div>
                <div className="av-name">{student.name}</div>
                <div className="av-mail">
                  <Mail size={13} /> {student.email}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarChange}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera size={15} /> {uploadingAvatar ? 'Enviando…' : 'Alterar foto'}
                </Button>
                <div className="av-hint">JPG, PNG ou WebP · até 5 MB</div>
                <div className="av-since">
                  <Calendar size={13} /> Aluno desde{' '}
                  {new Date(student.createdAt).toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </AvatarCard>

              <ProfileColumn>
                {/* Dados pessoais */}
                <ProfileCard as="form" onSubmit={handleSaveProfile}>
                  <div className="card-header">
                    <UserCheck size={20} color="#B6E829" />
                    <h3>Dados Pessoais</h3>
                  </div>

                  <div className="notice">
                    <ShieldCheck size={18} color="#B6E829" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      O seu <strong>Nome Completo</strong> e <strong>CPF</strong> são utilizados na
                      emissão oficial dos seus <strong>certificados de conclusão</strong>.
                    </span>
                  </div>

                  {profileMsg && <Feedback $type={profileMsg.type}>{profileMsg.text}</Feedback>}

                  <div className="fields">
                    <div className="field full">
                      <label htmlFor="pf-name">Nome completo</label>
                      <input
                        id="pf-name"
                        type="text"
                        required
                        minLength={2}
                        maxLength={120}
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="field full">
                      <label htmlFor="pf-email">E-mail de acesso</label>
                      <input id="pf-email" type="email" disabled value={student.email} />
                      <small>O e-mail não pode ser alterado.</small>
                    </div>

                    <div className="field">
                      <label htmlFor="pf-cpf">CPF</label>
                      <input
                        id="pf-cpf"
                        type="text"
                        inputMode="numeric"
                        value={cpf}
                        onChange={(e) => setCpf(maskCpf(e.target.value))}
                        placeholder="000.000.000-00"
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="pf-phone">Telefone / WhatsApp</label>
                      <input
                        id="pf-phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(maskPhone(e.target.value))}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div className="actions">
                    <Button type="submit" disabled={savingProfile}>
                      {savingProfile ? 'Salvando…' : 'Salvar alterações'}
                    </Button>
                  </div>
                </ProfileCard>

                {/* Segurança */}
                <ProfileCard as="form" onSubmit={handleChangePassword}>
                  <div className="card-header">
                    <ShieldCheck size={20} color="#B6E829" />
                    <h3>Segurança da Conta</h3>
                  </div>

                  {passwordMsg && <Feedback $type={passwordMsg.type}>{passwordMsg.text}</Feedback>}

                  <div className="fields">
                    <div className="field">
                      <label htmlFor="pf-curr-pass">Senha atual</label>
                      <input
                        id="pf-curr-pass"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="pf-pass">Nova senha</label>
                      <input
                        id="pf-pass"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  </div>

                  <div className="actions">
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={savingPassword || !currentPassword || !newPassword}
                    >
                      {savingPassword ? 'Atualizando…' : 'Atualizar senha'}
                    </Button>
                  </div>
                </ProfileCard>
              </ProfileColumn>
            </ProfileLayout>
          )}
        </Container>
      </DashSection>
    </PageWrapper>
  );
}
