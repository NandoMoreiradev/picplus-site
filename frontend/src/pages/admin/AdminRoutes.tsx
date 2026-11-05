import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequirePermission } from '../../components/admin/RequirePermission';
import { PageLoader } from '../../components/ui/Feedback';
import { Account } from './Account';
import AcademyAdmin from './AcademyAdmin';
import { AdminLayout } from './AdminLayout';
import { ArticleEditor } from './ArticleEditor';
import { Articles } from './Articles';
import { Brands } from './Brands';
import { Cases } from './Cases';
import { Clients } from './Clients';
import { ClientDetail } from './ClientDetail';
import { Contacts } from './Contacts';
import { Dashboard } from './Dashboard';
import { EmailTemplates } from './EmailTemplates';
import { Influencers } from './Influencers';
import { Login } from './Login';
import { ForgotPassword, ResetPassword } from './PasswordRecovery';
import { Roles } from './Roles';
import { Settings } from './Settings';
import { Services } from './Services';
import { Team } from './Team';
import { Testimonials } from './Testimonials';
import { Users } from './Users';

// A gestão de tarefas traz calendário e editor de texto: só baixa quando alguém abre a tela.
const Tasks = lazy(() => import('./Tasks'));
const Inbox = lazy(() => import('./Inbox'));
const WhatsappSettings = lazy(() => import('./WhatsappSettings'));

/** Protege a tela com a permissão de "ver" do módulo (o servidor revalida cada chamada). */
const guard = (permission: string, page: ReactNode) => (
  <RequirePermission permission={permission}>{page}</RequirePermission>
);

/**
 * Todas as rotas do painel (relativas a /admin/*).
 * Carregado sob demanda: visitantes do site público não baixam o código do CMS.
 */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="esqueci-senha" element={<ForgotPassword />} />
      <Route path="redefinir-senha" element={<ResetPassword />} />
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={guard('clients.view', <Clients />)} />
        <Route path="clientes/:id" element={guard('clients.view', <ClientDetail />)} />
        <Route path="academy" element={guard('academy.view', <AcademyAdmin />)} />
        <Route path="templates-email" element={guard('email_templates.view', <EmailTemplates />)} />
        <Route path="influenciadores" element={guard('influencers.view', <Influencers />)} />
        <Route path="contatos" element={guard('contacts.view', <Contacts />)} />
        <Route path="blog" element={guard('articles.view', <Articles />)} />
        <Route path="blog/:id" element={guard('articles.view', <ArticleEditor />)} />
        <Route path="cases" element={guard('cases.view', <Cases />)} />
        <Route path="servicos" element={guard('services.view', <Services />)} />
        <Route path="marcas" element={guard('brands.view', <Brands />)} />
        <Route
          path="tarefas"
          element={guard(
            'tasks.view',
            <Suspense fallback={<PageLoader label="Carregando tarefas…" />}>
              <Tasks />
            </Suspense>,
          )}
        />
        <Route
          path="whatsapp"
          element={guard(
            'whatsapp.view',
            <Suspense fallback={<PageLoader label="Carregando WhatsApp…" />}>
              <Inbox />
            </Suspense>,
          )}
        />
        <Route
          path="whatsapp/configuracoes"
          element={guard(
            'whatsapp.manage',
            <Suspense fallback={<PageLoader label="Carregando configurações…" />}>
              <WhatsappSettings />
            </Suspense>,
          )}
        />
        <Route path="depoimentos" element={guard('testimonials.view', <Testimonials />)} />
        <Route path="equipe" element={guard('team.view', <Team />)} />
        <Route path="usuarios" element={guard('users.view', <Users />)} />
        <Route path="cargos" element={guard('roles.view', <Roles />)} />
        <Route path="configuracoes" element={guard('settings.view', <Settings />)} />
        <Route path="conta" element={<Account />} />
      </Route>
    </Routes>
  );
}
