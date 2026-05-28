import styled from 'styled-components';

const Container = styled.div`
  padding: 4rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
`;

export function Influenciadores() {
  return (
    <Container>
      <Title>Nossos Parceiros</Title>
      <p>Vitrine de influenciadores...</p>
    </Container>
  );
}
