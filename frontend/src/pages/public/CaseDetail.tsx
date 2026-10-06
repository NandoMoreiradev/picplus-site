import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import { CaseCard, CoverImage } from '../../components/public/cards';
import { CtaBand } from '../../components/public/CtaBand';
import { ButtonLink } from '../../components/ui/Button';
import { Badge, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { Card, Container, Eyebrow, Grid, Section } from '../../components/ui/Layout';
import { Modal } from '../../components/ui/Modal';
import { Reveal } from '../../components/ui/Reveal';
import { useFetch } from '../../hooks/useFetch';
import { usePageMeta } from '../../hooks/usePageMeta';
import { assetUrl } from '../../lib/api';
import type { SuccessCase } from '../../lib/types';

const Back = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 700;
`;

const Head = styled.header`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2.5rem;

  h1 {
    font-size: clamp(2rem, 5vw, 3.4rem);
    font-weight: 800;
    max-width: 880px;
  }
  .lead {
    font-size: 1.25rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    max-width: 760px;
  }
  .client {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 700;
  }
`;

const Cover = styled.div`
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 3rem;
`;

const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 3rem;
`;

const Metric = styled(Card)`
  padding: 1.5rem;
  text-align: center;
  background: radial-gradient(circle at 50% 0%, rgba(182, 232, 41, 0.14), transparent 70%),
    ${({ theme }) => theme.colors.surface};

  strong {
    display: block;
    font-size: 2.4rem;
    font-weight: 900;
    color: ${({ theme }) => theme.colors.primary};
    line-height: 1.1;
  }
  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.9rem;
  }
`;

const Prose = styled.div`
  max-width: 760px;

  h2 {
    font-size: 1.6rem;
    font-weight: 800;
    margin: 2.5rem 0 1rem;
  }
  p {
    font-size: 1.1rem;
    line-height: 1.85;
    color: ${({ theme }) => theme.colors.textSecondary};
    white-space: pre-line;
  }
`;

const Gallery = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  margin-top: 1rem;

  button {
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: ${({ theme }) => theme.radii.lg};
    border: 1px solid ${({ theme }) => theme.colors.border};
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  button:hover img {
    transform: scale(1.06);
  }
`;

const Lightbox = styled.img`
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: ${({ theme }) => theme.radii.md};
`;

export function CaseDetail() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useFetch<SuccessCase>(slug ? `/cases/${slug}` : null);
  const all = useFetch<SuccessCase[]>('/cases');
  const [zoom, setZoom] = useState<string | null>(null);

  usePageMeta(data?.title, data?.summary ?? undefined);

  if (loading && !data) return <PageLoader />;
  if (error || !data) {
    return (
      <Section>
        <Container>
          <ErrorState
            message={error?.status === 404 ? 'Este case não foi encontrado ou não está mais disponível.' : (error?.message ?? 'Erro inesperado.')}
            onRetry={error?.status === 404 ? undefined : reload}
          />
          <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/cases">← Ver todos os cases</Link>
          </p>
        </Container>
      </Section>
    );
  }

  const others = (all.data ?? []).filter((item) => item.id !== data.id).slice(0, 3);
  const cover = data.coverImage ?? data.images[0];
  const gallery = data.images.filter((image) => image !== cover || data.images.length > 1);

  return (
    <>
      <Section $tight>
        <Container>
          <Back to="/cases">
            <ArrowLeft size={18} aria-hidden /> Todos os cases
          </Back>

          <Reveal>
            <Head>
              <Eyebrow>Case de sucesso</Eyebrow>
              <h1>{data.title}</h1>
              {data.summary && <p className="lead">{data.summary}</p>}
              <div className="client">
                <span>Cliente: {data.clientName}</span>
                {data.segment && <Badge $tone="primary">{data.segment}</Badge>}
              </div>
            </Head>
          </Reveal>

          {cover && (
            <Cover>
              <CoverImage src={cover} alt={data.title} ratio="21 / 9" />
            </Cover>
          )}

          {(data.metrics?.length ?? 0) > 0 && (
            <Metrics>
              {data.metrics?.map((metric) => (
                <Metric key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </Metric>
              ))}
            </Metrics>
          )}

          <Prose>
            <h2>O desafio e a estratégia</h2>
            <p>{data.description}</p>
            {data.results && (
              <>
                <h2>Resultados</h2>
                <p>{data.results}</p>
              </>
            )}
          </Prose>

          {gallery.length > 0 && (
            <Prose style={{ maxWidth: 'none' }}>
              <h2>Galeria</h2>
              <Gallery>
                {gallery.map((image) => (
                  <button key={image} type="button" onClick={() => setZoom(image)} aria-label="Ampliar imagem">
                    <img src={assetUrl(image)} alt="" loading="lazy" />
                  </button>
                ))}
              </Gallery>
            </Prose>
          )}
        </Container>
      </Section>

      {others.length > 0 && (
        <Section $surface $tight>
          <Container>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>Outros cases</h2>
            <Grid $min="320px">
              {others.map((item) => (
                <CaseCard key={item.id} item={item} />
              ))}
            </Grid>
          </Container>
        </Section>
      )}

      <CtaBand title="Quer resultados como esses?" description="Vamos desenhar uma campanha para a sua marca.">
        <ButtonLink to="/orcamento" $variant="dark" $size="lg">
          Solicitar orçamento
        </ButtonLink>
      </CtaBand>

      <Modal open={!!zoom} onClose={() => setZoom(null)} title="Galeria" width="960px">
        {zoom && <Lightbox src={assetUrl(zoom)} alt="" />}
      </Modal>
    </>
  );
}
