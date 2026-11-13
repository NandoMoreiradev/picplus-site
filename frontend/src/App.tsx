import { lazy, Suspense, useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { AcademyLayout } from './components/layout/AcademyLayout';
import { PageLoader } from './components/ui/Feedback';
import { trackEvent } from './lib/analytics';

import { Blog } from './pages/public/Blog';
import { BlogPost } from './pages/public/BlogPost';
import { CadastroInfluenciador } from './pages/public/CadastroInfluenciador';
import { CaseDetail } from './pages/public/CaseDetail';
import { Cases } from './pages/public/Cases';
import { Contato } from './pages/public/Contato';
import { Home } from './pages/public/Home';
import { Influenciadores } from './pages/public/Influenciadores';
import { NotFound } from './pages/public/NotFound';
import { Orcamento } from './pages/public/Orcamento';
import { PicCast } from './pages/public/PicCast';
// import { Planos } from './pages/public/Planos'; // Página desativada por enquanto (ver rota abaixo).
import { Servicos } from './pages/public/Servicos';
import { Sobre } from './pages/public/Sobre';
import { AcademyAuth } from './pages/public/academy/AcademyAuth';
import { AcademyCatalog } from './pages/public/academy/AcademyCatalog';
import { AcademyCertificate } from './pages/public/academy/AcademyCertificate';
import { AcademyCheckoutPage } from './pages/public/academy/AcademyCheckoutPage';
import { AcademyCheckoutReturn } from './pages/public/academy/AcademyCheckoutReturn';
import { AcademyClassroom } from './pages/public/academy/AcademyClassroom';
import { AcademyCourseDetail } from './pages/public/academy/AcademyCourseDetail';
import { AcademyStudentDashboard } from './pages/public/academy/AcademyStudentDashboard';

// O painel (CMS) é um chunk separado, baixado só quando alguém acessa /admin.
const AdminRoutes = lazy(() => import('./pages/admin/AdminRoutes'));

function RouteAnalyticsTracker() {
  const { pathname, search } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const raf = requestAnimationFrame(() => {
      trackEvent('virtual_page_view', {
        page_location: window.location.href,
        page_title: document.title,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, search]);

  return null;
}

function App() {
  return (
    <>
      <RouteAnalyticsTracker />
      <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="sobre" element={<Sobre />} />
        <Route path="servicos" element={<Servicos />} />
        {/* Página de Planos desativada por enquanto: /planos cai no NotFound. Para reativar, descomente aqui, o import,
            o item no Header, o link no Footer e a rota em scripts/prerender-meta.mjs. */}
        {/* <Route path="planos" element={<Planos />} /> */}
        <Route path="cases" element={<Cases />} />
        <Route path="cases/:slug" element={<CaseDetail />} />
        <Route path="influenciadores" element={<Influenciadores />} />
        <Route path="cadastro-influenciador" element={<CadastroInfluenciador />} />
        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<BlogPost />} />
        <Route path="piccast" element={<PicCast />} />
        <Route path="contato" element={<Contato />} />
        <Route path="orcamento" element={<Orcamento />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="academy" element={<AcademyLayout />}>
        <Route index element={<AcademyCatalog />} />
        <Route path="curso/:slug" element={<AcademyCourseDetail />} />
        <Route path="entrar" element={<AcademyAuth />} />
        <Route path="cadastro" element={<AcademyAuth />} />
        <Route path="redefinir-senha" element={<AcademyAuth />} />
        <Route path="checkout/retorno" element={<AcademyCheckoutReturn />} />
        <Route path="checkout/:slug" element={<AcademyCheckoutPage />} />
        <Route path="minha-area" element={<AcademyStudentDashboard />} />
        <Route path="aula/:slug" element={<AcademyClassroom />} />
        <Route path="certificado/:code" element={<AcademyCertificate />} />
      </Route>

      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminRoutes />
          </Suspense>
        }
      />
    </Routes>
    </>
  );
}

export default App;
