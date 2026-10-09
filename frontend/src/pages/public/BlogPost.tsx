import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, Check, Clock, Link2 } from 'lucide-react';
import { ArticleCard, CoverImage } from '../../components/public/cards';
import { CtaBand } from '../../components/public/CtaBand';
import { Prose } from '../../components/public/Prose';
import { ButtonLink } from '../../components/ui/Button';
import { Badge, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { Container, Grid, Section } from '../../components/ui/Layout';
import { useFetch } from '../../hooks/useFetch';
import { usePageMeta } from '../../hooks/usePageMeta';
import { formatDate, readingTime } from '../../lib/format';
import type { Article, ArticleSummary } from '../../lib/types';

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
  gap: 1.1rem;
  margin-bottom: 2.5rem;

  h1 {
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 800;
  }
  .excerpt {
    font-size: 1.25rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.9rem;
  }
  .meta span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
`;

const CoverWrap = styled.div`
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 3rem;
`;

const Share = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};

  button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.pill};
    font-weight: 700;
    font-size: 0.9rem;
    transition: all ${({ theme }) => theme.transitions.fast};
  }
  button:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export function BlogPost() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useFetch<Article>(slug ? `/articles/${slug}` : null);
  const related = useFetch<ArticleSummary[]>(slug ? `/articles/${slug}/related` : null);
  const [copied, setCopied] = useState(false);

  usePageMeta(data?.title, data?.excerpt ?? undefined, {
    image: data?.coverImage,
    noindex: !data,
    jsonLd: data
      ? { '@context': 'https://schema.org', '@type': 'Article', headline: data.title, description: data.excerpt ?? undefined, image: data.coverImage ?? undefined, publisher: { '@type': 'Organization', name: 'PicPlus' } }
      : undefined,
  });

  if (loading && !data) return <PageLoader />;
  if (error || !data) {
    return (
      <Section>
        <Container>
          <ErrorState
            message={error?.status === 404 ? 'Este artigo não foi encontrado ou não está mais disponível.' : (error?.message ?? 'Erro inesperado.')}
            onRetry={error?.status === 404 ? undefined : reload}
          />
          <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/blog">← Ver todos os artigos</Link>
          </p>
        </Container>
      </Section>
    );
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard indisponível */
    }
  };

  return (
    <>
      <Section $tight>
        <Container $narrow>
          <Back to="/blog">
            <ArrowLeft size={18} aria-hidden /> Todos os artigos
          </Back>

          <Head>
            {data.category && (
              <div>
                <Badge $tone="primary">{data.category}</Badge>
              </div>
            )}
            <h1>{data.title}</h1>
            {data.excerpt && <p className="excerpt">{data.excerpt}</p>}
            <div className="meta">
              <time dateTime={data.publishedAt ?? undefined}>{formatDate(data.publishedAt)}</time>
              {data.author?.name && <span>por {data.author.name}</span>}
              <span>
                <Clock size={14} aria-hidden /> {readingTime(data.content)} min de leitura
              </span>
            </div>
          </Head>

          {data.coverImage && (
            <CoverWrap>
              <CoverImage src={data.coverImage} alt={data.title} ratio="16 / 9" />
            </CoverWrap>
          )}

          <Prose>{data.content}</Prose>

          <Share>
            <span>Gostou? Compartilhe:</span>
            <button type="button" onClick={copyLink}>
              {copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
              {copied ? 'Link copiado!' : 'Copiar link'}
            </button>
          </Share>
        </Container>
      </Section>

      {(related.data?.length ?? 0) > 0 && (
        <Section $surface $tight>
          <Container>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>Leia também</h2>
            <Grid $min="320px">
              {related.data?.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </Grid>
          </Container>
        </Section>
      )}

      <CtaBand title="Quer aplicar isso na sua marca?" description="Nossa equipe ajuda você a transformar ideias em campanhas.">
        <ButtonLink to="/orcamento" $variant="dark" $size="lg">
          Solicitar orçamento
        </ButtonLink>
      </CtaBand>
    </>
  );
}
