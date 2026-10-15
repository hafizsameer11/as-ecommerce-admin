import { apiRequest, apiRequestWithMeta } from "./client";

function qs(params: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const segmentsAdminApi = {
  list: (query: { page?: number; pageSize?: number; pinned?: string; counts?: string } = {}) =>
    apiRequestWithMeta(`/admin/segments${qs({ pageSize: 100, counts: "true", ...query })}`),
  get: (id: string) => apiRequest(`/admin/segments/${encodeURIComponent(id)}`),
  create: (body: Record<string, unknown>) =>
    apiRequest("/admin/segments", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/segments/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  duplicate: (id: string) =>
    apiRequest(`/admin/segments/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  togglePin: (id: string) =>
    apiRequest(`/admin/segments/${encodeURIComponent(id)}/pin`, { method: "POST" }),
  remove: (id: string) =>
    apiRequest(`/admin/segments/${encodeURIComponent(id)}`, { method: "DELETE" }),
  preview: (body: { match: "all" | "any"; rules: unknown[] }) =>
    apiRequest("/admin/segments/preview", { method: "POST", body }),
  previewSaved: (id: string) =>
    apiRequest(`/admin/segments/${encodeURIComponent(id)}/preview`),
};

export const slotsAdminApi = {
  list: (query: {
    page?: number;
    pageSize?: number;
    slotPage?: string;
    status?: string;
    type?: string;
  } = {}) => apiRequestWithMeta(`/admin/slots${qs({ pageSize: 100, ...query })}`),
  create: (body: Record<string, unknown>) =>
    apiRequest("/admin/slots", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/slots/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  setStatus: (id: string, status: string) =>
    apiRequest(`/admin/slots/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } }),
  togglePin: (id: string) =>
    apiRequest(`/admin/slots/${encodeURIComponent(id)}/pin`, { method: "POST" }),
  duplicate: (id: string) =>
    apiRequest(`/admin/slots/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  move: (id: string, direction: "up" | "down") =>
    apiRequest(`/admin/slots/${encodeURIComponent(id)}/move`, { method: "POST", body: { direction } }),
  reorder: (page: string, ids: string[]) =>
    apiRequest("/admin/slots/reorder", { method: "POST", body: { page, ids } }),
  remove: (id: string) =>
    apiRequest(`/admin/slots/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
