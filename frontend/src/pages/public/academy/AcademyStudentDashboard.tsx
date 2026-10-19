import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  Award,
  BookOpen,
  GraduationCap,
  LogOut,
  PlayCircle,
  Receipt,
  UserCog,
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

const HeaderBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.5rem 1.75rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  margin-bottom: 1.75rem;

  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .avatar {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primarySoft};
    border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
    color: ${({ theme }) => theme.colors.primary};
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 1.15rem;
  }
`;

const TabsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 2rem;
`;

const TabBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.15rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.borderStrong)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.surface};
  color: ${({ $active, theme }) => ($active ? theme.colors.textDark : theme.colors.text)};
`;

const EnrolledCard = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;

  .thumb {
    aspect-ratio: 16 / 9;
    background: #141414;
    position: relative;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .body {
    padding: 1.35rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    flex: 1;
  }

  .progress-track {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.background};
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.colors.border};

    .fill {
      height: 100%;
      background: ${({ theme }) => theme.colors.primary};
      transition: width 0.3s ease;
    }
  }

  .actions {
    margin-top: auto;
    padding-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
`;

const OrdersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;

  .order-card {
    padding: 1.15rem 1.35rem;
    border-radius: ${({ theme }) => theme.radii.lg};
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.border};
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
`;

const ProfileForm = styled.form`
  max-width: 560px;
  padding: 1.75rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 1rem;

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;

    label {
      font-size: 0.82rem;
      font-weight: 600;
      color: ${({ theme }) => theme.colors.textSecondary};
    }

    input {
      padding: 0.68rem 0.9rem;
      border-radius: ${({ theme }) => theme.radii.md};
      border: 1px solid ${({ theme }) => theme.colors.borderStrong};
      background: ${({ theme }) => theme.colors.background};
      color: ${({ theme }) => theme.colors.text};
      font-size: 0.92rem;
    }
  }
`;

export function AcademyStudentDashboard() {
  usePageMeta('Minha Área — PicPlus Academy', 'Seus cursos, progresso e certificados na PicPlus Academy.');

  const navigate = useNavigate();
  const { student, loading: authLoading, logout, setStudent } = useStudentAuth();

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
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !student) {
      navigate('/academy/entrar?redirect=/academy/minha-area', { replace: true });
    }
  }, [authLoading, student, navigate]);

  useEffect(() => {
    if (!student) return;
    let active = true;
    Promise.all([
      studentApi.get<StudentEnrolledCourse[]>('/academy/my-courses'),
      studentApi.get<CourseOrderItem[]>('/academy/orders'),
    ])
      .then(([coursesRes, ordersRes]) => {
        if (!active) return;
        setName(student.name);
        setPhone(student.phone ?? '');
        setCpf(student.cpf ?? '');
        setEnrollments(coursesRes);
        setOrders(ordersRes);
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
        cpf: cpf.trim() || undefined,
        currentPassword: currentPassword.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
      });
      setStudent(updated);
      setCurrentPassword('');
      setNewPassword('');
      setProfileMsg('Dados atualizados com sucesso!');
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Erro ao salvar dados.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading || !student) {
    return (
      <Section>
        <Container>
          <Skeleton $h="320px" $radius="20px" />
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container>
        <HeaderBox>
          <div className="user-info">
            <div className="avatar">{student.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <h1 style={{ fontSize: '1.4rem', margin: 0 }}>{student.name}</h1>
              <div style={{ fontSize: '0.88rem', color: '#A3A3A3' }}>{student.email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <ButtonLink to="/academy" $variant="secondary" $size="sm">
              <GraduationCap size={16} /> Ver catálogo de cursos
            </ButtonLink>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                logout();
                navigate('/academy');
              }}
            >
              <LogOut size={15} /> Sair
            </Button>
          </div>
        </HeaderBox>

        <TabsRow>
          <TabBtn type="button" $active={tab === 'courses'} onClick={() => setTab('courses')}>
            <BookOpen size={16} /> Meus Cursos ({enrollments.length})
          </TabBtn>
          <TabBtn type="button" $active={tab === 'orders'} onClick={() => setTab('orders')}>
            <Receipt size={16} /> Meus Pedidos ({orders.length})
          </TabBtn>
          <TabBtn type="button" $active={tab === 'profile'} onClick={() => setTab('profile')}>
            <UserCog size={16} /> Meus Dados
          </TabBtn>
        </TabsRow>

        {tab === 'courses' && (
          <>
            {loadingData ? (
              <Grid $min="320px">
                {[0, 1].map((i) => (
                  <Skeleton key={i} $h="380px" $radius="16px" />
                ))}
              </Grid>
            ) : enrollments.length === 0 ? (
              <EmptyState
                title="Você ainda não possui cursos ativos"
                description="Explore nosso catálogo de cursos da PicPlus Academy e comece a estudar hoje mesmo."
                action={<ButtonLink to="/academy">Explorar cursos</ButtonLink>}
              />
            ) : (
              <Grid $min="320px">
                {enrollments.map((item) => {
                  const coverSrc = assetUrl(item.course.coverImage);
                  return (
                    <EnrolledCard key={item.enrollmentId}>
                      <div className="thumb">
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
                            }}
                          >
                            <GraduationCap size={44} />
                          </div>
                        )}
                      </div>

                      <div className="body">
                        <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{item.course.title}</h3>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.82rem',
                            color: '#A3A3A3',
                          }}
                        >
                          <span>
                            {item.completedLessons} de {item.totalLessons} aulas concluídas
                          </span>
                          <strong style={{ color: '#B6E829' }}>{item.progressPercent}%</strong>
                        </div>
                        <div className="progress-track">
                          <div className="fill" style={{ width: `${item.progressPercent}%` }} />
                        </div>

                        <div className="actions">
                          <ButtonLink
                            to={`/academy/aula/${item.course.slug}`}
                            $size="md"
                            $block
                          >
                            <PlayCircle size={17} />{' '}
                            {item.progressPercent === 0
                              ? 'Iniciar curso'
                              : item.progressPercent === 100
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
                    </EnrolledCard>
                  );
                })}
              </Grid>
            )}
          </>
        )}

        {tab === 'orders' && (
          <OrdersList>
            {orders.length === 0 ? (
              <EmptyState
                title="Nenhum pedido registrado"
                description="Seus pedidos de cursos adquiridos aparecerão aqui."
              />
            ) : (
              orders.map((order) => {
                const courseTitle = order.course?.title ?? 'Curso';
                const courseSlug = order.course?.slug ?? '';
                return (
                  <div key={order.id} className="order-card">
                    <div>
                      <strong style={{ fontSize: '1rem' }}>{courseTitle}</strong>
                      <div style={{ fontSize: '0.82rem', color: '#A3A3A3', marginTop: 4 }}>
                        Pedido #{order.id.slice(0, 8)} •{' '}
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>{formatCentsBRL(order.finalPriceCents)}</div>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color:
                              order.status === 'APPROVED'
                                ? '#22c55e'
                                : order.status === 'PENDING'
                                  ? '#f59e0b'
                                  : '#ef4444',
                          }}
                        >
                          {ORDER_STATUS_LABEL[order.status]}
                        </div>
                      </div>
                      {courseSlug &&
                        (order.status === 'APPROVED' ? (
                          <Link
                            to={`/academy/aula/${courseSlug}`}
                            style={{ color: '#B6E829', fontWeight: 700, fontSize: '0.86rem' }}
                          >
                            Acessar →
                          </Link>
                        ) : (
                          <Link
                            to={`/academy/curso/${courseSlug}`}
                            style={{ color: '#A3A3A3', fontSize: '0.86rem' }}
                          >
                            Ver curso
                          </Link>
                        ))}
                    </div>
                  </div>
                );
              })
            )}
          </OrdersList>
        )}

        {tab === 'profile' && (
          <ProfileForm onSubmit={handleSaveProfile}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Atualizar dados cadastrais</h2>
            <p style={{ fontSize: '0.86rem', color: '#A3A3A3', margin: 0 }}>
              O seu nome completo e CPF serão exibidos na emissão dos seus certificados de conclusão.
            </p>

            {profileMsg && (
              <div
                style={{
                  padding: '0.7rem 0.9rem',
                  borderRadius: '10px',
                  background: 'rgba(182, 232, 41, 0.14)',
                  color: '#B6E829',
                  fontSize: '0.86rem',
                }}
              >
                {profileMsg}
              </div>
            )}

            <div className="field">
              <label htmlFor="pf-name">Nome completo</label>
              <input
                id="pf-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="pf-phone">Telefone / WhatsApp</label>
              <input
                id="pf-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="pf-cpf">CPF</label>
              <input
                id="pf-cpf"
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="field">
              <label htmlFor="pf-curr-pass">Senha atual (necessária apenas para trocar a senha)</label>
              <input
                id="pf-curr-pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Senha atual"
              />
            </div>

            <div className="field">
              <label htmlFor="pf-pass">Nova senha (deixe em branco para manter a atual)</label>
              <input
                id="pf-pass"
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha (mín. 6 caracteres)"
              />
            </div>

            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </ProfileForm>
        )}
      </Container>
    </Section>
  );
}
