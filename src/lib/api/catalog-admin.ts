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

export const brandsAdminApi = {
  list: (query: { q?: string; status?: string; tier?: string } = {}) =>
    apiRequestWithMeta<Record<string, unknown>[]>(`/admin/brands${qs(query)}`),
  get: (id: string) => apiRequest<Record<string, unknown>>(`/admin/brands/${encodeURIComponent(id)}`),
  create: (body: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>("/admin/brands", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>(`/admin/brands/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  duplicate: (id: string) =>
    apiRequest<Record<string, unknown>>(`/admin/brands/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  remove: (id: string) =>
    apiRequest(`/admin/brands/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const categoriesAdminApi = {
  list: () => apiRequest<Record<string, unknown>[]>("/admin/categories"),
  create: (body: { name: string }) =>
    apiRequest<Record<string, unknown>>("/admin/categories", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>(`/admin/categories/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  move: (id: string, dir: "up" | "down") =>
    apiRequest<Record<string, unknown>[]>(`/admin/categories/${encodeURIComponent(id)}/move`, {
      method: "POST",
      body: { dir },
    }),
  remove: (id: string) =>
    apiRequest(`/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE" }),
  addSub: (id: string, body: { name: string }) =>
    apiRequest<Record<string, unknown>>(`/admin/categories/${encodeURIComponent(id)}/subcategories`, {
      method: "POST",
      body,
    }),
  updateSub: (id: string, subId: string, body: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>(
      `/admin/categories/${encodeURIComponent(id)}/subcategories/${encodeURIComponent(subId)}`,
      { method: "PATCH", body },
    ),
  removeSub: (id: string, subId: string) =>
    apiRequest<Record<string, unknown>>(
      `/admin/categories/${encodeURIComponent(id)}/subcategories/${encodeURIComponent(subId)}`,
      { method: "DELETE" },
    ),
};

export const collectionsAdminApi = {
  list: (query: { q?: string; status?: string } = {}) =>
    apiRequestWithMeta<Record<string, unknown>[]>(`/admin/collections${qs(query)}`),
  get: (id: string) =>
    apiRequest<Record<string, unknown>>(`/admin/collections/${encodeURIComponent(id)}`),
  preview: (id: string) =>
    apiRequest<unknown[]>(`/admin/collections/${encodeURIComponent(id)}/preview`),
  create: (body: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>("/admin/collections", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>(`/admin/collections/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    }),
  duplicate: (id: string) =>
    apiRequest<Record<string, unknown>>(`/admin/collections/${encodeURIComponent(id)}/duplicate`, {
      method: "POST",
    }),
  remove: (id: string) =>
    apiRequest(`/admin/collections/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const sizeGuidesAdminApi = {
  list: () => apiRequest<Record<string, unknown>[]>("/admin/size-guides"),
  save: (body: { scope: string; target: string; note: string; chartUrl?: string | null }) =>
    apiRequest<Record<string, unknown>>("/admin/size-guides", { method: "PUT", body }),
  remove: (id: string) =>
    apiRequest(`/admin/size-guides/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
