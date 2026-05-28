import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  padding: 2rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 1rem;
  
  span {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Subtitle = styled.p`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 600px;
  margin-bottom: 2rem;
`;

const Button = styled.button`
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.textDark};
  padding: 1rem 2rem;
  font-size: 1.125rem;
  font-weight: 700;
  border-radius: 8px;
  transition: all ${({ theme }) => theme.transitions.default};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryHover};
    transform: translateY(-2px);
  }
`;

export function Home() {
  return (
    <Container>
      <Title>
        picplus<span>.</span>
      </Title>
      <Subtitle>
        Conectando marcas aos melhores influenciadores do mercado com resultados reais.
      </Subtitle>
      <Button>Conheça nossos serviços</Button>
    </Container>
  );
}
