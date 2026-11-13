export type SiteArea = 'institucional' | 'academy' | 'curso_lp' | 'admin';

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  index?: number;
}

export interface EcommercePayload {
  currency?: string;
  value?: number;
  coupon?: string;
  transaction_id?: string;
  items: AnalyticsItem[];
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function getSiteArea(pathname: string): SiteArea {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname === '/academy/curso/dominando-inteligencia-artificial-para-videos') {
    return 'curso_lp';
  }
  if (pathname.startsWith('/academy')) return 'academy';
  return 'institucional';
}

function isTrackableContext(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.location.pathname.startsWith('/admin');
}

function pushToDataLayer(payload: Record<string, unknown>): void {
  if (!isTrackableContext()) return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  } catch {
    /* noop */
  }
}

/** Dispara um evento customizado para o Google Tag Manager (`window.dataLayer`). */
export function trackEvent(
  eventName: string,
  params: Record<string, unknown> = {},
): void {
  if (!isTrackableContext()) return;
  const pathname = window.location.pathname;
  pushToDataLayer({
    event: eventName,
    site_area: getSiteArea(pathname),
    page_path: pathname,
    ...params,
  });
}

/** Dispara um evento padrão de E-commerce GA4 limpando o objeto `ecommerce` anterior. */
export function trackEcommerceEvent(
  eventName:
    | 'view_item'
    | 'select_item'
    | 'begin_checkout'
    | 'add_payment_info'
    | 'purchase',
  ecommerce: EcommercePayload,
  extraParams: Record<string, unknown> = {},
): void {
  if (!isTrackableContext()) return;
  const pathname = window.location.pathname;
  pushToDataLayer({ ecommerce: null });
  pushToDataLayer({
    event: eventName,
    site_area: getSiteArea(pathname),
    page_path: pathname,
    ecommerce: {
      currency: 'BRL',
      ...ecommerce,
    },
    ...extraParams,
  });
}

export function centsToReais(cents: number | null | undefined): number {
  return Number((((cents ?? 0) as number) / 100).toFixed(2));
}

export function courseToAnalyticsItem(
  course: {
    id: string;
    title: string;
    slug: string;
    category?: string | null;
    priceCents?: number;
  },
  overridePriceCents?: number,
  index?: number,
): AnalyticsItem {
  const item: AnalyticsItem = {
    item_id: course.id,
    item_name: course.title,
    item_category: course.category || 'PicPlus Academy',
    item_variant: course.slug,
    price: centsToReais(overridePriceCents ?? course.priceCents),
    quantity: 1,
  };
  if (typeof index === 'number') {
    item.index = index;
  }
  return item;
}

const PURCHASE_KEY_PREFIX = 'picplus_tracked_purchase_';

export function hasTrackedPurchase(orderId: string): boolean {
  if (!orderId || typeof window === 'undefined') return false;
  const key = `${PURCHASE_KEY_PREFIX}${orderId}`;
  try {
    return Boolean(localStorage.getItem(key) || sessionStorage.getItem(key));
  } catch {
    return false;
  }
}

export function markPurchaseTracked(orderId: string): void {
  if (!orderId || typeof window === 'undefined') return;
  const key = `${PURCHASE_KEY_PREFIX}${orderId}`;
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* noop */
  }
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* noop */
  }
}
