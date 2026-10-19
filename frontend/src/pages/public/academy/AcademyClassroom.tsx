import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  MessageSquare,
  PlayCircle,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Container, Section } from '../../../components/ui/Layout';
import { useStudentAuth } from '../../../context/student-auth-context';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { assetUrl } from '../../../lib/api';
import {
  formatDuration,
  resolveLessonVideoEmbed,
  studentApi,
  type ClassroomPayload,
  type CourseLesson,
  type LessonCommentItem,
} from '../../../lib/academy';

const TopClassroomBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};

  .left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 600;

    &:hover {
      color: ${({ theme }) => theme.colors.primary};
    }
  }

  .progress-wrap {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .progress-bar {
    width: 140px;
    height: 8px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.background};
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};

    .fill {
      height: 100%;
      background: ${({ theme }) => theme.colors.primary};
      transition: width 0.3s ease;
    }
  }
`;

const ClassroomLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 1.75rem;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

const PlayerWrapper = styled.div`
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  background: #000;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  aspect-ratio: 16 / 9;

  iframe,
  video {
    width: 100%;
    height: 100%;
    border: 0;
  }
`;

const LessonControls = styled.div`
  margin-top: 1.25rem;
  padding: 1.35rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const ContentPanel = styled.div`
  margin-top: 1.25rem;
  padding: 1.5rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const SidebarCurriculum = styled.aside`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  max-height: 78vh;
  overflow-y: auto;

  .module-block {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};

    &:last-child {
      border-bottom: 0;
    }
  }

  .module-title {
    padding: 0.9rem 1.15rem;
    background: ${({ theme }) => theme.colors.surfaceElevated};
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.colors.primary};
  }

  .lesson-btn {
    width: 100%;
    padding: 0.85rem 1.15rem;
    display: flex;
    align-items: flex-start;
    gap: 0.7rem;
    text-align: left;
    background: transparent;
    border: 0;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: ${({ theme }) => theme.colors.surfaceHover};
    }

    &.active {
      background: ${({ theme }) => theme.colors.primarySoft};
      border-left: 3px solid ${({ theme }) => theme.colors.primary};
    }
  }
`;

const CommentCard = styled.div`
  padding: 1rem 1.15rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 0.85rem;

  .reply {
    margin-top: 0.75rem;
    padding: 0.75rem 0.95rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: ${({ theme }) => theme.colors.surface};
    border-left: 3px solid ${({ theme }) => theme.colors.primary};
  }
`;

export function AcademyClassroom() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { student, loading: authLoading } = useStudentAuth();

  const [classroom, setClassroom] = useState<ClassroomPayload | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingProgress, setTogglingProgress] = useState(false);

  const [comments, setComments] = useState<LessonCommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  usePageMeta(
    classroom ? `${classroom.course.title} — Sala de Aula` : 'Sala de Aula — PicPlus Academy',
    'Assista às aulas, baixe materiais complementares e tire suas dúvidas.',
  );

  useEffect(() => {
    if (!authLoading && !student) {
      navigate(`/academy/entrar?redirect=${encodeURIComponent(`/academy/aula/${slug}`)}`, {
        replace: true,
      });
    }
  }, [authLoading, student, navigate, slug]);

  const loadClassroom = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await studentApi.get<ClassroomPayload>(`/academy/classroom/${slug}`);
      setClassroom(res);
      const allLessons = res.course.modules.flatMap((m) => m.lessons);
      if (allLessons.length > 0 && !selectedLessonId) {
        const firstIncomplete = allLessons.find((l) => !l.completed) ?? allLessons[0];
        setSelectedLessonId(firstIncomplete.id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Você não possui matrícula ativa neste curso.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!student) return;
    let active = true;
    studentApi
      .get<ClassroomPayload>(`/academy/classroom/${slug}`)
      .then((res) => {
        if (!active) return;
        setClassroom(res);
        setError(null);
        const lessons = res.course.modules.flatMap((m) => m.lessons);
        if (lessons.length > 0) {
          const firstIncomplete = lessons.find((l) => !l.completed) ?? lessons[0];
          setSelectedLessonId((prev) => prev ?? firstIncomplete.id);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Você não possui matrícula ativa neste curso.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [student, slug]);

  const allLessons = useMemo(
    () => classroom?.course.modules.flatMap((m) => m.lessons) ?? [],
    [classroom],
  );

  const activeLesson: CourseLesson | null = useMemo(
    () => allLessons.find((l) => l.id === selectedLessonId) ?? allLessons[0] ?? null,
    [allLessons, selectedLessonId],
  );

  useEffect(() => {
    if (!activeLesson) return;
    studentApi
      .get<LessonCommentItem[]>(`/academy/lessons/${activeLesson.id}/comments`)
      .then(setComments)
      .catch(() => setComments([]));
  }, [activeLesson]);

  const handleToggleCompleted = async () => {
    if (!activeLesson || !classroom) return;
    setTogglingProgress(true);
    try {
      const nextCompleted = !activeLesson.completed;
      const res = await studentApi.patch<{
        progress: { completed: boolean };
        progressPercent: number;
        completedLessons: number;
        totalLessons: number;
        certificateCode: string | null;
      }>(`/academy/lessons/${activeLesson.id}/progress`, {
        completed: nextCompleted,
      });

      setClassroom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          enrollment: {
            ...prev.enrollment,
            progressPercent: res.progressPercent,
            completedLessons: res.completedLessons,
            totalLessons: res.totalLessons,
            certificateCode: res.certificateCode,
          },
          course: {
            ...prev.course,
            modules: prev.course.modules.map((mod) => ({
              ...mod,
              lessons: mod.lessons.map((l) =>
                l.id === activeLesson.id ? { ...l, completed: res.progress.completed } : l,
              ),
            })),
          },
        };
      });
    } finally {
      setTogglingProgress(false);
    }
  };

  const handlePostComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeLesson || !commentText.trim()) return;
    setSendingComment(true);
    try {
      await studentApi.post(`/academy/lessons/${activeLesson.id}/comments`, {
        content: commentText.trim(),
      });
      setCommentText('');
      const updated = await studentApi.get<LessonCommentItem[]>(
        `/academy/lessons/${activeLesson.id}/comments`,
      );
      setComments(updated);
    } finally {
      setSendingComment(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Section $tight>
        <Container>
          <Skeleton $h="500px" $radius="20px" />
        </Container>
      </Section>
    );
  }

  if (error || !classroom) {
    return (
      <Section>
        <Container>
          <ErrorState message={error ?? 'Erro ao carregar sala de aula'} onRetry={loadClassroom} />
        </Container>
      </Section>
    );
  }

  const videoEmbed = activeLesson
    ? resolveLessonVideoEmbed(activeLesson.videoProvider, activeLesson.videoUrl)
    : null;
  const lessonMaterials = activeLesson?.materials ?? [];

  return (
    <Section $tight>
      <Container>
        <TopClassroomBar>
          <div className="left">
            <Link to="/academy/minha-area" className="back-link">
              <ArrowLeft size={16} /> Minha Área
            </Link>
            <strong>{classroom.course.title}</strong>
          </div>

          <div className="progress-wrap">
            <span style={{ fontSize: '0.84rem', color: '#A3A3A3' }}>
              Progresso:{' '}
              <strong style={{ color: '#B6E829' }}>{classroom.enrollment.progressPercent}%</strong>
            </span>
            <div className="progress-bar">
              <div
                className="fill"
                style={{ width: `${classroom.enrollment.progressPercent}%` }}
              />
            </div>
            {classroom.enrollment.certificateCode && (
              <ButtonLink
                to={`/academy/certificado/${classroom.enrollment.certificateCode}`}
                $size="sm"
              >
                <Award size={15} /> Certificado
              </ButtonLink>
            )}
          </div>
        </TopClassroomBar>

        <ClassroomLayout>
          <div>
            {activeLesson ? (
              <>
                <PlayerWrapper>
                  {videoEmbed?.kind === 'iframe' ? (
                    <iframe
                      src={videoEmbed.src}
                      title={activeLesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : videoEmbed?.kind === 'video' ? (
                    <video src={videoEmbed.src} controls />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#A3A3A3',
                        padding: '2rem',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <PlayCircle size={48} color="#B6E829" style={{ margin: '0 auto 0.75rem' }} />
                        <div>Aula teórica / leitura abaixo</div>
                      </div>
                    </div>
                  )}
                </PlayerWrapper>

                <LessonControls>
                  <div>
                    <h1 style={{ fontSize: '1.35rem', margin: 0 }}>{activeLesson.title}</h1>
                  </div>

                  <Button
                    type="button"
                    variant={activeLesson.completed ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={handleToggleCompleted}
                    disabled={togglingProgress}
                  >
                    <CheckCircle2 size={16} />
                    {activeLesson.completed ? 'Aula concluída' : 'Marcar como concluída'}
                  </Button>
                </LessonControls>

                {(activeLesson.description || lessonMaterials.length > 0) && (
                  <ContentPanel>
                    {activeLesson.description && (
                      <div style={{ marginBottom: lessonMaterials.length > 0 ? '1.5rem' : 0 }}>
                        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.65rem' }}>
                          Notas e resumo da aula
                        </h3>
                        <div style={{ color: '#D4D4D4', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                          {activeLesson.description}
                        </div>
                      </div>
                    )}

                    {lessonMaterials.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                          Materiais complementares ({lessonMaterials.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                          {lessonMaterials.map((mat) => (
                            <a
                              key={mat.id}
                              href={assetUrl(mat.fileUrl) ?? mat.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem 1rem',
                                borderRadius: '10px',
                                background: '#0a0a0a',
                                border: '1px solid #262626',
                                color: '#fff',
                                fontSize: '0.9rem',
                              }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <FileText size={16} color="#B6E829" /> {mat.title}
                              </span>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  color: '#B6E829',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                }}
                              >
                                <Download size={14} /> Baixar
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </ContentPanel>
                )}

                <ContentPanel>
                  <h3
                    style={{
                      fontSize: '1.05rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <MessageSquare size={18} color="#B6E829" /> Dúvidas e comentários da aula (
                    {comments.length})
                  </h3>

                  <form
                    onSubmit={handlePostComment}
                    style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.25rem' }}
                  >
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Escreva sua dúvida sobre esta aula…"
                      style={{
                        flex: 1,
                        padding: '0.7rem 0.95rem',
                        borderRadius: '10px',
                        border: '1px solid #404040',
                        background: '#0a0a0a',
                        color: '#fff',
                        fontSize: '0.9rem',
                      }}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={sendingComment || !commentText.trim()}
                    >
                      <Send size={15} /> Enviar
                    </Button>
                  </form>

                  {comments.length === 0 ? (
                    <div style={{ fontSize: '0.86rem', color: '#8A8A8A' }}>
                      Nenhuma dúvida enviada ainda nesta aula. Seja o primeiro a perguntar!
                    </div>
                  ) : (
                    comments.map((c) => (
                      <CommentCard key={c.id}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.8rem',
                            color: '#A3A3A3',
                            marginBottom: 4,
                          }}
                        >
                          <strong style={{ color: '#fff' }}>
                            {c.student?.name || c.adminUser?.name || 'Aluno'}
                          </strong>
                          <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div style={{ fontSize: '0.92rem', lineHeight: 1.5 }}>{c.content}</div>

                        {(c.replies ?? []).map((r) => (
                          <div key={r.id} className="reply">
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: '0.78rem',
                                color: '#B6E829',
                                fontWeight: 700,
                                marginBottom: 4,
                              }}
                            >
                              {r.adminUser && <ShieldCheck size={14} />}
                              {r.adminUser
                                ? `${r.adminUser.name} • Equipe PicPlus`
                                : r.student?.name || 'Aluno'}
                            </div>
                            <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>{r.content}</div>
                          </div>
                        ))}
                      </CommentCard>
                    ))
                  )}
                </ContentPanel>
              </>
            ) : (
              <ContentPanel>Nenhuma aula cadastrada neste curso ainda.</ContentPanel>
            )}
          </div>

          <SidebarCurriculum>
            {classroom.course.modules.map((mod, mIdx) => (
              <div key={mod.id} className="module-block">
                <div className="module-title">
                  Módulo {mIdx + 1}: {mod.title}
                </div>
                {mod.lessons.map((lesson) => {
                  const isActive = activeLesson?.id === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      className={`lesson-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedLessonId(lesson.id)}
                    >
                      <div style={{ marginTop: 2 }}>
                        {lesson.completed ? (
                          <CheckCircle2 size={17} color="#22c55e" />
                        ) : (
                          <Circle size={17} color="#737373" />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: isActive ? 700 : 500 }}>
                          {lesson.title}
                        </div>
                        {lesson.durationSeconds ? (
                          <div style={{ fontSize: '0.76rem', color: '#8A8A8A', marginTop: 2 }}>
                            {formatDuration(lesson.durationSeconds)}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </SidebarCurriculum>
        </ClassroomLayout>
      </Container>
    </Section>
  );
}
