import { useEffect } from 'react';

const BASE_TITLE = 'PicPlus';
const DEFAULT_DESCRIPTION =
  'PicPlus: agência de marketing de influência. Conectamos marcas aos melhores criadores de conteúdo com estratégia, execução e resultados reais.';

/** Atualiza <title> e <meta description> para cada página (SEO e abas do navegador). */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} | Agência de Marketing de Influência`;

    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = description ?? DEFAULT_DESCRIPTION;
  }, [title, description]);
}
