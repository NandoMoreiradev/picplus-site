import styled from 'styled-components';
import { Link } from 'react-router-dom';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: sticky;
  top: 0;
  z-index: 100;
`;

const Logo = styled(Link)`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  
  span {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 2rem;
  align-items: center;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none; /* We will add a mobile menu later */
  }
`;

const NavLink = styled(Link)`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const ContactButton = styled(Link)`
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.textDark};
  padding: 0.75rem 1.5rem;
  font-weight: 700;
  border-radius: 8px;

  &:hover {
    color: ${({ theme }) => theme.colors.textDark};
    background-color: ${({ theme }) => theme.colors.primaryHover};
  }
`;

export function Header() {
  return (
    <HeaderContainer>
      <Logo to="/">
        picplus<span>.</span>
      </Logo>
      
      <Nav>
        <NavLink to="/sobre">Sobre a Agência</NavLink>
        <NavLink to="/servicos">Serviços</NavLink>
        <NavLink to="/cases">Cases de Sucesso</NavLink>
        <NavLink to="/influenciadores">Nossos Parceiros</NavLink>
        <NavLink to="/blog">Blog</NavLink>
      </Nav>

      <ContactButton to="/contato">Fale Conosco</ContactButton>
    </HeaderContainer>
  );
}
