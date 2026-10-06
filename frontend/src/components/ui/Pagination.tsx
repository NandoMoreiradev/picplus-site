import styled from 'styled-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 2.5rem;
`;

const PageButton = styled.button<{ $active?: boolean }>`
  min-width: 40px;
  height: 40px;
  padding: 0 0.6rem;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.surface)};
  color: ${({ $active, theme }) => ($active ? theme.colors.textDark : theme.colors.text)};
  font-weight: 700;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  &:disabled {
    opacity: 0.4;
  }
`;

const Gap = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 0 0.2rem;
`;

/** Gera [1, '…', 4, 5, 6, '…', 20] mantendo no máximo ~7 itens. */
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | '…')[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('…');
    result.push(page);
  });
  return result;
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <Nav aria-label="Paginação">
      <PageButton type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Página anterior">
        <ChevronLeft size={18} />
      </PageButton>
      {pageList(page, totalPages).map((item, index) =>
        item === '…' ? (
          <Gap key={`gap-${index}`}>…</Gap>
        ) : (
          <PageButton
            key={item}
            type="button"
            $active={item === page}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onChange(item)}
          >
            {item}
          </PageButton>
        ),
      )}
      <PageButton
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
      >
        <ChevronRight size={18} />
      </PageButton>
    </Nav>
  );
}
