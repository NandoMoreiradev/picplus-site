import { useState } from 'react';

/**
 * Página atual de uma listagem. Volta para 1 automaticamente quando `resetKey`
 * (a combinação de filtros/busca) muda — sem precisar de efeito colateral.
 */
export function usePage(resetKey: string) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const page = state.key === resetKey ? state.page : 1;
  const setPage = (next: number) => setState({ key: resetKey, page: next });
  return [page, setPage] as const;
}
