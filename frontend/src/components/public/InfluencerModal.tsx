import styled from 'styled-components';
import { Download, MapPin } from 'lucide-react';
import { assetUrl } from '../../lib/api';
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
    gap: 0.5rem;
    padding: 0.5rem 0.95rem;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.pill};
    font-size: 0.9rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
  }
  .social:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding-top: 0.5rem;
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
  const networks = Object.entries(influencer.socialNetworks ?? {}) as [SocialNetwork, string][];
  const pdf = assetUrl(influencer.presentationPdf);

  return (
    <Modal open onClose={onClose} title={influencer.name} width="620px">
      <Hero>
        <CoverImage src={influencer.coverImage ?? influencer.profileImage} alt="" ratio="16 / 6" />
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

        {influencer.description && <p className="bio">{influencer.description}</p>}

        {networks.length > 0 && (
          <div>
            <h4>Redes sociais</h4>
            <div className="socials">
              {networks.map(([network, url]) => {
                const { Icon, label } = SOCIAL_META[network];
                return (
                  <a key={network} className="social" href={url} target="_blank" rel="noopener noreferrer">
                    <Icon size={18} /> {label}
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
