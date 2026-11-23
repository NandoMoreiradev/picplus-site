import { PageHeader } from '../../components/admin/AdminUI';
import { LandingPageStudio } from '../../components/landing-pages/LandingPageStudio';
import { useAuth } from '../../context/auth-context';

export default function LandingPages() {
  const { can } = useAuth();
  const canManage = can('ai_studio.manage');

  return (
    <>
      <PageHeader
        title="Landing Pages com IA"
        description="Gere páginas de alta conversão com o Gemini, conecte domínios personalizados ou exporte para hospedar onde preferir."
      />
      <LandingPageStudio canManage={canManage} />
    </>
  );
}
