import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  PlayCircle,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Container, Section } from '../../../components/ui/Layout';
import { useStudentAuth } from '../../../context/student-auth-context';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { api, assetUrl } from '../../../lib/api';
import {
  COURSE_LEVEL_LABEL,
  formatCentsBRL,
  formatDuration,
  resolveLessonVideoEmbed,
  studentApi,
  type CouponValidationResult,
  type Course,
  type CourseLesson,
  type StudentEnrolledCourse,
} from '../../../lib/academy';
import { GrokSalesPage } from './GrokSalesPage';

const HeroGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2.5rem;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

const Breadcrumb = styled.div`
  margin-bottom: 1.25rem;

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.88rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};

    &:hover {
      color: ${({ theme }) => theme.colors.primary};
    }
  }
`;

const MetaBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1rem;

  span {
    padding: 0.28rem 0.75rem;
    border-radius: ${({ theme }) => theme.radii.pill};
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  span.primary {
    background: ${({ theme }) => theme.colors.primarySoft};
    border-color: ${({ theme }) => theme.colors.primaryBorder};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const StickyCard = styled.aside`
  position: sticky;
  top: 96px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.card};

  .media {
    aspect-ratio: 16 / 9;
    background: #111;
    position: relative;
    overflow: hidden;

    img,
    iframe,
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border: 0;
    }
  }

  .content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
  }

  .price-row {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    flex-wrap: wrap;

    .final {
      font-size: 2rem;
      font-weight: 800;
      color: ${({ theme }) => theme.colors.primary};
      line-height: 1;
    }

    .old {
      font-size: 1rem;
      color: ${({ theme }) => theme.colors.textMuted};
      text-decoration: line-through;
    }
  }

  .perks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    font-size: 0.86rem;
    color: ${({ theme }) => theme.colors.textSecondary};

    li {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }
  }
`;

const CouponBox = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .input-row {
    display: flex;
    gap: 0.5rem;

    input {
      flex: 1;
      padding: 0.55rem 0.75rem;
      border-radius: ${({ theme }) => theme.radii.md};
      border: 1px solid ${({ theme }) => theme.colors.borderStrong};
      background: ${({ theme }) => theme.colors.background};
      color: ${({ theme }) => theme.colors.text};
      font-size: 0.86rem;
      text-transform: uppercase;
    }
  }

  .feedback {
    font-size: 0.8rem;
  }

  .feedback.ok {
    color: ${({ theme }) => theme.colors.success};
  }

  .feedback.err {
    color: ${({ theme }) => theme.colors.danger};
  }
`;

const ModuleAccordion = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
  margin-bottom: 1rem;

  .mod-header {
    width: 100%;
    padding: 1.15rem 1.35rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    text-align: left;
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.colors.text};
    cursor: pointer;

    &:hover {
      background: ${({ theme }) => theme.colors.surfaceHover};
    }
  }

  .mod-lessons {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    display: flex;
    flex-direction: column;
  }

  .lesson-item {
    padding: 0.9rem 1.35rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    font-size: 0.92rem;

    &:last-child {
      border-bottom: 0;
    }
  }

  .lesson-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .preview-btn {
    padding: 0.3rem 0.7rem;
    border-radius: ${({ theme }) => theme.radii.pill};
    background: ${({ theme }) => theme.colors.primarySoft};
    border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.76rem;
    font-weight: 700;
    cursor: pointer;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: ${({ theme }) => theme.colors.overlay};
  display: grid;
  place-items: center;
  padding: 1.5rem;

  .modal {
    width: 100%;
    max-width: 860px;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.xl};
    overflow: hidden;
  }

  .modal-head {
    padding: 1rem 1.35rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  .video-box {
    aspect-ratio: 16 / 9;
    background: #000;

    iframe,
    video {
      width: 100%;
      height: 100%;
      border: 0;
    }
  }
`;

export function AcademyCourseDetail() {
  const { slug = '' } = useParams<{ slug: string }>();

  if (slug === 'dominando-inteligencia-artificial-para-videos') {
    return <GrokSalesPage />;
  }

  const navigate = useNavigate();
  const { student } = useStudentAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [previewLesson, setPreviewLesson] = useState<CourseLesson | null>(null);

  const [couponInput, setCouponInput] = useState('');
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  usePageMeta(
    course ? `${course.title} — PicPlus Academy` : 'Curso — PicPlus Academy',
    course?.subtitle || 'Curso completo na PicPlus Academy com certificado de conclusão.',
  );

  const loadCourse = async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await api.get<Course>(`/academy/courses/${slug}`);
      setCourse(detail);
      const initialOpen: Record<string, boolean> = {};
      (detail.modules ?? []).forEach((m, idx) => {
        if (idx === 0) initialOpen[m.id] = true;
      });
      setOpenModules(initialOpen);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Curso não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api
      .get<Course>(`/academy/courses/${slug}`)
      .then((detail) => {
        if (!active) return;
        setCourse(detail);
        setError(null);
        const initialOpen: Record<string, boolean> = {};
        (detail.modules ?? []).forEach((m, idx) => {
          if (idx === 0) initialOpen[m.id] = true;
        });
        setOpenModules(initialOpen);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Curso não encontrado.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!student || !course) return;
    let active = true;
    studentApi
      .get<StudentEnrolledCourse[]>('/academy/my-courses')
      .then((list) => {
        if (active) {
          setIsEnrolled(list.some((item) => item.course.id === course.id));
        }
      })
      .catch(() => {
        if (active) setIsEnrolled(false);
      });
    return () => {
      active = false;
    };
  }, [student, course]);

  const handleApplyCoupon = async () => {
    if (!course || !couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await api.post<CouponValidationResult>('/academy/coupons/validate', {
        code: couponInput.trim().toUpperCase(),
        courseId: course.id,
      });
      setCouponResult(res);
    } catch (err) {
      setCouponResult(null);
      setCouponError(err instanceof Error ? err.message : 'Cupom inválido.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleBuyOrEnroll = () => {
    if (!course) return;
    if (isEnrolled) {
      navigate(`/academy/aula/${course.slug}`);
      return;
    }
    const params = new URLSearchParams();
    if (couponResult?.code) {
      params.set('coupon', couponResult.code);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    navigate(`/academy/checkout/${course.slug}${qs}`);
  };

  if (loading) {
    return (
      <Section>
        <Container>
          <Skeleton $h="420px" $radius="20px" />
        </Container>
      </Section>
    );
  }

  if (error || !course) {
    return (
      <Section>
        <Container>
          <ErrorState message={error ?? 'Curso não encontrado'} onRetry={loadCourse} />
        </Container>
      </Section>
    );
  }

  const modules = course.modules ?? [];
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const finalPriceCents = couponResult ? couponResult.finalPriceCents : course.priceCents;
  const trailerEmbed = course.promoVideoUrl
    ? resolveLessonVideoEmbed('YOUTUBE', course.promoVideoUrl)
    : null;
  const previewEmbed = previewLesson
    ? resolveLessonVideoEmbed(previewLesson.videoProvider, previewLesson.videoUrl)
    : null;
  const coverSrc = assetUrl(course.coverImage);

  return (
    <Section>
      <Container>
        <Breadcrumb>
          <Link to="/academy">
            <ArrowLeft size={16} /> Voltar para todos os cursos
          </Link>
        </Breadcrumb>

        <HeroGrid>
          <div>
            <MetaBadges>
              {course.category && <span className="primary">{course.category}</span>}
              <span>{COURSE_LEVEL_LABEL[course.level]}</span>
              <span>
                <BookOpen size={13} style={{ display: 'inline', marginRight: 4 }} />
                {totalLessons} {totalLessons === 1 ? 'aula' : 'aulas'}
              </span>
              {course.workloadHours > 0 ? (
                <span>
                  <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
                  {course.workloadHours}h de carga horária
                </span>
              ) : null}
            </MetaBadges>

            <h1 style={{ fontSize: 'clamp(1.9rem, 3.6vw, 2.75rem)', marginBottom: '0.85rem' }}>
              {course.title}
            </h1>

            {course.subtitle && (
              <p
                style={{
                  fontSize: '1.12rem',
                  color: '#A3A3A3',
                  lineHeight: 1.6,
                  marginBottom: '1.75rem',
                }}
              >
                {course.subtitle}
              </p>
            )}

            {course.instructorName && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.9rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '14px',
                  background: '#171717',
                  border: '1px solid #262626',
                  marginBottom: '2.25rem',
                }}
              >
                {course.instructorAvatar ? (
                  <img
                    src={assetUrl(course.instructorAvatar) ?? course.instructorAvatar}
                    alt={course.instructorName}
                    style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(182, 232, 41, 0.15)',
                      color: '#B6E829',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 800,
                    }}
                  >
                    {course.instructorName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.76rem', color: '#A3A3A3', textTransform: 'uppercase' }}>
                    Instrutor(a)
                  </div>
                  <strong style={{ fontSize: '1rem' }}>{course.instructorName}</strong>
                  {course.instructorBio && (
                    <div style={{ fontSize: '0.85rem', color: '#A3A3A3', marginTop: 2 }}>
                      {course.instructorBio}
                    </div>
                  )}
                </div>
              </div>
            )}

            {course.description && (
              <div style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.35rem', marginBottom: '0.85rem' }}>Sobre o curso</h2>
                <div
                  style={{
                    color: '#D4D4D4',
                    lineHeight: 1.75,
                    whiteSpace: 'pre-line',
                    fontSize: '0.98rem',
                  }}
                >
                  {course.description}
                </div>
              </div>
            )}

            <div>
              <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>
                Conteúdo programático ({modules.length}{' '}
                {modules.length === 1 ? 'módulo' : 'módulos'})
              </h2>

              {modules.map((mod, idx) => {
                const isOpen = !!openModules[mod.id];
                return (
                  <ModuleAccordion key={mod.id}>
                    <button
                      type="button"
                      className="mod-header"
                      onClick={() =>
                        setOpenModules((prev) => ({ ...prev, [mod.id]: !prev[mod.id] }))
                      }
                    >
                      <div>
                        <div style={{ fontSize: '0.76rem', color: '#B6E829', fontWeight: 700 }}>
                          MÓDULO {idx + 1}
                        </div>
                        <strong style={{ fontSize: '1.05rem' }}>{mod.title}</strong>
                        {mod.description && (
                          <div style={{ fontSize: '0.84rem', color: '#A3A3A3', marginTop: 2 }}>
                            {mod.description}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.82rem', color: '#A3A3A3' }}>
                          {mod.lessons.length} {mod.lessons.length === 1 ? 'aula' : 'aulas'}
                        </span>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="mod-lessons">
                        {mod.lessons.map((lesson) => (
                          <div key={lesson.id} className="lesson-item">
                            <div className="lesson-left">
                              {lesson.isFreePreview ? (
                                <PlayCircle size={17} color="#B6E829" />
                              ) : (
                                <Lock size={16} color="#737373" />
                              )}
                              <div>
                                <div>{lesson.title}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {lesson.durationSeconds ? (
                                <span style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>
                                  {formatDuration(lesson.durationSeconds)}
                                </span>
                              ) : null}
                              {lesson.isFreePreview && lesson.videoUrl && (
                                <button
                                  type="button"
                                  className="preview-btn"
                                  onClick={() => setPreviewLesson(lesson)}
                                >
                                  Assistir prévia grátis
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ModuleAccordion>
                );
              })}
            </div>
          </div>

          <StickyCard>
            <div className="media">
              {trailerEmbed?.kind === 'iframe' ? (
                <iframe
                  src={trailerEmbed.src}
                  title={`Trailer ${course.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : coverSrc ? (
                <img src={coverSrc} alt={course.title} />
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
                  <PlayCircle size={54} />
                </div>
              )}
            </div>

            <div className="content">
              <div className="price-row">
                <span className="final">
                  {finalPriceCents === 0 ? 'Gratuito' : formatCentsBRL(finalPriceCents)}
                </span>
                {couponResult ? (
                  <span className="old">{formatCentsBRL(course.priceCents)}</span>
                ) : course.compareAtPriceCents && course.compareAtPriceCents > course.priceCents ? (
                  <span className="old">{formatCentsBRL(course.compareAtPriceCents)}</span>
                ) : null}
              </div>

              {isEnrolled ? (
                <ButtonLink to={`/academy/aula/${course.slug}`} $size="lg" $block>
                  <PlayCircle size={18} /> Acessar sala de aula
                </ButtonLink>
              ) : (
                <Button type="button" size="lg" block onClick={handleBuyOrEnroll}>
                  {finalPriceCents === 0 ? 'Matricular-se gratuitamente' : 'Comprar agora'}
                </Button>
              )}

              <ul className="perks">
                <li>
                  <CheckCircle2 size={16} color="#B6E829" /> Acesso imediato às {totalLessons}{' '}
                  aulas
                </li>
                <li>
                  <Award size={16} color="#B6E829" /> Certificado oficial de conclusão
                </li>
                <li>
                  <ShieldCheck size={16} color="#B6E829" /> Pagamento seguro via Mercado Pago (Pix,
                  Cartão ou Boleto)
                </li>
              </ul>

              {!isEnrolled && course.priceCents > 0 && (
                <CouponBox>
                  <label
                    htmlFor="coupon-code-input"
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#A3A3A3',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Tag size={13} /> Possui cupom de desconto?
                  </label>
                  <div className="input-row">
                    <input
                      id="coupon-code-input"
                      type="text"
                      placeholder="EX: PICPLUS10"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponInput.trim()}
                    >
                      {validatingCoupon ? '…' : 'Aplicar'}
                    </Button>
                  </div>
                  {couponResult && (
                    <div className="feedback ok">
                      Cupom <strong>{couponResult.code}</strong> aplicado! Desconto de{' '}
                      {formatCentsBRL(couponResult.discountCents)}.
                    </div>
                  )}
                  {couponError && <div className="feedback err">{couponError}</div>}
                </CouponBox>
              )}
            </div>
          </StickyCard>
        </HeroGrid>

        {previewLesson && (
          <ModalOverlay onClick={() => setPreviewLesson(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <strong>Prévia gratuita: {previewLesson.title}</strong>
                <button
                  type="button"
                  onClick={() => setPreviewLesson(null)}
                  style={{ background: 'transparent', border: 0, color: '#fff', cursor: 'pointer' }}
                  aria-label="Fechar prévia"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="video-box">
                {previewEmbed?.kind === 'iframe' ? (
                  <iframe
                    src={previewEmbed.src}
                    title={previewLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : previewEmbed?.kind === 'video' ? (
                  <video src={previewEmbed.src} controls autoPlay />
                ) : (
                  <div style={{ padding: '2rem', color: '#A3A3A3' }}>Vídeo indisponível.</div>
                )}
              </div>
            </div>
          </ModalOverlay>
        )}
      </Container>
    </Section>
  );
}
