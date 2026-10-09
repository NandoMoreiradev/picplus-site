import { useState } from 'react';
import type { FormEvent } from 'react';
import { FormStack, PageHeader, Panel } from '../../components/admin/AdminUI';
import { UploadField } from '../../components/admin/UploadField';
import { Button } from '../../components/ui/Button';
import { ErrorState, PageLoader } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import type { SiteSettings } from '../../lib/types';
import { errorMessage } from '../../lib/validation';

function SettingsForm({ initial }: { initial: SiteSettings }) {
  const toast = useToast();
  const { can } = useAuth();
  const [ogImage, setOgImage] = useState(initial.ogImage);
  const [blogOgImage, setBlogOgImage] = useState(initial.blogOgImage);
  const [busy, setBusy] = useState(false);
  const canEdit = can('settings.edit');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.patch('/admin/settings', { ogImage: ogImage ?? '', blogOgImage: blogOgImage ?? '' });
      toast.success('Configurações salvas. Rode um novo deploy para atualizar as páginas pré-geradas.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel style={{ maxWidth: 640, padding: '1.75rem' }}>
      <FormStack onSubmit={submit}>
        <UploadField
          label="Imagem de compartilhamento do site"
          value={ogImage}
          onChange={setOgImage}
          hint="Aparece no preview de links (WhatsApp, LinkedIn, Instagram). Use 1200 x 630 px. Também é usada por qualquer página ou artigo sem imagem própria."
        />
        <UploadField
          label="Imagem de compartilhamento do blog"
          value={blogOgImage}
          onChange={setBlogOgImage}
          hint="Preview da página de listagem do blog. Se vazia, usa a imagem do site. Cada artigo usa a própria capa."
        />
        {canEdit && (
          <div>
            <Button type="submit" loading={busy}>
              Salvar
            </Button>
          </div>
        )}
      </FormStack>
    </Panel>
  );
}

export function Settings() {
  const { data, error, reload } = useFetch<SiteSettings>('/admin/settings');
  return (
    <>
      <PageHeader title="Configurações do site" description="Imagens exibidas quando um link do site é compartilhado." />
      {error && !data ? <ErrorState message={error.message} onRetry={reload} /> : !data ? <PageLoader /> : <SettingsForm initial={data} />}
    </>
  );
}
