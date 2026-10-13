import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Footer } from './Footer';
import { Header } from './Header';
import { WhatsAppButton } from './WhatsAppButton';

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const MainContent = styled.main`
  flex: 1;
  outline: none;
`;

/**
 * Volta ao topo a cada troca de página. Com âncora na URL, rola até o elemento; como
 * seções da página inicial só aparecem depois que os dados chegam, tenta por alguns segundos.
 */
function ScrollToTop() {
  // `key` muda a cada clique, mesmo em um link para a URL em que a pessoa já está.
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let settle: number | undefined;
    const timer = window.setInterval(() => {
      const target = document.getElementById(id);
      if (target) {
        window.clearInterval(timer);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Imagens e seções acima podem terminar de carregar durante a rolagem e deslocar o alvo.
        settle = window.setTimeout(() => target.scrollIntoView({ behavior: 'instant', block: 'start' }), 900);
      } else if (++tries >= 20) {
        window.clearInterval(timer);
      }
    }, 150);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(settle);
    };
  }, [pathname, hash, key]);
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
      <WhatsAppButton />
    </LayoutContainer>
  );
}
