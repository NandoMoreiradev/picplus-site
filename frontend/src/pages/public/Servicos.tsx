import { CtaBand } from '../../components/public/CtaBand';
import { ServiceCard } from '../../components/public/cards';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Container, Grid, Highlight, PageHero, Section } from '../../components/ui/Layout';
import { Reveal } from '../../components/ui/Reveal';
import { useFetch } from '../../hooks/useFetch';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Service } from '../../lib/types';

export function Servicos() {
  usePageMeta(
    'Serviços',
    'Marketing de influência, gestão de criadores, produção de conteúdo, estratégia e performance: conheça os serviços da PicPlus.',
  );
  const { data, loading, error, reload } = useFetch<Service[]>('/services');

  return (
    <>
      <PageHero
        eyebrow="Serviços"
        title={
          <>
            Soluções para <Highlight>cada etapa</Highlight> da sua campanha
          </>
        }
        description="Atuamos de ponta a ponta no marketing de influência, com uma equipe dedicada ao seu objetivo."
      />

      <Section>
        <Container>
          {error ? (
            <ErrorState message={error.message} onRetry={reload} />
          ) : loading && !data ? (
            <Grid $min="340px">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} $h="300px" $radius="16px" />
              ))}
            </Grid>
          ) : data && data.length > 0 ? (
            <Grid $min="340px">
              {data.map((service, index) => (
                <Reveal key={service.id} delay={(index % 3) * 80}>
                  <ServiceCard service={service} detailed />
                </Reveal>
              ))}
            </Grid>
          ) : (
            <EmptyState
              title="Em breve por aqui"
              description="Estamos preparando a apresentação dos nossos serviços."
              action={
                <ButtonLink to="/contato" $variant="secondary">
                  Falar com a equipe
                </ButtonLink>
              }
            />
          )}
        </Container>
      </Section>

      <CtaBand
        title="Não encontrou o que procurava?"
        description="Cada marca é única. Conte o seu desafio e desenhamos uma solução sob medida."
      >
        <ButtonLink to="/orcamento" $variant="dark" $size="lg">
          Solicitar orçamento
        </ButtonLink>
      </CtaBand>
    </>
  );
}
