import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { site } from '../../config/site';
import { InstagramIcon, YouTubeIcon } from '../ui/icons';
import { Logo } from './Logo';

const FooterContainer = styled.footer`
  margin-top: auto;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1.75rem 1.5rem 5rem; /* folga p/ o botão flutuante de WhatsApp */
`;

const Inner = styled.div`
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem 2rem;
  font-size: 0.82rem;
  color: #a1a1aa;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;

  .academy-tag {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Links = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.4rem;

  a {
    color: #a1a1aa;
    transition: color 0.2s;
  }
  a:hover {
    color: #fff;
  }
`;

const Copy = styled.div`
  width: 100%;
  font-size: 0.76rem;
  color: #71717a;
`;

export function AcademyFooter() {
  const instagram = site.social.instagram;
  const youtube = site.social.youtube;

  return (
    <FooterContainer>
      <Inner>
        <Brand>
          <Logo to="/academy" size="1.3rem" label="PicPlus Academy" />
          <span className="academy-tag">Academy</span>
        </Brand>

        <Links aria-label="Links da Academy">
          <Link to="/academy">Cursos</Link>
          <Link to="/academy/minha-area">Minha área</Link>
          <Link to="/contato">Suporte</Link>
          <Link to="/">Site PicPlus</Link>
          {instagram && (
            <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <InstagramIcon size={16} />
            </a>
          )}
          {youtube && (
            <a href={youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <YouTubeIcon size={16} />
            </a>
          )}
        </Links>

        <Copy>
          © {new Date().getFullYear()} PicPlus Company · CNPJ {site.cnpj}
        </Copy>
      </Inner>
    </FooterContainer>
  );
}
