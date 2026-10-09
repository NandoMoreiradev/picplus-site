import styled from 'styled-components';
import { ExternalLink } from 'lucide-react';
import { CtaBand } from '../../components/public/CtaBand';
import { EpisodeGrid } from '../../components/public/PicCast';
import { ButtonAnchor } from '../../components/ui/Button';
import { Container, Highlight, PageHero, Section, SectionHeader } from '../../components/ui/Layout';
import { piccast } from '../../content/piccast';
import { usePageMeta } from '../../hooks/usePageMeta';

const MoreAction = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 3rem;
`;

export function PicCast() {
  usePageMeta(
    'PicCast',
    'PicCast, o podcast da Picplus Company: histórias, lições e ideias de empreendedores para você seguir firme na sua jornada.',
  );

  return (
    <>
      <PageHero
        eyebrow="O podcast da Picplus Company"
        title={
          <>
            Bem-vindos ao <Highlight>PicCast</Highlight>
          </>
        }
        description="Histórias inspiradoras, lições de vida e ideias para quem empreende com resiliência e paixão."
      >
        <ButtonAnchor href={piccast.channelUrl} target="_blank" rel="noopener noreferrer" $size="lg">
          Ouvir no YouTube <ExternalLink size={18} aria-hidden />
        </ButtonAnchor>
      </PageHero>

      <Section $surface>
        <Container>
          <SectionHeader
            eyebrow="Episódios"
            title="Últimos episódios"
            description="Dê o play e acompanhe as conversas com empreendedores que estão fazendo acontecer."
          />
          <EpisodeGrid episodes={piccast.episodes} />
          <MoreAction>
            <ButtonAnchor
              href={piccast.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              $variant="secondary"
              $size="lg"
            >
              Ver todos os episódios no YouTube <ExternalLink size={18} aria-hidden />
            </ButtonAnchor>
          </MoreAction>
        </Container>
      </Section>

      <CtaBand title="Faça parte desta jornada épica" description={piccast.closing}>
        <ButtonAnchor
          href={piccast.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          $variant="dark"
          $size="lg"
        >
          Inscreva-se no canal <ExternalLink size={18} aria-hidden />
        </ButtonAnchor>
      </CtaBand>
    </>
  );
}
