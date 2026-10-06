import { useState } from 'react';
import type { FormEvent } from 'react';
import styled from 'styled-components';
import { CheckCircle2, Send } from 'lucide-react';
import { BUDGET_RANGES } from '../../config/site';
import { positioning } from '../../content/positioning';
import { api, ApiError } from '../../lib/api';
import { maskPhone } from '../../lib/format';
import type { ContactType } from '../../lib/types';
import type { Errors } from '../../lib/validation';
import { errorMessage, hasErrors, isEmail, isPhone } from '../../lib/validation';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { FormGrid, Honeypot, SelectField, TextArea, TextField } from '../ui/Form';

interface Values {
  name: string;
  email: string;
  phone: string;
  company: string;
  serviceInterest: string;
  budgetRange: string;
  message: string;
  website: string; // honeypot
}

const INITIAL: Values = {
  name: '',
  email: '',
  phone: '',
  company: '',
  serviceInterest: '',
  budgetRange: '',
  message: '',
  website: '',
};

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const Done = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.9rem;
  padding: 2rem 1rem;

  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
  h3 {
    font-size: 1.6rem;
    font-weight: 800;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    max-width: 420px;
  }
`;

/** Formulário único para "Fale Conosco" (GENERAL) e "Orçamento" (BUDGET). */
export function ContactForm({ type }: { type: ContactType }) {
  const isBudget = type === 'BUDGET';
  const [values, setValues] = useState<Values>(INITIAL);
  const [errors, setErrors] = useState<Errors<Values>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    if (errors[key]) setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const validate = (): Errors<Values> => {
    const next: Errors<Values> = {};
    if (values.name.trim().length < 2) next.name = 'Informe o seu nome.';
    if (!isEmail(values.email)) next.email = 'Informe um e-mail válido.';
    if (values.phone && !isPhone(values.phone)) next.phone = 'Informe um telefone válido, com DDD.';
    if (values.message.trim().length < 10) next.message = 'Conte um pouco mais (mínimo de 10 caracteres).';
    return next;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError('');
    const found = validate();
    setErrors(found);
    if (hasErrors(found)) return;

    const body: Record<string, string> = { type };
    (Object.entries(values) as [keyof Values, string][]).forEach(([key, value]) => {
      if (value.trim()) body[key] = value.trim();
    });

    setSubmitting(true);
    try {
      await api.post('/contacts', body);
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
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
      <Done role="status">
        <CheckCircle2 size={52} aria-hidden />
        <h3>{isBudget ? 'Pedido enviado!' : 'Mensagem enviada!'}</h3>
        <p>
          Obrigado, {values.name.split(' ')[0]}! Enviamos uma confirmação para <strong>{values.email}</strong>.{' '}
          {isBudget
            ? 'Nossa equipe analisará o seu pedido e retornará com uma proposta em breve.'
            : 'Responderemos o mais breve possível.'}
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setValues(INITIAL);
            setDone(false);
          }}
        >
          Enviar outra mensagem
        </Button>
      </Done>
    );
  }

  return (
    <Form onSubmit={onSubmit} noValidate>
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <FormGrid>
        <TextField
          label="Nome"
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
          label="Telefone / WhatsApp"
          type="tel"
          autoComplete="tel"
          placeholder="(11) 98888-7777"
          value={values.phone}
          onChange={(e) => set('phone', maskPhone(e.target.value))}
          error={errors.phone}
        />
        <TextField
          label="Empresa"
          autoComplete="organization"
          value={values.company}
          onChange={(e) => set('company', e.target.value)}
        />
      </FormGrid>

      {isBudget && (
        <FormGrid>
          <SelectField
            label="Serviço de interesse"
            placeholder="Selecione…"
            options={[
              'Hub completo (os 3 pilares)',
              ...positioning.pillars.map((pillar) => pillar.name),
              'Outro / ainda não sei',
            ]}
            value={values.serviceInterest}
            onChange={(e) => set('serviceInterest', e.target.value)}
          />
          <SelectField
            label="Investimento estimado"
            placeholder="Selecione…"
            options={BUDGET_RANGES}
            value={values.budgetRange}
            onChange={(e) => set('budgetRange', e.target.value)}
          />
        </FormGrid>
      )}

      <TextArea
        label={isBudget ? 'Conte sobre o seu projeto' : 'Mensagem'}
        required
        maxLength={4000}
        rows={6}
        placeholder={
          isBudget
            ? 'Qual é o momento do negócio, a meta de faturamento, o público e o prazo?'
            : 'Como podemos ajudar?'
        }
        value={values.message}
        onChange={(e) => set('message', e.target.value)}
        error={errors.message}
      />

      <Honeypot value={values.website} onChange={(e) => set('website', e.target.value)} />

      <Button type="submit" size="lg" loading={submitting} block>
        {!submitting && <Send size={18} aria-hidden />}
        {submitting ? 'Enviando…' : isBudget ? 'Solicitar orçamento' : 'Enviar mensagem'}
      </Button>
    </Form>
  );
}
