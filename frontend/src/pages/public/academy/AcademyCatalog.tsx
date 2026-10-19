import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  Award,
  BookOpen,
  Clock,
  GraduationCap,
  PlayCircle,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Chip, Chips } from '../../../components/ui/Chips';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Container, Grid, Highlight, PageHero, Section } from '../../../components/ui/Layout';
import { SearchInput } from '../../../components/ui/SearchInput';
import { useStudentAuth } from '../../../context/student-auth-context';
import { useFetch } from '../../../hooks/useFetch';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { assetUrl } from '../../../lib/api';
import {
  COURSE_LEVEL_LABEL,
  formatCentsBRL,
  formatDuration,
  type Course,
} from '../../../lib/academy';

const TopBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};

  .info {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .icon-box {
    width: 42px;
    height: 42px;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.primarySoft};
    border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
    color: ${({ theme }) => theme.colors.primary};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
  }
`;

const FiltersRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;

  .search-wrap {
    max-width: 480px;
  }
`;

const CourseCard = styled(Link)`
  display: flex;
  flex-direction: column;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;
  transition:
    transform ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: translateY(-4px);
    border-color: ${({ theme }) => theme.colors.primaryBorder};
    box-shadow: ${({ theme }) => theme.shadows.cardHover};
  }

  .thumb {
    position: relative;
    aspect-ratio: 16 / 9;
    background: linear-gradient(135deg, #161616 0%, #242424 100%);
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.35s ease;
    }
  }

  &:hover .thumb img {
    transform: scale(1.04);
  }

  .thumb-placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    color: ${({ theme }) => theme.colors.primary};
    background: radial-gradient(circle at 30% 20%, rgba(182, 232, 41, 0.18), transparent 65%), #141414;
  }

  .badges {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    right: 0.75rem;
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    pointer-events: none;
  }

  .badge {
    padding: 0.25rem 0.65rem;
    border-radius: ${({ theme }) => theme.radii.pill};
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    background: rgba(10, 10, 10, 0.82);
    backdrop-filter: blur(8px);
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid rgba(255, 255, 255, 0.14);
  }

  .badge.featured {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
    border-color: transparent;
  }

  .body {
    padding: 1.35rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
  }

  .category {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.colors.primary};
  }

  h3 {
    font-size: 1.2rem;
    line-height: 1.3;
    margin: 0;
  }

  .subtitle {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.9rem;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-top: auto;
    padding-top: 0.5rem;

    span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
  }

  .footer {
    margin-top: 0.5rem;
    padding-top: 0.9rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .price-box {
    display: flex;
    flex-direction: column;

    .old-price {
      font-size: 0.78rem;
      color: ${({ theme }) => theme.colors.textMuted};
      text-decoration: line-through;
    }

    .price {
      font-size: 1.25rem;
      font-weight: 800;
      color: ${({ theme }) => theme.colors.primary};
    }
  }

  .cta-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
`;

export function AcademyCatalog() {
  usePageMeta(
    'PicPlus Academy — Cursos de Marketing, Audiovisual e Influência',
    'Aprenda na prática com os especialistas da PicPlus: cursos completos de posicionamento, tráfego, audiovisual e marketing de influência com certificado.',
  );

  const { student } = useStudentAuth();
  const { data, loading, error, reload } = useFetch<Course[]>('/academy/courses');
  const courses = useMemo(() => data ?? [], [data]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      if (c.category?.trim()) set.add(c.category.trim());
    }
    return Array.from(set);
  }, [courses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (selectedCategory && c.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        (c.subtitle ?? '').toLowerCase().includes(q) ||
        (c.instructorName ?? '').toLowerCase().includes(q) ||
        (c.category ?? '').toLowerCase().includes(q)
      );
    });
  }, [courses, search, selectedCategory]);

  return (
    <>
      <PageHero
        eyebrow="PicPlus Academy"
        title={
          <>
            Domine o jogo do <Highlight>marketing e audiovisual</Highlight>
          </>
        }
        description="Formações práticas criadas nos bastidores da PicPlus para profissionais, criadores e empresários que buscam crescimento real e certificado reconhecido."
      />

      <Section $tight>
        <Container>
          <TopBar>
            <div className="info">
              <div className="icon-box">
                <GraduationCap size={22} />
              </div>
              <div>
                <strong>{student ? `Olá, ${student.name}!` : 'Já é aluno da PicPlus Academy?'}</strong>
                <div style={{ fontSize: '0.86rem', color: '#A3A3A3' }}>
                  {student
                    ? 'Acesse sua área do aluno para continuar assistindo suas aulas e emitir certificados.'
                    : 'Entre na sua conta para acessar seus cursos adquiridos, materiais de apoio e certificados.'}
                </div>
              </div>
            </div>
            <div className="actions">
              {student ? (
                <ButtonLink to="/academy/minha-area" $size="sm">
                  <UserCheck size={16} /> Ir para Minha Área
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to="/academy/entrar" $variant="secondary" $size="sm">
                    Entrar na conta
                  </ButtonLink>
                  <ButtonLink to="/academy/cadastro" $size="sm">
                    Criar conta de aluno
                  </ButtonLink>
                </>
              )}
            </div>
          </TopBar>

          <FiltersRow>
            <div className="search-wrap">
              <SearchInput
                value={search}
                onChange={setSearch}
                label="Buscar cursos"
                placeholder="Buscar por tema, curso ou instrutor…"
              />
            </div>

            {categories.length > 0 && (
              <Chips role="group" aria-label="Filtrar por categoria">
                <Chip $active={selectedCategory === null} onClick={() => setSelectedCategory(null)}>
                  Todos os cursos
                </Chip>
                {categories.map((cat) => (
                  <Chip
                    key={cat}
                    $active={selectedCategory === cat}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Chip>
                ))}
              </Chips>
            )}
          </FiltersRow>

          {error ? (
            <ErrorState message={error.message} onRetry={reload} />
          ) : loading ? (
            <Grid $min="320px">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} $h="420px" $radius="16px" />
              ))}
            </Grid>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={courses.length === 0 ? 'Novas turmas em breve' : 'Nenhum curso encontrado'}
              description={
                courses.length === 0
                  ? 'Estamos preparando nossos próximos cursos exclusivos. Volte em breve!'
                  : 'Tente ajustar o termo de busca ou limpar o filtro de categoria.'
              }
              action={
                (search || selectedCategory) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setSelectedCategory(null);
                    }}
                  >
                    Limpar filtros
                  </Button>
                )
              }
            />
          ) : (
            <Grid $min="320px">
              {filtered.map((course) => {
                const lessonsCount = course.lessonsCount ?? 0;
                const coverSrc = assetUrl(course.coverImage);
                return (
                  <CourseCard key={course.id} to={`/academy/curso/${course.slug}`}>
                    <div className="thumb">
                      {coverSrc ? (
                        <img src={coverSrc} alt={course.title} loading="lazy" />
                      ) : (
                        <div className="thumb-placeholder">
                          <GraduationCap size={48} />
                        </div>
                      )}
                      <div className="badges">
                        <span className="badge">{COURSE_LEVEL_LABEL[course.level]}</span>
                        {course.featured && (
                          <span className="badge featured">
                            <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />
                            Destaque
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="body">
                      {course.category && <span className="category">{course.category}</span>}
                      <h3>{course.title}</h3>
                      {course.subtitle && <p className="subtitle">{course.subtitle}</p>}

                      <div className="meta">
                        <span>
                          <BookOpen size={14} /> {lessonsCount}{' '}
                          {lessonsCount === 1 ? 'aula' : 'aulas'}
                        </span>
                        {course.workloadHours > 0 ? (
                          <span>
                            <Clock size={14} /> {course.workloadHours}h
                          </span>
                        ) : course.totalDurationSeconds ? (
                          <span>
                            <Clock size={14} /> {formatDuration(course.totalDurationSeconds)}
                          </span>
                        ) : null}
                        <span>
                          <Award size={14} /> Certificado incluso
                        </span>
                      </div>

                      <div className="footer">
                        <div className="price-box">
                          {course.compareAtPriceCents &&
                            course.compareAtPriceCents > course.priceCents && (
                              <span className="old-price">
                                {formatCentsBRL(course.compareAtPriceCents)}
                              </span>
                            )}
                          <span className="price">
                            {course.priceCents === 0
                              ? 'Gratuito'
                              : formatCentsBRL(course.priceCents)}
                          </span>
                        </div>
                        <span className="cta-label">
                          Ver detalhes <PlayCircle size={16} />
                        </span>
                      </div>
                    </div>
                  </CourseCard>
                );
              })}
            </Grid>
          )}
        </Container>
      </Section>
    </>
  );
}
