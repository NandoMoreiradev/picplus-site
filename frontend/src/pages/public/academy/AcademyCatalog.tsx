import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Clock,
  GraduationCap,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Chip, Chips } from '../../../components/ui/Chips';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import {
  Container,
  Grid,
  Highlight,
  PageHero,
  Section,
  SectionHeader,
} from '../../../components/ui/Layout';
import { SearchInput } from '../../../components/ui/SearchInput';
import { useStudentAuth } from '../../../context/student-auth-context';
import { useFetch } from '../../../hooks/useFetch';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { assetUrl } from '../../../lib/api';
import { courseToAnalyticsItem, trackEcommerceEvent } from '../../../lib/analytics';
import {
  COURSE_LEVEL_LABEL,
  formatCentsBRL,
  formatDuration,
  type Course,
} from '../../../lib/academy';

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

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const HeroProof = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 1.5rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Step = styled.div`
  padding: 1.75rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primaryBorder};
  }

  .num {
    display: inline-grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin-bottom: 1.1rem;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
    font-weight: 800;
  }

  h3 {
    font-size: 1.15rem;
    margin: 0 0 0.5rem;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const StepsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  max-width: 1040px;
  margin: 0 auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    max-width: 480px;
  }
`;

const FinalCta = styled.div`
  padding: 3.5rem 2rem;
  text-align: center;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
  background:
    radial-gradient(ellipse 70% 120% at 50% -30%, rgba(182, 232, 41, 0.18), transparent 70%),
    ${({ theme }) => theme.colors.surface};

  h2 {
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    font-weight: 800;
    margin: 0 0 1rem;
  }

  p {
    max-width: 560px;
    margin: 0 auto 1.75rem;
    font-size: 1.05rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }
`;

const STEPS = [
  {
    title: 'Escolha o curso',
    text: 'Veja o conteúdo, o nível e a carga horária de cada formação e escolha a que resolve o seu momento.',
  },
  {
    title: 'Estude no seu ritmo',
    text: 'Acesse as aulas e os materiais de apoio pela sua área do aluno, quando e de onde quiser, e continue de onde parou.',
  },
  {
    title: 'Emita seu certificado',
    text: 'Ao concluir, seu certificado fica disponível na hora, com código de verificação para compartilhar.',
  },
];

export function AcademyCatalog() {
  const coursesRef = useRef<HTMLElement>(null);
  const scrollToCourses = () =>
    coursesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
            O que a gente aplica nos clientes, <Highlight>você aprende aqui.</Highlight>
          </>
        }
        description="Marketing, audiovisual e influência ensinados por quem vive isso todos os dias dentro da PicPlus. Sem teoria enfeitada, sem enrolação: método, bastidor e execução para você colocar em prática já na próxima semana."
      >
        <HeroActions>
          <Button onClick={scrollToCourses}>
            Ver os cursos <ArrowRight size={18} />
          </Button>
          {!student && (
            <ButtonLink to="/academy/entrar" $variant="secondary">
              Já sou aluno
            </ButtonLink>
          )}
        </HeroActions>
        <HeroProof>
          <span>
            <Check size={16} /> Aulas práticas, direto ao ponto
          </span>
          <span>
            <Check size={16} /> Estude no seu ritmo
          </span>
          <span>
            <Check size={16} /> Certificado de conclusão
          </span>
        </HeroProof>
      </PageHero>

      <Section $surface id="cursos" ref={coursesRef}>
        <Container>
          <SectionHeader
            eyebrow="Nossos cursos"
            title={
              <>
                Escolha sua próxima <Highlight>formação</Highlight>
              </>
            }
            description="Do posicionamento à produção, cada curso resolve um problema real do seu negócio ou da sua carreira."
          />

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
              {filtered.map((course, index) => {
                const lessonsCount = course.lessonsCount ?? 0;
                const coverSrc = assetUrl(course.coverImage);
                return (
                  <CourseCard
                    key={course.id}
                    to={`/academy/curso/${course.slug}`}
                    onClick={() =>
                      trackEcommerceEvent('select_item', {
                        items: [courseToAnalyticsItem(course, course.priceCents, index)],
                      })
                    }
                  >
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

      <Section>
        <Container>
          <SectionHeader
            eyebrow="Como funciona"
            title={
              <>
                Do primeiro clique ao <Highlight>certificado</Highlight>
              </>
            }
          />
          <StepsGrid>
            {STEPS.map((step, i) => (
              <Step key={step.title}>
                <span className="num">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </Step>
            ))}
          </StepsGrid>
        </Container>
      </Section>

      <Section $tight>
        <Container>
          <FinalCta>
            <h2>
              Quem aprende com quem faz, <Highlight>sai na frente.</Highlight>
            </h2>
            <p>
              Sua próxima decisão de carreira ou de negócio merece mais do que achismo. Comece hoje
              e aplique amanhã.
            </p>
            <div className="actions">
              <Button onClick={scrollToCourses}>
                Escolher meu curso <ArrowRight size={18} />
              </Button>
              {!student && (
                <ButtonLink to="/academy/cadastro" $variant="secondary">
                  Criar conta de aluno
                </ButtonLink>
              )}
            </div>
          </FinalCta>
        </Container>
      </Section>
    </>
  );
}
