import { useEffect } from 'react';

import { positioning } from '../content/positioning';
import { assetUrl } from '../lib/api';
import { useSiteSettings } from './useSiteSettings';

const BASE_TITLE = 'PicPlus';
const DEFAULT_DESCRIPTION = positioning.metaDescription;

export interface PageMetaOptions {
  image?: string | null;
  /** 'blog' usa a imagem de compartilhamento do blog (se houver) antes da imagem padrão do site. */
  imageFallback?: 'blog';
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

function siteOrigin() {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  return (configured || 'https://picpluscompany.com.br').replace(/\/$/, '');
}

function setTag(selector: string, create: () => HTMLElement, content: string) {
  let tag = document.head.querySelector<HTMLElement>(selector);
  if (!tag) {
    tag = create();
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

const metaByName = (name: string, content: string) =>
  setTag(`meta[name="${name}"]`, () => Object.assign(document.createElement('meta'), { name }), content);

const metaByProperty = (property: string, content: string) =>
  setTag(
    `meta[property="${property}"]`,
    () => {
      const el = document.createElement('meta');
      el.setAttribute('property', property);
      return el;
    },
    content,
  );

/** Atualiza title, description, canonical, Open Graph, Twitter, robots e JSON-LD de cada página. */
export function usePageMeta(title?: string, description?: string, options: PageMetaOptions = {}) {
  const { image: ownImage, imageFallback, noindex, jsonLd } = options;
  const settings = useSiteSettings();
  const image =
    ownImage || (imageFallback === 'blog' ? settings?.blogOgImage : null) || settings?.ogImage || null;
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const fullTitle = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} | ${positioning.category}`;
    const desc = description ?? DEFAULT_DESCRIPTION;
    const origin = siteOrigin();
    const url = `${origin}${window.location.pathname}`;
    const imageUrl = assetUrl(image) ?? '';

    document.title = fullTitle;
    metaByName('description', desc);
    metaByName('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    metaByProperty('og:type', 'website');
    metaByProperty('og:site_name', BASE_TITLE);
    metaByProperty('og:locale', 'pt_BR');
    metaByProperty('og:title', fullTitle);
    metaByProperty('og:description', desc);
    metaByProperty('og:url', url);
    metaByName('twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    metaByName('twitter:title', fullTitle);
    metaByName('twitter:description', desc);
    if (imageUrl) {
      metaByProperty('og:image', imageUrl);
      metaByName('twitter:image', imageUrl);
    }

    const ldId = 'page-jsonld';
    document.getElementById(ldId)?.remove();
    if (jsonLdText) {
      const script = document.createElement('script');
      script.id = ldId;
      script.type = 'application/ld+json';
      script.textContent = jsonLdText;
      document.head.appendChild(script);
    }
    return () => document.getElementById(ldId)?.remove();
  }, [title, description, image, noindex, jsonLdText]);
}
