import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Footer } from './Footer';
import { Header } from './Header';

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const MainContent = styled.main`
  flex: 1;
  outline: none;
`;

/** Volta ao topo a cada troca de página (exceto quando há âncora na URL). */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

export function PublicLayout() {
  return (
    <LayoutContainer>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <ScrollToTop />
      <Header />
      <MainContent id="conteudo" tabIndex={-1}>
        <Outlet />
      </MainContent>
      <Footer />
    </LayoutContainer>
  );
}
