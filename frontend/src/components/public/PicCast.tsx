import { useState } from 'react';
import styled from 'styled-components';
import { Play } from 'lucide-react';
import { Card, Grid } from '../ui/Layout';
import { Reveal } from '../ui/Reveal';

export interface Episode {
  videoId: string;
  number?: number;
  title: string;
  guest?: string;
}

const EpisodeCard = styled(Card)`
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;

  .player {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #000;
  }
  .player button,
  .player iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
  /* hqdefault tem faixas pretas em cima e embaixo; o cover do 16:9 as recorta. */
  .player img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform ${({ theme }) => theme.transitions.default};
  }
  .player button:hover img {
    transform: scale(1.04);
  }
  .play {
    position: absolute;
    top: 50%;
    left: 50%;
    display: grid;
    place-items: center;
    width: 60px;
    height: 60px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
    box-shadow: ${({ theme }) => theme.shadows.glow};
  }
  .info {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 1.1rem 1.25rem 1.35rem;
  }
  .number {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.primary};
  }
  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    line-height: 1.3;
  }
  .guest {
    font-size: 0.92rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

/** O iframe do YouTube só é carregado no clique: a página abre rápido mesmo com 6 vídeos. */
function EpisodeItem({ episode }: { episode: Episode }) {
  const [playing, setPlaying] = useState(false);
  const { videoId, number, title, guest } = episode;
  const label = number ? `PicCast #${number}: ${title}` : `PicCast: ${title}`;

  return (
    <EpisodeCard $interactive>
      <div className="player">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} aria-label={`Assistir ${label}`}>
            <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" loading="lazy" />
            <span className="play" aria-hidden>
              <Play size={26} fill="currentColor" />
            </span>
          </button>
        )}
      </div>
      <div className="info">
        {number && <span className="number">Episódio {number}</span>}
        <h3>{title}</h3>
        {guest && <span className="guest">com {guest}</span>}
      </div>
    </EpisodeCard>
  );
}

export function EpisodeGrid({ episodes }: { episodes: Episode[] }) {
  return (
    <Grid $min="320px" $gap="1.75rem">
      {episodes.slice(0, 6).map((episode, index) => (
        <Reveal key={episode.videoId} delay={(index % 3) * 80}>
          <EpisodeItem episode={episode} />
        </Reveal>
      ))}
    </Grid>
  );
}
