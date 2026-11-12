import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { AcademyHeader } from './AcademyHeader';
import { Footer } from './Footer';
import { WhatsAppButton } from './WhatsAppButton';

const LayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  flex: 1;
`;

function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [pathname, hash, key]);
  return null;
}

export function AcademyLayout() {
  return (
    <LayoutContainer>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <ScrollToTop />
      <AcademyHeader />
      <MainContent id="conteudo" tabIndex={-1}>
        <Outlet />
      </MainContent>
      <Footer />
      <WhatsAppButton />
    </LayoutContainer>
  );
}
