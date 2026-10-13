import { useCallback, useState } from 'react';

/**
 * Estado que sobrevive a recarregar a página (localStorage). Preferências de tela, nunca
 * dados: se o armazenamento estiver indisponível (modo privado) ou o valor salvo for
 * inválido, usa o padrão.
 */
export function usePersistentState<T>(key: string, initial: T, isValid: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* armazenamento indisponível */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update] as const;
}
