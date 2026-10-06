import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { CheckCircle2, Clock, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { FilePicker } from '../../components/ui/FilePicker';
import {
  CheckboxField,
  FormGrid,
  FormSection,
  Honeypot,
  SelectField,
  TextArea,
  TextField,
} from '../../components/ui/Form';
import { Card, Container, Highlight, PageHero, Section } from '../../components/ui/Layout';
import { NICHES } from '../../config/site';
import { usePageMeta } from '../../hooks/usePageMeta';
import { api, ApiError } from '../../lib/api';
import { maskPhone } from '../../lib/format';
import type { Errors } from '../../lib/validation';
import { errorMessage, hasErrors, isEmail, isPhone } from '../../lib/validation';

interface FormValues {
  name: string;
  email: string;
  whatsapp: string;
  location: string;
  niche: string;
  description: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  twitter: string;
  twitch: string;
  website: string; // honeypot
  acceptTerms: boolean;
}

const INITIAL: FormValues = {
  name: '',
  email: '',
  whatsapp: '',
  location: '',
  niche: '',
  description: '',
  instagram: '',
  tiktok: '',
  youtube: '',
  twitter: '',
  twitch: '',
  website: '',
  acceptTerms: false,
};

const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram', placeholder: '@seuperfil' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@seuperfil' },
  { key: 'youtube', label: 'YouTube', placeholder: '@seucanal ou link do canal' },
  { key: 'twitter', label: 'X (Twitter)', placeholder: '@seuperfil' },
  { key: 'twitch', label: 'Twitch', placeholder: 'seucanal' },
] as const;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 2.5rem;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

const FormCard = styled(Card)`
  padding: 2.25rem;

  form {
    display: flex;
    flex-direction: column;
    gap: 2.25rem;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 1.4rem;
  }
`;

const Aside = styled.aside`
  position: sticky;
  top: calc(${({ theme }) => theme.layout.headerHeight} + 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    position: static;
    order: -1;
  }
`;

const Benefit = styled(Card)`
  display: flex;
  gap: 1rem;
  padding: 1.25rem;

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.primary};
    margin-top: 2px;
  }
  strong {
    display: block;
    margin-bottom: 0.2rem;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.9rem;
  }
`;

const Success = styled(Card)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  max-width: 640px;
  margin: 0 auto;
  padding: 3.5rem 2rem;

  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
  h2 {
    font-size: 2rem;
    font-weight: 800;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    max-width: 460px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1rem;
  }
`;

const TermsLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: underline;
`;

export function CadastroInfluenciador() {
  usePageMeta(
    'Cadastro de Influenciadores',
    'Cadastre o seu perfil na vitrine de parceiros da PicPlus e seja apresentado às marcas que atendemos.',
  );

  const [values, setValues] = useState<FormValues>(INITIAL);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [presentationPdf, setPresentationPdf] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors<FormValues & { profileImage: string; social: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    if (errors[key]) setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const validate = () => {
    const next: typeof errors = {};
    if (values.name.trim().length < 2) next.name = 'Informe o seu nome completo.';
    if (!isEmail(values.email)) next.email = 'Informe um e-mail válido.';
    if (!isPhone(values.whatsapp)) next.whatsapp = 'Informe um WhatsApp válido, com DDD.';
    if (!values.niche) next.niche = 'Escolha o seu nicho principal.';
    if (!SOCIAL_FIELDS.some(({ key }) => values[key].trim())) {
      next.social = 'Informe ao menos uma rede social.';
    }
    if (!profileImage) next.profileImage = 'Envie uma foto de perfil.';
    if (!values.acceptTerms) next.acceptTerms = 'Você precisa aceitar para continuar.';
    return next;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError('');
    const found = validate();
    setErrors(found);
    if (hasErrors(found)) {
      // Leva o foco ao primeiro campo com erro.
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        }),
      );
      return;
    }

    const form = new FormData();
    (Object.entries(values) as [keyof FormValues, string | boolean][]).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim()) form.append(key, value.trim());
    });
    form.append('acceptTerms', String(values.acceptTerms));
    if (profileImage) form.append('profileImage', profileImage);
    if (coverImage) form.append('coverImage', coverImage);
    if (presentationPdf) form.append('presentationPdf', presentationPdf);

    setSubmitting(true);
    try {
      await api.postForm('/influencers/register', form);
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrors({ email: 'Já existe um cadastro com este e-mail.' });
      } else if (error instanceof ApiError && error.status === 429) {
        setServerError('Muitas tentativas em pouco tempo. Aguarde um pouco e tente novamente.');
      } else {
        const details = error instanceof ApiError && error.details.length ? error.details.join(' • ') : '';
        setServerError(details || errorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <>
        <PageHero eyebrow="Cadastro de influenciadores" title="Cadastro enviado!" />
        <Section>
          <Container>
            <Success>
              <CheckCircle2 size={56} aria-hidden />
              <h2>Obrigado, {values.name.split(' ')[0]}!</h2>
              <p>
                Recebemos o seu cadastro e enviamos uma confirmação para <strong>{values.email}</strong>. Nossa equipe
                vai analisar o seu perfil e retornar por e-mail com o resultado da avaliação.
              </p>
              <div className="actions">
                <ButtonLink to="/influenciadores">Ver a vitrine</ButtonLink>
                <ButtonLink to="/" $variant="secondary">
                  Voltar ao início
                </ButtonLink>
              </div>
            </Success>
          </Container>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Cadastro de influenciadores"
        title={
          <>
            Faça parte da <Highlight>vitrine PicPlus</Highlight>
          </>
        }
        description="Preencha o formulário e nossa equipe fará a curadoria do seu perfil. Os aprovados ganham visibilidade junto às marcas que atendemos."
      />

      <Section $tight>
        <Container>
          <Layout>
            <FormCard>
              <form onSubmit={onSubmit} noValidate>
                {serverError && <Alert tone="danger">{serverError}</Alert>}

                <FormSection>
                  <legend>1. Seus dados</legend>
                  <FormGrid>
                    <TextField
                      label="Nome completo"
                      required
                      autoComplete="name"
                      value={values.name}
                      onChange={(e) => set('name', e.target.value)}
                      error={errors.name}
                    />
                    <TextField
                      label="E-mail"
                      type="email"
                      required
                      autoComplete="email"
                      value={values.email}
                      onChange={(e) => set('email', e.target.value)}
                      error={errors.email}
                    />
                    <TextField
                      label="WhatsApp"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder="(11) 98888-7777"
                      value={values.whatsapp}
                      onChange={(e) => set('whatsapp', maskPhone(e.target.value))}
                      error={errors.whatsapp}
                      hint="Usado apenas pela equipe PicPlus."
                    />
                    <TextField
                      label="Cidade / UF"
                      autoComplete="address-level2"
                      placeholder="São Paulo, SP"
                      value={values.location}
                      onChange={(e) => set('location', e.target.value)}
                    />
                  </FormGrid>
                </FormSection>

                <FormSection>
                  <legend>2. Seu perfil</legend>
                  <SelectField
                    label="Nicho principal"
                    required
                    placeholder="Selecione…"
                    options={NICHES}
                    value={values.niche}
                    onChange={(e) => set('niche', e.target.value)}
                    error={errors.niche}
                  />
                  <TextArea
                    label="Sobre você"
                    maxLength={1200}
                    placeholder="Conte um pouco sobre o seu conteúdo, o seu público e o que te diferencia."
                    value={values.description}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </FormSection>

                <FormSection>
                  <legend>3. Redes sociais</legend>
                  <p className="legend-hint">Informe o @ ou o link. Preencha ao menos uma.</p>
                  <FormGrid>
                    {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                      <TextField
                        key={key}
                        label={label}
                        placeholder={placeholder}
                        autoCapitalize="none"
                        value={values[key]}
                        onChange={(e) => set(key, e.target.value)}
                      />
                    ))}
                  </FormGrid>
                  {errors.social && <Alert tone="danger">{errors.social}</Alert>}
                </FormSection>

                <FormSection>
                  <legend>4. Imagens e material</legend>
                  <FormGrid>
                    <FilePicker
                      label="Foto de perfil"
                      kind="image"
                      shape="square"
                      required
                      value={profileImage}
                      onChange={(file) => {
                        setProfileImage(file);
                        setErrors((p) => ({ ...p, profileImage: undefined }));
                      }}
                      error={errors.profileImage}
                      hint="Preferencialmente quadrada."
                    />
                    <FilePicker
                      label="Imagem de capa"
                      kind="image"
                      value={coverImage}
                      onChange={setCoverImage}
                      hint="Formato horizontal (ex.: 1600×600)."
                    />
                  </FormGrid>
                  <FilePicker
                    label="Apresentação / mídia kit (PDF)"
                    kind="pdf"
                    value={presentationPdf}
                    onChange={setPresentationPdf}
                    hint="Métricas, cases e valores, se desejar compartilhar."
                  />
                </FormSection>

                <Honeypot value={values.website} onChange={(e) => set('website', e.target.value)} />

                <CheckboxField
                  checked={values.acceptTerms}
                  onChange={(e) => set('acceptTerms', e.target.checked)}
                  error={errors.acceptTerms}
                >
                  Declaro que as informações são verdadeiras e autorizo a PicPlus a utilizar meu perfil, imagens e
                  materiais enviados na vitrine de parceiros e em contatos com marcas. Posso solicitar a remoção a
                  qualquer momento pelo <TermsLink to="/contato">Fale Conosco</TermsLink>.
                </CheckboxField>

                <Button type="submit" size="lg" loading={submitting} block>
                  {!submitting && <Send size={18} aria-hidden />}
                  {submitting ? 'Enviando…' : 'Enviar cadastro'}
                </Button>
              </form>
            </FormCard>

            <Aside>
              <Benefit>
                <Sparkles size={22} aria-hidden />
                <div>
                  <strong>Visibilidade com as marcas</strong>
                  <p>Perfis aprovados podem ser exibidos na vitrine pública da agência.</p>
                </div>
              </Benefit>
              <Benefit>
                <Clock size={22} aria-hidden />
                <div>
                  <strong>Curadoria da equipe</strong>
                  <p>Analisamos cada cadastro e respondemos por e-mail com o resultado.</p>
                </div>
              </Benefit>
              <Benefit>
                <ShieldCheck size={22} aria-hidden />
                <div>
                  <strong>Seus dados protegidos</strong>
                  <p>E-mail e WhatsApp nunca são exibidos publicamente.</p>
                </div>
              </Benefit>
            </Aside>
          </Layout>
        </Container>
      </Section>
    </>
  );
}
