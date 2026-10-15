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

export function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || DEFAULT_BASE;
}

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  rawBody?: BodyInit | null;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export async function apiRequest<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  const url = `${apiBaseUrl()}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };

  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  let body: BodyInit | undefined;
  if (opts.rawBody !== undefined) {
    body = opts.rawBody ?? undefined;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method: opts.method ?? (opts.body !== undefined || opts.rawBody !== undefined ? "POST" : "GET"),
    headers,
    body,
    credentials: "include",
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, json as ApiErrorBody | null, res.statusText || "Request failed");
  }

  // Backend success envelope: { data: T, meta? }
  if (json && typeof json === "object" && json !== null && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export async function apiRequestWithMeta<T>(
  path: string,
  opts: ApiRequestOptions = {}
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const url = `${apiBaseUrl()}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };

  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  let body: BodyInit | undefined;
  if (opts.rawBody !== undefined) {
    body = opts.rawBody ?? undefined;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method: opts.method ?? (opts.body !== undefined || opts.rawBody !== undefined ? "POST" : "GET"),
    headers,
    body,
    credentials: "include",
    signal: opts.signal,
  });

  if (res.status === 204) return { data: undefined as T };

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

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
