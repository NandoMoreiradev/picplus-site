import styled from 'styled-components';
import { Link } from 'react-router-dom';

const FooterContainer = styled.footer`
  background-color: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 4rem 2rem;
  margin-top: auto;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
`;

const FooterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  
  span {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;
`;

const Title = styled.h4`
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const FooterLink = styled(Link)`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.95rem;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Copyright = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.875rem;
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

export function Footer() {
  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection>
          <Logo to="/">
            picplus<span>.</span>
          </Logo>
          <Description>
            Conectando marcas aos melhores influenciadores do mercado com resultados reais.
          </Description>
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
        </FooterSection>
      </FooterContent>

      <Copyright>
        © {new Date().getFullYear()} PicPlus Company. Todos os direitos reservados.
      </Copyright>
    </FooterContainer>
  );
}
