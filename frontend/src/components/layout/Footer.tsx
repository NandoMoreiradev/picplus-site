import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Mail, MapPin, Phone } from 'lucide-react';
import { site } from '../../config/site';
import { InstagramIcon, LinkedInIcon, TikTokIcon, WhatsAppIcon, YouTubeIcon } from '../ui/icons';
import { Logo } from './Logo';

const FooterContainer = styled.footer`
  background-color: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 4rem 1.5rem 5.5rem; /* folga inferior: o botão flutuante de WhatsApp não cobre a última linha */
  margin-top: auto;
`;

const FooterContent = styled.div`
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr repeat(3, 1fr);
  gap: 2.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const FooterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;
  max-width: 320px;
`;

const Title = styled.h4`
  font-size: 1rem;
  font-weight: 800;
  margin-bottom: 0.35rem;
`;

const FooterLink = styled(Link)`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.95rem;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ContactItem = styled.a`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.95rem;

  svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ContactText = styled.span`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.95rem;

  svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Socials = styled.div`
  display: flex;
  gap: 0.6rem;
  margin-top: 0.5rem;
`;

const SocialLink = styled.a`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.textDark};
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
  }
`;

const Copyright = styled.div`
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 3.5rem auto 0;
  padding-top: 1.75rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
`;

const FooterMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.5rem;

  a {
    text-decoration: underline;
    text-decoration-color: ${({ theme }) => theme.colors.borderStrong};
    text-underline-offset: 3px;
  }
  a:hover {
    text-decoration-color: ${({ theme }) => theme.colors.primary};
  }
`;

export function Footer() {
  const socials = [
    { href: site.social.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: site.social.tiktok, label: 'TikTok', Icon: TikTokIcon },
    { href: site.social.youtube, label: 'YouTube', Icon: YouTubeIcon },
    { href: site.social.linkedin, label: 'LinkedIn', Icon: LinkedInIcon },
    { href: site.whatsapp, label: 'WhatsApp', Icon: WhatsAppIcon },
  ].filter((item) => item.href);

  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection>
          <Logo size="1.6rem" />
          <Description>{site.tagline}</Description>
          {socials.length > 0 && (
            <Socials>
              {socials.map(({ href, label, Icon }) => (
                <SocialLink key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon size={18} />
                </SocialLink>
              ))}
            </Socials>
          )}
        </FooterSection>

        <FooterSection>
          <Title>Links Rápidos</Title>
          <FooterLink to="/sobre">Sobre a Agência</FooterLink>
          <FooterLink to="/servicos">Nossos Serviços</FooterLink>
          <FooterLink to="/cases">Cases de Sucesso</FooterLink>
          <FooterLink to="/blog">Blog</FooterLink>
        </FooterSection>

        <FooterSection>
          <Title>Seja um Parceiro</Title>
          <FooterLink to="/influenciadores">Vitrine de Influenciadores</FooterLink>
          <FooterLink to="/cadastro-influenciador">Cadastre-se como Influenciador</FooterLink>
        </FooterSection>

        <FooterSection>
          <Title>Contato</Title>
          <FooterLink to="/contato">Fale Conosco</FooterLink>
          <FooterLink to="/orcamento">Solicite um Orçamento</FooterLink>
          {site.email && (
            <ContactItem href={`mailto:${site.email}`}>
              <Mail size={16} /> {site.email}
            </ContactItem>
          )}
          {site.phone && (
            <ContactItem href={`tel:${site.phone.replace(/\D/g, '')}`}>
              <Phone size={16} /> {site.phone}
            </ContactItem>
          )}
          {site.address && (
            <ContactText>
              <MapPin size={16} /> {site.address}
            </ContactText>
          )}
        </FooterSection>
      </FooterContent>

      <Copyright>
        <span>
          © {new Date().getFullYear()} PicPlus Company · CNPJ {site.cnpj}. Todos os direitos reservados.
        </span>
        <FooterMeta>
          <span>
            Desenvolvido por{' '}
            <a
              href="https://instagram.com/eu_nando_moreira"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fernando Moreira, desenvolvedor do site (Instagram, abre em nova aba)"
            >
              Fernando Moreira
            </a>
          </span>
          <Link to="/admin">Área restrita</Link>
        </FooterMeta>
      </Copyright>
    </FooterContainer>
  );
}
