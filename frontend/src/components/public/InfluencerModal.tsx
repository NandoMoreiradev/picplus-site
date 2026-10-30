import styled from 'styled-components';
import { Download, ExternalLink, Eye, MapPin, Users } from 'lucide-react';
import { assetUrl } from '../../lib/api';
import { formatCompactNumber, formatNumber, getTotalFollowers, parseSocialNetwork } from '../../lib/format';
import type { ShowcaseInfluencer, SocialNetwork } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { ButtonAnchor, ButtonLink } from '../ui/Button';
import { Badge } from '../ui/Feedback';
import { SOCIAL_META } from '../ui/icons';
import { Modal } from '../ui/Modal';
import { CoverImage } from './cards';

const Hero = styled.div`
  margin: -1.5rem -1.5rem 0;

  .avatar {
    margin: -44px 0 0 1.5rem;
    width: fit-content;
    border-radius: 50%;
    border: 5px solid ${({ theme }) => theme.colors.surface};
    position: relative;
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-top: 1rem;

  h3 {
    font-size: 1.6rem;
    font-weight: 800;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.9rem;
  }
  .row .loc {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .bio {
    color: ${({ theme }) => theme.colors.textSecondary};
    white-space: pre-line;
  }
  h4 {
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: 0.6rem;
  }
  .socials {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .social {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.5rem 0.95rem;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.pill};
    font-size: 0.9rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    text-decoration: none;
    transition: all 0.15s ease;
  }
  .social:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-1px);
  }
  .social .followers-tag {
    font-size: 0.82rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.85rem;
`;

const MetricCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1.1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary};
    border: 1px solid ${({ theme }) => theme.colors.border};
    flex-shrink: 0;
  }

  .data {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .value {
    font-size: 1.25rem;
    font-weight: 800;
    line-height: 1.2;
    color: ${({ theme }) => theme.colors.text};
  }

  .label {
    font-size: 0.74rem;
    color: ${({ theme }) => theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    margin-top: 0.2rem;
  }
`;

/** Perfil completo de um influenciador da vitrine. */
export function InfluencerModal({
  influencer,
  onClose,
}: {
  influencer: ShowcaseInfluencer | null;
  onClose: () => void;
}) {
  if (!influencer) return null;

  const totalFollowers = getTotalFollowers(influencer.socialNetworks, influencer.totalFollowers);
  const hasFollowers = totalFollowers > 0;
  const hasImpressions = typeof influencer.impressions === 'number' && influencer.impressions > 0;

  const networks = Object.entries(influencer.socialNetworks ?? {})
    .map(([network, value]) => [network as SocialNetwork, parseSocialNetwork(value)] as const)
    .filter(([, detail]) => Boolean(detail?.url));

  const pdf = assetUrl(influencer.presentationPdf);

  return (
    <Modal open onClose={onClose} title={influencer.name} width="620px">
      <Hero>
        <CoverImage src={influencer.coverImage ?? influencer.profileImage} alt="" ratio="16 / 6" full />
        <div className="avatar">
          <Avatar src={influencer.profileImage} name={influencer.name} size={88} />
        </div>
      </Hero>
      <Content>
        <div>
          <h3>{influencer.name}</h3>
          <div className="row">
            {influencer.niche && <Badge $tone="primary">{influencer.niche}</Badge>}
            {influencer.location && (
              <span className="loc">
                <MapPin size={14} aria-hidden /> {influencer.location}
              </span>
            )}
          </div>
        </div>

        {(hasFollowers || hasImpressions) && (
          <MetricsGrid>
            {hasFollowers && (
              <MetricCard>
                <div className="icon">
                  <Users size={22} aria-hidden />
                </div>
                <div className="data">
                  <span className="value" title={`${formatNumber(totalFollowers)} seguidores`}>
                    {formatCompactNumber(totalFollowers)}
                  </span>
                  <span className="label">Seguidores totais</span>
                </div>
              </MetricCard>
            )}
            {hasImpressions && (
              <MetricCard>
                <div className="icon">
                  <Eye size={22} aria-hidden />
                </div>
                <div className="data">
                  <span className="value" title={`${formatNumber(influencer.impressions)} impressões`}>
                    {formatCompactNumber(influencer.impressions)}
                  </span>
                  <span className="label">Impressões mensais</span>
                </div>
              </MetricCard>
            )}
          </MetricsGrid>
        )}

        {influencer.description && <p className="bio">{influencer.description}</p>}

        {networks.length > 0 && (
          <div>
            <h4>Redes sociais</h4>
            <div className="socials">
              {networks.map(([network, detail]) => {
                if (!detail) return null;
                const { Icon, label } = SOCIAL_META[network];
                const hasCount = detail.followers !== undefined && detail.followers > 0;
                return (
                  <a
                    key={network}
                    className="social"
                    href={detail.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={hasCount ? `${label}: ${formatNumber(detail.followers)} seguidores` : label}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                    {hasCount && (
                      <span className="followers-tag">· {formatCompactNumber(detail.followers)} seg.</span>
                    )}
                    <ExternalLink size={12} aria-hidden style={{ opacity: 0.6 }} />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <div className="actions">
          {pdf && (
            <ButtonAnchor href={pdf} target="_blank" rel="noopener noreferrer" $variant="secondary">
              <Download size={18} aria-hidden /> Baixar apresentação (PDF)
            </ButtonAnchor>
          )}
          <ButtonLink to="/orcamento" onClick={onClose}>
            Contratar este criador
          </ButtonLink>
        </div>
      </Content>
    </Modal>
  );
}
