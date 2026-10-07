import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ArrowUpRight, ChevronLeft, ChevronRight, Play, Quote } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { assetUrl } from '../../lib/api';
import type { Testimonial } from '../../lib/types';
import { youtubeEmbedUrl, youtubeThumbnail, youtubeWatchUrl } from '../../lib/youtube';
import { Container, Section, SectionHeader } from '../ui/Layout';
import { Modal } from '../ui/Modal';
import { Reveal } from '../ui/Reveal';

const GAP = 20; // px (1.25rem)

/* ── Faixa de cartões ────────────────────────────────── */

const Viewport = styled.div`
  position: relative;
`;

/**
 * Faixa horizontal com "snap". Com até 3 depoimentos, em telas largas os cartões se
 * dividem a largura (sem rolagem); com mais, ou no celular, vira um carrossel.
 */
const Track = styled.ul<{ $fit: boolean }>`
  display: flex;
  gap: ${GAP}px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: 0.25rem 0.25rem 1rem;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  li {
    flex: 0 0 min(300px, 78vw);
    scroll-snap-align: start;
  }

  ${({ $fit, theme }) =>
    $fit &&
    `
    @media (min-width: ${theme.breakpoints.tablet}) {
      justify-content: center;
      li {
        flex: 1 1 0;
        min-width: 260px;
        max-width: 380px;
      }
    }
  `}
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.5rem;

  button {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surface};
    transition: all ${({ theme }) => theme.transitions.fast};
  }
  button:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
  button:disabled {
    opacity: 0.35;
  }
`;

/* ── Cartão ──────────────────────────────────────────── */

const CardButton = styled.button`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  text-align: left;
  color: inherit;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  transition:
    transform ${({ theme }) => theme.transitions.default},
    border-color ${({ theme }) => theme.transitions.default},
    box-shadow ${({ theme }) => theme.transitions.default};

  &:hover {
    transform: translateY(-4px);
    border-color: ${({ theme }) => theme.colors.primaryBorder};
    box-shadow: ${({ theme }) => theme.shadows.cardHover};
  }
  &:hover .play {
    transform: scale(1.1);
  }
  &:hover img {
    transform: scale(1.05);
  }

  .media {
    position: relative;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    background:
      radial-gradient(circle at 30% 20%, rgba(182, 232, 41, 0.22), transparent 55%),
      linear-gradient(135deg, ${({ theme }) => theme.colors.surfaceHover}, ${({ theme }) => theme.colors.background});
  }
  .media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
  }
  .media::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 45%, rgba(10, 10, 10, 0.75));
  }
  .play {
    position: absolute;
    z-index: 1;
    left: 50%;
    top: 50%;
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    margin: -32px 0 0 -32px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
    box-shadow: ${({ theme }) => theme.shadows.glow};
    transition: transform ${({ theme }) => theme.transitions.fast};
  }
  .play svg {
    margin-left: 3px; /* compensa o centro óptico do triângulo */
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem 1.4rem 1.5rem;
    flex: 1;
  }
  .quote {
    position: relative;
    padding-top: 1.6rem;
    font-size: 1.05rem;
    line-height: 1.55;
    font-weight: 600;
  }
  .quote svg {
    position: absolute;
    top: 0;
    left: 0;
    color: ${({ theme }) => theme.colors.primary};
  }
  .who {
    margin-top: auto;
    padding-top: 0.9rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
  .who strong {
    display: block;
    font-size: 1rem;
  }
  .who span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.88rem;
  }
`;

function TestimonialCard({ item, onPlay }: { item: Testimonial; onPlay: (item: Testimonial) => void }) {
  const [failed, setFailed] = useState(false);
  // Foto do cliente; sem ela (ou se quebrar), usa o quadro do próprio vídeo.
  const image = !failed && item.photo ? assetUrl(item.photo) : youtubeThumbnail(item.youtubeId);
  const subtitle = [item.role, item.company].filter(Boolean).join(' · ');

  return (
    <CardButton
      type="button"
      onClick={() => onPlay(item)}
      aria-label={`Assistir ao depoimento de ${item.clientName}, ${item.company}`}
    >
      <div className="media">
        <img src={image} alt="" loading="lazy" onError={() => setFailed(true)} />
        <span className="play" aria-hidden>
          <Play size={26} fill="currentColor" />
        </span>
      </div>
      <div className="body">
        <p className="quote">
          <Quote size={20} aria-hidden />
          {item.quote}
        </p>
        <div className="who">
          <strong>{item.clientName}</strong>
          <span>{subtitle}</span>
        </div>
      </div>
    </CardButton>
  );
}

/* ── Player em modal ─────────────────────────────────── */

const PlayerFrame = styled.div<{ $vertical: boolean }>`
  position: relative;
  margin: 0 auto;
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  background: #000;
  aspect-ratio: ${({ $vertical }) => ($vertical ? '9 / 16' : '16 / 9')};
  /* vertical: a largura é limitada pela altura da tela para o vídeo caber sem rolagem */
  width: ${({ $vertical }) => ($vertical ? 'min(100%, calc(68vh * 9 / 16))' : '100%')};

  iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
`;

const Caption = styled.div`
  margin-top: 1.25rem;
  text-align: center;

  p {
    font-weight: 600;
    line-height: 1.55;
  }
  small {
    display: block;
    margin-top: 0.4rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.85rem;
  }
`;

function VideoModal({ item, onClose }: { item: Testimonial | null; onClose: () => void }) {
  if (!item) return null;
  const vertical = item.orientation !== 'horizontal';
  const subtitle = [item.role, item.company].filter(Boolean).join(' · ');

  return (
    <Modal
      open
      onClose={onClose}
      title={`Depoimento de ${item.clientName}`}
      width={vertical ? '460px' : '920px'}
    >
      <PlayerFrame $vertical={vertical}>
        {/* O iframe só existe com o modal aberto: fechar interrompe o vídeo. */}
        <iframe
          src={youtubeEmbedUrl(item.youtubeId)}
          title={`Depoimento de ${item.clientName}, ${item.company}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </PlayerFrame>
      <Caption>
        <p>“{item.quote}”</p>
        <small>
          {item.clientName}
          {subtitle ? `, ${subtitle}` : ''}
        </small>
        <a href={youtubeWatchUrl(item.youtubeId)} target="_blank" rel="noopener noreferrer">
          Abrir no YouTube <ArrowUpRight size={14} aria-hidden />
        </a>
      </Caption>
    </Modal>
  );
}

/* ── Seção ───────────────────────────────────────────── */

/**
 * Depoimentos em vídeo da página inicial. Não renderiza nada enquanto não houver
 * depoimentos ativos. Até 3 ficam lado a lado; acima disso (ou no celular) vira carrossel.
 */
export function TestimonialsSection() {
  const { data } = useFetch<Testimonial[]>('/testimonials');
  const items = data ?? [];
  const [playing, setPlaying] = useState<Testimonial | null>(null);

  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ overflow: false, start: true, end: true });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 2;
    setEdges({
      overflow,
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [measure, items.length]);

  if (items.length === 0) return null;

  const scrollByCard = (direction: 1 | -1) => {
    const el = trackRef.current;
    const card = el?.querySelector('li');
    if (!el || !card) return;
    el.scrollBy({ left: direction * (card.getBoundingClientRect().width + GAP), behavior: 'smooth' });
  };

  return (
    <Section $surface>
      <Container>
        <SectionHeader
          eyebrow="Depoimentos"
          title="Não acredite na gente. Ouça quem já contratou."
          description="Em poucos segundos, clientes da PicPlus contam como foi trabalhar com estratégia, produção e influência no mesmo lugar."
        />
        <Reveal>
          <Viewport role="region" aria-roledescription="carrossel" aria-label="Depoimentos em vídeo">
            <Track ref={trackRef} $fit={items.length <= 3} onScroll={measure}>
              {items.map((item) => (
                <li key={item.id}>
                  <TestimonialCard item={item} onPlay={setPlaying} />
                </li>
              ))}
            </Track>
            {edges.overflow && (
              <Controls>
                <button type="button" onClick={() => scrollByCard(-1)} disabled={edges.start} aria-label="Depoimentos anteriores">
                  <ChevronLeft size={22} />
                </button>
                <button type="button" onClick={() => scrollByCard(1)} disabled={edges.end} aria-label="Próximos depoimentos">
                  <ChevronRight size={22} />
                </button>
              </Controls>
            )}
          </Viewport>
        </Reveal>
      </Container>
      <VideoModal item={playing} onClose={() => setPlaying(null)} />
    </Section>
  );
}
