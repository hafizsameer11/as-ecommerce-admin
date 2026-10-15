export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  requestId?: string;

  constructor(status: number, body: ApiErrorBody | null, fallback = "Request failed") {
    const message = body?.error?.message ?? fallback;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.error?.code ?? "UNKNOWN";
    this.details = body?.error?.details;
    this.requestId = body?.error?.requestId;
  }
}

const DEFAULT_BASE = "http://localhost:4000";
const TOKEN_KEY = "asl-admin-tokens";

export type TokenPair = { accessToken: string; refreshToken: string };

export function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || DEFAULT_BASE;
}

export function loadTokens(): TokenPair | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TokenPair;
    if (!parsed?.accessToken || !parsed?.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: TokenPair | null) {
  if (typeof window === "undefined") return;
  if (!tokens) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  rawBody?: BodyInit | null;
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Skip Authorization (login / public) */
  skipAuth?: boolean;
  /** Internal: skip 401 refresh retry */
  _authRetry?: boolean;
};

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let refreshInFlight: Promise<TokenPair | null> | null = null;

export function setApiUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isAuthPath(path: string) {
  return (
    path.startsWith("/admin/auth/login") ||
    path.startsWith("/admin/auth/refresh") ||
    path.startsWith("/admin/auth/logout") ||
    path.startsWith("/admin/auth/bootstrap") ||
    path.startsWith("/admin/auth/invite/accept")
  );
}

async function refreshAdminSession(): Promise<TokenPair | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const current = loadTokens();
    try {
      const url = `${apiBaseUrl()}/api/v1/admin/auth/refresh`;
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current?.refreshToken ? { refreshToken: current.refreshToken } : {}),
      });
      if (!res.ok) {
        saveTokens(null);
        return null;
      }
      const json = parseJson(await res.text());
      const data =
        json && typeof json === "object" && json !== null && "data" in json
          ? (json as { data: TokenPair }).data
          : (json as TokenPair);
      if (!data?.accessToken || !data?.refreshToken) {
        saveTokens(null);
        return null;
      }
      saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data;
    } catch {
      saveTokens(null);
      return null;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function authErrorCode(json: unknown): string {
  return (json as ApiErrorBody | null)?.error?.code ?? "";
}

function shouldRefresh(status: number, code: string, path: string, authRetry?: boolean) {
  if (authRetry || status !== 401 || isAuthPath(path)) return false;
  return (
    code === "TOKEN_INVALID" ||
    code === "UNAUTHENTICATED" ||
    code === "UNAUTHORIZED" ||
    code === "AUTH_REQUIRED"
  );
}

async function fetchApi(
  path: string,
  opts: ApiRequestOptions,
): Promise<{ res: Response; text: string; json: unknown }> {
  const url = `${apiBaseUrl()}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };

  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  if (!opts.skipAuth) {
    const tokens = loadTokens();
    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  let body: BodyInit | undefined;
  if (opts.rawBody !== undefined) {
    body = opts.rawBody ?? undefined;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body = JSON.stringify(opts.body);
  }

  const init: RequestInit = {
    method: opts.method ?? (opts.body !== undefined || opts.rawBody !== undefined ? "POST" : "GET"),
    headers,
    body,
    credentials: "include",
    signal: opts.signal,
  };

  let res = await fetch(url, init);
  let text = await res.text();
  let json = parseJson(text);

  if (shouldRefresh(res.status, authErrorCode(json), path, opts._authRetry)) {
    const refreshed = await refreshAdminSession();
    if (refreshed?.accessToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${refreshed.accessToken}` };
      res = await fetch(url, { ...init, headers: retryHeaders });
      text = await res.text();
      json = parseJson(text);
    } else {
      unauthorizedHandler?.();
    }
  }

  return { res, text, json };
}

export async function apiRequest<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  const { res, json } = await fetchApi(path, opts);

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    throw new ApiError(res.status, json as ApiErrorBody | null, res.statusText || "Request failed");
  }

  if (json && typeof json === "object" && json !== null && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export async function apiRequestWithMeta<T>(
  path: string,
  opts: ApiRequestOptions = {},
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const { res, json } = await fetchApi(path, opts);

  if (res.status === 204) return { data: undefined as T };

  if (!res.ok) {
    throw new ApiError(res.status, json as ApiErrorBody | null, res.statusText || "Request failed");
  }

  if (json && typeof json === "object" && json !== null && "data" in json) {
    const envelope = json as { data: T; meta?: Record<string, unknown> };
    return { data: envelope.data, meta: envelope.meta };
  }
  return { data: json as T };
}

export const koboToNaira = (kobo: number) => kobo / 100;
export const nairaToKobo = (naira: number) => Math.round(naira * 100);
