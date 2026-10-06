import { Route, Routes } from 'react-router-dom';
import { Account } from './Account';
import { AdminLayout } from './AdminLayout';
import { ArticleEditor } from './ArticleEditor';
import { Articles } from './Articles';
import { Brands } from './Brands';
import { Cases } from './Cases';
import { Contacts } from './Contacts';
import { Dashboard } from './Dashboard';
import { Influencers } from './Influencers';
import { Login } from './Login';
import { Services } from './Services';
import { Team } from './Team';

/**
 * Todas as rotas do painel (relativas a /admin/*).
 * Carregado sob demanda: visitantes do site público não baixam o código do CMS.
 */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="influenciadores" element={<Influencers />} />
        <Route path="contatos" element={<Contacts />} />
        <Route path="blog" element={<Articles />} />
        <Route path="blog/:id" element={<ArticleEditor />} />
        <Route path="cases" element={<Cases />} />
        <Route path="servicos" element={<Services />} />
        <Route path="marcas" element={<Brands />} />
        <Route path="equipe" element={<Team />} />
        <Route path="conta" element={<Account />} />
      </Route>
    </Routes>
  );
}
