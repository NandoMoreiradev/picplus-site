import { useCallback, useState } from 'react';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { errorMessage } from '../lib/validation';
import { useFetch } from './useFetch';

/**
 * Operações padrão (listar, salvar, excluir) de um recurso administrativo.
 * `path` é a coleção, ex.: "/admin/services". Exibe toasts de sucesso/erro.
 */
export function useCrud<T extends { id: string }>(path: string, labels: { saved: string; removed: string }) {
  const toast = useToast();
  const list = useFetch<T[]>(path);
  const [saving, setSaving] = useState(false);
  const { reload } = list;

  /** Cria (id nulo) ou atualiza. Devolve true em caso de sucesso. */
  const save = useCallback(
    async (id: string | null, body: Record<string, unknown>) => {
      setSaving(true);
      try {
        if (id) await api.patch(`${path}/${id}`, body);
        else await api.post(path, body);
        toast.success(labels.saved);
        reload();
        return true;
      } catch (error) {
        toast.error(errorMessage(error));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [path, reload, toast, labels.saved],
  );

  const remove = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        await api.delete(`${path}/${id}`);
        toast.success(labels.removed);
        reload();
        return true;
      } catch (error) {
        toast.error(errorMessage(error));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [path, reload, toast, labels.removed],
  );

  return { list, saving, save, remove };
}
