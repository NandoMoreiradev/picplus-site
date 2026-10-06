import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowUpRight, Check, MapPin } from 'lucide-react';
import { assetUrl } from '../../lib/api';
import { formatShortDate } from '../../lib/format';
import type {
  ArticleSummary,
  ShowcaseInfluencer,
  Service,
  SocialNetwork,
  SuccessCase,
  TeamMember,
} from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Feedback';
import { InstagramIcon, LinkedInIcon, ServiceIcon, SOCIAL_META } from '../ui/icons';
import { Card } from '../ui/Layout';

/* ── Capa de imagem com degradê quando não há foto ───── */

const Cover = styled.div<{ $ratio?: string }>`
  position: relative;
  aspect-ratio: ${({ $ratio = '16 / 10' }) => $ratio};
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 20%, rgba(182, 232, 41, 0.22), transparent 55%),
    linear-gradient(135deg, ${({ theme }) => theme.colors.surfaceHover}, ${({ theme }) => theme.colors.background});

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
  }
`;

export function CoverImage({ src, alt, ratio }: { src?: string | null; alt: string; ratio?: string }) {
  const url = assetUrl(src);
  return <Cover $ratio={ratio}>{url && <img src={url} alt={alt} loading="lazy" />}</Cover>;
}

/* ── Serviço ─────────────────────────────────────────── */

const ServiceBox = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.75rem;
  height: 100%;

  .icon {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
    transition: all ${({ theme }) => theme.transitions.default};
  }
  &:hover .icon {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
  }
  h3 {
    font-size: 1.3rem;
    font-weight: 800;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: auto;
    padding-top: 0.5rem;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    font-size: 0.92rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  li svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export function ServiceCard({ service, detailed }: { service: Service; detailed?: boolean }) {
  return (
    <ServiceBox $interactive>
      <div className="icon">
        <ServiceIcon icon={service.icon} size={26} aria-hidden />
      </div>
      <h3>{service.name}</h3>
      <p>{detailed ? service.description : (service.shortDescription ?? service.description)}</p>
      {detailed && service.features.length > 0 && (
        <ul>
          {service.features.map((feature) => (
            <li key={feature}>
              <Check size={16} aria-hidden /> {feature}
            </li>
          ))}
        </ul>
      )}
    </ServiceBox>
  );
}

/* ── Case de sucesso ─────────────────────────────────── */

const CaseLink = styled(Link)`
  display: block;
  height: 100%;
  color: inherit;
  &:hover {
    color: inherit;
  }
  &:hover img {
    transform: scale(1.06);
  }
`;

const CaseBox = styled(Card)`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .body {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1.4rem 1.5rem 1.6rem;
    flex: 1;
  }
  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  h3 {
    font-size: 1.3rem;
    font-weight: 800;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.95rem;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .metrics {
    display: flex;
    gap: 1.5rem;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
  .metric strong {
    display: block;
    font-size: 1.4rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text};
  }
  .metric span {
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

export function CaseCard({ item }: { item: SuccessCase }) {
  const metrics = (item.metrics ?? []).slice(0, 3);
  return (
    <CaseLink to={`/cases/${item.slug}`}>
      <CaseBox $interactive>
        <CoverImage src={item.coverImage ?? item.images[0]} alt={item.title} />
        <div className="body">
          <div className="meta">
            <span>{item.clientName}</span>
            {item.segment && <Badge $tone="neutral">{item.segment}</Badge>}
          </div>
          <h3>{item.title}</h3>
          <p>{item.summary ?? item.description}</p>
          {metrics.length > 0 && (
            <div className="metrics">
              {metrics.map((metric) => (
                <div className="metric" key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CaseBox>
    </CaseLink>
  );
}

/* ── Influenciador (vitrine) ─────────────────────────── */

const InfluencerBox = styled(Card).attrs({ as: 'button' })`
  display: block;
  width: 100%;
  text-align: left;
  overflow: hidden;
  cursor: pointer;
  color: inherit;
  height: 100%;

  &:hover img {
    transform: scale(1.06);
  }
  .body {
    position: relative;
    padding: 0 1.4rem 1.5rem;
  }
  .avatar {
    margin-top: -36px;
    margin-bottom: 0.75rem;
    width: fit-content;
    border-radius: 50%;
    border: 4px solid ${({ theme }) => theme.colors.surface};
  }
  h3 {
    font-size: 1.2rem;
    font-weight: 800;
  }
  .row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 0.5rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.85rem;
  }
  .row span.loc {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .socials {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

export function InfluencerCard({
  influencer,
  onSelect,
}: {
  influencer: ShowcaseInfluencer;
  onSelect: (influencer: ShowcaseInfluencer) => void;
}) {
  const networks = Object.keys(influencer.socialNetworks ?? {}) as SocialNetwork[];
  return (
    <InfluencerBox $interactive type="button" onClick={() => onSelect(influencer)}>
      <CoverImage src={influencer.coverImage ?? influencer.profileImage} alt="" ratio="16 / 7" />
      <div className="body">
        <div className="avatar">
          <Avatar src={influencer.profileImage} name={influencer.name} size={72} />
        </div>
        <h3>{influencer.name}</h3>
        <div className="row">
          {influencer.niche && <Badge $tone="primary">{influencer.niche}</Badge>}
          {influencer.location && (
            <span className="loc">
              <MapPin size={13} aria-hidden /> {influencer.location}
            </span>
          )}
        </div>
        {networks.length > 0 && (
          <div className="socials" aria-label="Redes sociais">
            {networks.map((network) => {
              const { Icon, label } = SOCIAL_META[network];
              return <Icon key={network} size={18} aria-label={label} />;
            })}
          </div>
        )}
      </div>
    </InfluencerBox>
  );
}

/* ── Artigo ──────────────────────────────────────────── */

const ArticleLink = styled(Link)`
  display: block;
  height: 100%;
  color: inherit;
  &:hover {
    color: inherit;
  }
  &:hover img {
    transform: scale(1.06);
  }
`;

const ArticleBox = styled(Card)`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .body {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1.4rem 1.5rem 1.6rem;
    flex: 1;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  h3 {
    font-size: 1.25rem;
    font-weight: 800;
    line-height: 1.25;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.95rem;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .more {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: auto;
    padding-top: 0.5rem;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 800;
    font-size: 0.9rem;
  }
`;

export function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <ArticleLink to={`/blog/${article.slug}`}>
      <ArticleBox $interactive>
        <CoverImage src={article.coverImage} alt={article.title} />
        <div className="body">
          <div className="meta">
            {article.category && <Badge $tone="primary">{article.category}</Badge>}
            <time dateTime={article.publishedAt ?? undefined}>{formatShortDate(article.publishedAt)}</time>
          </div>
          <h3>{article.title}</h3>
          {article.excerpt && <p>{article.excerpt}</p>}
          <span className="more">
            Ler artigo <ArrowUpRight size={16} aria-hidden />
          </span>
        </div>
      </ArticleBox>
    </ArticleLink>
  );
}

/* ── Equipe ──────────────────────────────────────────── */

const TeamBox = styled.div`
  text-align: center;

  .photo {
    position: relative;
    aspect-ratio: 1;
    border-radius: ${({ theme }) => theme.radii.xl};
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.surface};
    margin-bottom: 1rem;
  }
  .photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: grayscale(0.35);
    transition: all 0.5s ease;
  }
  &:hover .photo img {
    filter: none;
    transform: scale(1.04);
  }
  .initials {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    font-size: 3rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.primary};
    background:
      radial-gradient(circle at 30% 20%, rgba(182, 232, 41, 0.2), transparent 60%),
      ${({ theme }) => theme.colors.surface};
  }
  h3 {
    font-size: 1.15rem;
    font-weight: 800;
  }
  .role {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 700;
    font-size: 0.9rem;
  }
  .bio {
    margin-top: 0.5rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.9rem;
  }
  .links {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

export function TeamCard({ member }: { member: TeamMember }) {
  const photo = assetUrl(member.photo);
  const initialsText = member.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
  return (
    <TeamBox>
      <div className="photo">
        {photo ? <img src={photo} alt={member.name} loading="lazy" /> : <div className="initials">{initialsText}</div>}
      </div>
      <h3>{member.name}</h3>
      <div className="role">{member.role}</div>
      {member.bio && <p className="bio">{member.bio}</p>}
      {(member.instagram || member.linkedin) && (
        <div className="links">
          {member.instagram && (
            <a href={member.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Instagram de ${member.name}`}>
              <InstagramIcon size={18} />
            </a>
          )}
          {member.linkedin && (
            <a href={member.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`LinkedIn de ${member.name}`}>
              <LinkedInIcon size={18} />
            </a>
          )}
        </div>
      )}
    </TeamBox>
  );
}
