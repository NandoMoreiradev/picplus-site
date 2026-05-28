import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';

// Pages
import { Home } from './pages/public/Home';
import { Sobre } from './pages/public/Sobre';
import { Servicos } from './pages/public/Servicos';
import { Cases } from './pages/public/Cases';
import { Influenciadores } from './pages/public/Influenciadores';
import { Blog } from './pages/public/Blog';
import { Contato } from './pages/public/Contato';

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="sobre" element={<Sobre />} />
        <Route path="servicos" element={<Servicos />} />
        <Route path="cases" element={<Cases />} />
        <Route path="influenciadores" element={<Influenciadores />} />
        <Route path="blog" element={<Blog />} />
        <Route path="contato" element={<Contato />} />
      </Route>
      {/* Admin routes will be added later */}
    </Routes>
  );
}

export default App;
