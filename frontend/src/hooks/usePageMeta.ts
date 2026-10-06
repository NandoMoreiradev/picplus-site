import { useEffect } from 'react';

import { positioning } from '../content/positioning';

const BASE_TITLE = 'PicPlus';
const DEFAULT_DESCRIPTION = positioning.metaDescription;

/** Atualiza <title> e <meta description> para cada página (SEO e abas do navegador). */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} | ${positioning.category}`;

    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = description ?? DEFAULT_DESCRIPTION;
  }, [title, description]);
}
