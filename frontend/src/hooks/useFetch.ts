import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';

type Query = Record<string, string | number | boolean | undefined | null>;

interface Result<T> {
  /** Identifica a requisição a que este resultado pertence. */
  key: string;
  data: T | null;
  error: ApiError | null;
}

/**
 * GET com estado de carregamento/erro e cancelamento automático.
 *
 * - `path = null` adia a requisição.
 * - `query` é comparado por valor (JSON), então não precisa ser memoizado.
 * - `refreshKey` força nova busca quando muda (ex.: pathname).
 * - Durante recargas os dados anteriores são mantidos, evitando "piscar" a tela.
 */
export function useFetch<T>(path: string | null, query?: Query, refreshKey?: unknown) {
  const queryKey = JSON.stringify(query ?? {});
  const [version, setVersion] = useState(0);
  const requestKey = `${path}|${queryKey}|${String(refreshKey)}|${version}`;
  const [result, setResult] = useState<Result<T>>({ key: '', data: null, error: null });

  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();

    api
      .get<T>(path, JSON.parse(queryKey) as Query, controller.signal)
      .then((data) => setResult({ key: requestKey, data, error: null }))
      .catch((error: unknown) => {
        if ((error as Error).name === 'AbortError') return;
        setResult((previous) => ({
          key: requestKey,
          data: previous.data,
          error: error instanceof ApiError ? error : new ApiError('Erro inesperado.', 0),
        }));
      });

    return () => controller.abort();
  }, [path, queryKey, requestKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const settled = result.key === requestKey;

  return {
    data: result.data,
    loading: path !== null && !settled,
    error: settled ? result.error : null,
    reload,
  };
}
