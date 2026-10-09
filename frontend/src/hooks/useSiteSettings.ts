import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { SiteSettings } from '../lib/types';

let cache: Promise<SiteSettings> | null = null;

/** Configurações públicas do site (imagens de compartilhamento), buscadas uma única vez. */
export function useSiteSettings(): SiteSettings | null {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  useEffect(() => {
    cache ??= api.get<SiteSettings>('/settings').catch(() => {
      cache = null;
      return { ogImage: null, blogOgImage: null };
    });
    let alive = true;
    void cache.then((value) => alive && setSettings(value));
    return () => {
      alive = false;
    };
  }, []);
  return settings;
}
