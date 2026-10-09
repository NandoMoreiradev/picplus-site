import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { PageLoader } from './components/ui/Feedback';

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
import { Servicos } from './pages/public/Servicos';
import { Sobre } from './pages/public/Sobre';

// O painel (CMS) é um chunk separado, baixado só quando alguém acessa /admin.
const AdminRoutes = lazy(() => import('./pages/admin/AdminRoutes'));

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="sobre" element={<Sobre />} />
        <Route path="servicos" element={<Servicos />} />
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

      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminRoutes />
          </Suspense>
        }
      />
    </Routes>
  );
}

export default App;
