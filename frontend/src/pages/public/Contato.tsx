import styled from 'styled-components';
import { Mail, MapPin, Phone } from 'lucide-react';
import { ContactForm } from '../../components/public/ContactForm';
import { ButtonAnchor, ButtonLink } from '../../components/ui/Button';
import { Card, Container, Highlight, PageHero, Section, TwoColumns } from '../../components/ui/Layout';
import { InstagramIcon, LinkedInIcon, TikTokIcon, WhatsAppIcon, YouTubeIcon } from '../../components/ui/icons';
import { site } from '../../config/site';
import { usePageMeta } from '../../hooks/usePageMeta';

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  h2 {
    font-size: 1.8rem;
    font-weight: 800;
  }
  > p {
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-bottom: 0.5rem;
  }
`;

const InfoItem = styled(Card).attrs({ as: 'div' })`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.25rem;

  .icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
  }
  small {
    display: block;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
  a,
  span.value {
    font-weight: 700;
    word-break: break-word;
  }
`;

const FormCard = styled(Card)`
  padding: 2.25rem;

  h2 {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 1.4rem;
  }
`;

const Channels = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
  gap: 0.75rem;
`;

export function Contato() {
  usePageMeta('Fale Conosco', 'Entre em contato com a PicPlus. Responderemos o mais breve possível.');

  const socials = [
    { href: site.social.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: site.social.tiktok, label: 'TikTok', Icon: TikTokIcon },
    { href: site.social.youtube, label: 'YouTube', Icon: YouTubeIcon },
    { href: site.social.linkedin, label: 'LinkedIn', Icon: LinkedInIcon },
  ].filter((item) => item.href);

  return (
    <>
      <PageHero
        eyebrow="Contato"
        title={
          <>
            Vamos <Highlight>conversar</Highlight>?
          </>
        }
        description="Tem uma dúvida, sugestão ou quer conhecer melhor o nosso trabalho? Mande uma mensagem."
      />

      <Section $tight>
        <Container>
          <TwoColumns>
            <Info>
              <h2>Fale com a gente</h2>
              <p>Escolha o canal que preferir. Respondemos o mais rápido possível.</p>

              {site.email && (
                <InfoItem>
                  <span className="icon">
                    <Mail size={20} aria-hidden />
                  </span>
                  <div>
                    <small>E-mail</small>
                    <a href={`mailto:${site.email}`}>{site.email}</a>
                  </div>
                </InfoItem>
              )}
              {site.phone && (
                <InfoItem>
                  <span className="icon">
                    <Phone size={20} aria-hidden />
                  </span>
                  <div>
                    <small>Telefone</small>
                    <a href={`tel:${site.phone.replace(/\D/g, '')}`}>{site.phone}</a>
                  </div>
                </InfoItem>
              )}
              {site.address && (
                <InfoItem>
                  <span className="icon">
                    <MapPin size={20} aria-hidden />
                  </span>
                  <div>
                    <small>Endereço</small>
                    <span className="value">{site.address}</span>
                  </div>
                </InfoItem>
              )}

              {(site.whatsapp || socials.length > 0) && (
                <Channels>
                  {site.whatsapp && (
                    <ButtonAnchor href={site.whatsapp} target="_blank" rel="noopener noreferrer" $variant="secondary" $block>
                      <WhatsAppIcon size={18} aria-hidden /> WhatsApp
                    </ButtonAnchor>
                  )}
                  {socials.map(({ href, label, Icon }) => (
                    <ButtonAnchor key={label} href={href} target="_blank" rel="noopener noreferrer" $variant="secondary" $block>
                      <Icon size={18} aria-hidden /> {label}
                    </ButtonAnchor>
                  ))}
                </Channels>
              )}

              <p style={{ marginTop: '1rem' }}>
                Quer um valor para a sua campanha?{' '}
                <ButtonLink to="/orcamento" $variant="ghost" $size="sm">
                  Solicite um orçamento
                </ButtonLink>
              </p>
            </Info>

            <FormCard>
              <h2>Envie uma mensagem</h2>
              <ContactForm type="GENERAL" />
            </FormCard>
          </TwoColumns>
        </Container>
      </Section>
    </>
  );
}
