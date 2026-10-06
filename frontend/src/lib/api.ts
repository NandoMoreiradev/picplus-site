// `||` (e não `??`): uma variável definida porém vazia também cai no padrão de desenvolvimento.
export const API_URL: string = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const API_BASE = `${API_URL}/api`;

const TOKEN_KEY = 'picplus_token';
export const AUTH_EXPIRED_EVENT = 'picplus:auth-expired';

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage indisponível (modo privado) */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* noop */
    }
  },
};

export class ApiError extends Error {
  status: number;
  /** Mensagens individuais de validação, quando a API devolve uma lista. */
  details: string[];

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

export function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; form?: FormData; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form; // o browser define o boundary do multipart
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method, headers, body, signal: options.signal });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.', 0);
  }

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);

  // Sucesso sem corpo JSON: o pedido não chegou à API (ex.: VITE_API_URL aponta para o próprio site,
  // que responde com o HTML da página). Falhar aqui evita erros confusos mais adiante.
  if (response.ok && data === null) {
    throw new ApiError(
      'Resposta inválida do servidor. Verifique se a variável VITE_API_URL aponta para o endereço da API.',
      response.status,
    );
  }

  if (!response.ok) {
    const raw = (data as { message?: string | string[] } | null)?.message;
    const details = Array.isArray(raw) ? raw : [];
    const message = Array.isArray(raw) ? raw[0] : (raw ?? 'Algo deu errado. Tente novamente.');

    // Token expirado/inválido numa rota autenticada → o AuthContext faz o logout.
    if (response.status === 401 && token && !path.startsWith('/auth/login')) {
      tokenStore.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(message, response.status, details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>('GET', withQuery(path, query), { signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  postForm: <T>(path: string, form: FormData) => request<T>('POST', path, { form }),
  /** Upload administrativo; devolve a URL relativa do arquivo salvo. */
  upload: async (file: File, kind: 'image' | 'pdf' = 'image') => {
    const form = new FormData();
    form.append('file', file);
    const { url } = await request<{ url: string }>('POST', `/admin/uploads?kind=${kind}`, { form });
    return url;
  },
};

/** Converte o caminho salvo no banco (/uploads/x.jpg) em URL absoluta. */
export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  return /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`;
}
