import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { ButtonLink } from '../ui/Button';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.9rem;
  padding: 5rem 1.5rem;

  svg {
    color: ${({ theme }) => theme.colors.textMuted};
  }
  h1 {
    font-size: 1.6rem;
    font-weight: 800;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    max-width: 440px;
  }
`;

export function NoAccess() {
  return (
    <Wrap role="alert">
      <Lock size={44} aria-hidden />
      <h1>Você não tem acesso a esta área</h1>
      <p>
        O seu cargo não inclui a permissão necessária. Se precisar dela, peça a um administrador para ajustar o seu
        cargo.
      </p>
      <ButtonLink to="/admin" $variant="secondary">
        Voltar à visão geral
      </ButtonLink>
    </Wrap>
  );
}

/**
 * Protege uma rota do painel. Isto é conveniência de interface: quem manda é o servidor,
 * que recusa (403) qualquer chamada sem a permissão, mesmo que a tela seja aberta.
 */
export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : <NoAccess />;
}
