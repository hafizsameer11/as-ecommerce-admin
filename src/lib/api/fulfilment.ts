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

export const inventoryAdminApi = {
  list: (query: { page?: number; pageSize?: number; q?: string; warehouse?: string; state?: string } = {}) =>
    apiRequestWithMeta(`/admin/inventory${qs({ pageSize: 500, ...query })}`),
  adjust: (body: { sku: string; warehouseId: string; delta: number; note: string; type?: "adjust" | "receive" }) =>
    apiRequest("/admin/inventory/adjust", { method: "POST", body }),
  transfer: (body: { sku: string; from: string; to: string; qty: number; note: string }) =>
    apiRequest("/admin/inventory/transfer", { method: "POST", body }),
  setReorderPoint: (body: { sku: string; warehouseId: string; reorderPoint: number }) =>
    apiRequest("/admin/inventory/reorder-point", { method: "PATCH", body }),
  movements: (query: { page?: number; pageSize?: number; sku?: string; type?: string } = {}) =>
    apiRequestWithMeta(`/admin/inventory/movements${qs({ pageSize: 200, ...query })}`),
};

export const warehousesAdminApi = {
  list: () => apiRequest("/admin/warehouses"),
  create: (body: { name: string; code: string; city: string }) =>
    apiRequest("/admin/warehouses", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/warehouses/${encodeURIComponent(id)}`, { method: "PATCH", body }),
};

export const shippingZonesAdminApi = {
  list: () => apiRequest("/admin/shipping-zones"),
  get: (id: string) => apiRequest(`/admin/shipping-zones/${encodeURIComponent(id)}`),
  create: (body: Record<string, unknown>) =>
    apiRequest("/admin/shipping-zones", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/shipping-zones/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  duplicate: (id: string) =>
    apiRequest(`/admin/shipping-zones/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  toggle: (id: string) =>
    apiRequest(`/admin/shipping-zones/${encodeURIComponent(id)}/toggle`, { method: "POST" }),
  remove: (id: string) =>
    apiRequest(`/admin/shipping-zones/${encodeURIComponent(id)}`, { method: "DELETE" }),
  addRate: (zoneId: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/shipping-zones/${encodeURIComponent(zoneId)}/rates`, { method: "POST", body }),
  updateRate: (zoneId: string, rateId: string, body: Record<string, unknown>) =>
    apiRequest(
      `/admin/shipping-zones/${encodeURIComponent(zoneId)}/rates/${encodeURIComponent(rateId)}`,
      { method: "PUT", body },
    ),
  removeRate: (zoneId: string, rateId: string) =>
    apiRequest(
      `/admin/shipping-zones/${encodeURIComponent(zoneId)}/rates/${encodeURIComponent(rateId)}`,
      { method: "DELETE" },
    ),
};

export const taxAdminApi = {
  overview: () => apiRequest("/admin/tax"),
  createRate: (body: Record<string, unknown>) =>
    apiRequest("/admin/tax/rates", { method: "POST", body }),
  updateRate: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/tax/rates/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  toggleRate: (id: string) =>
    apiRequest(`/admin/tax/rates/${encodeURIComponent(id)}/toggle`, { method: "POST" }),
  removeRate: (id: string) =>
    apiRequest(`/admin/tax/rates/${encodeURIComponent(id)}`, { method: "DELETE" }),
  addExemption: (body: Record<string, unknown>) =>
    apiRequest("/admin/tax/exemptions", { method: "POST", body }),
  removeExemption: (id: string) =>
    apiRequest(`/admin/tax/exemptions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  createCategory: (body: Record<string, unknown>) =>
    apiRequest("/admin/tax/categories", { method: "POST", body }),
  updateCategory: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/tax/categories/${encodeURIComponent(id)}`, { method: "PATCH", body }),
};

export const suppliersAdminApi = {
  list: (query: { page?: number; pageSize?: number; tab?: string; tier?: string; country?: string; vip?: string } = {}) =>
    apiRequestWithMeta(`/admin/concierge/suppliers${qs({ pageSize: 100, tab: "all", ...query })}`),
  get: (id: string) => apiRequest(`/admin/concierge/suppliers/${encodeURIComponent(id)}`),
  create: (body: Record<string, unknown>) =>
    apiRequest("/admin/concierge/suppliers", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/concierge/suppliers/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  toggleVip: (id: string) =>
    apiRequest(`/admin/concierge/suppliers/${encodeURIComponent(id)}/vip`, { method: "POST" }),
  remove: (id: string) =>
    apiRequest(`/admin/concierge/suppliers/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const dropsAdminApi = {
  list: (query: { page?: number; pageSize?: number; tab?: string; q?: string } = {}) =>
    apiRequestWithMeta(`/admin/drops${qs({ pageSize: 100, tab: "all", ...query })}`),
  get: (id: string) => apiRequest(`/admin/drops/${encodeURIComponent(id)}`),
  create: (body: Record<string, unknown>) =>
    apiRequest("/admin/drops", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/drops/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  goLive: (id: string) =>
    apiRequest(`/admin/drops/${encodeURIComponent(id)}/go-live`, { method: "POST" }),
  end: (id: string) =>
    apiRequest(`/admin/drops/${encodeURIComponent(id)}/end`, { method: "POST" }),
  listReservations: (
    dropId: string,
    query: { page?: number; pageSize?: number; tab?: string; q?: string } = {},
  ) =>
    apiRequestWithMeta(
      `/admin/drops/${encodeURIComponent(dropId)}/reservations${qs({ pageSize: 100, tab: "all", ...query })}`,
    ),
  getReservation: (dropId: string, rid: string) =>
    apiRequest(`/admin/drops/${encodeURIComponent(dropId)}/reservations/${encodeURIComponent(rid)}`),
  cancelReservation: (
    dropId: string,
    rid: string,
    body: { reason: string; refundTo?: "original" | "wallet" | "none" } = {
      reason: "Cancelled by admin",
      refundTo: "original",
    },
  ) =>
    apiRequest(
      `/admin/drops/${encodeURIComponent(dropId)}/reservations/${encodeURIComponent(rid)}/cancel`,
      { method: "POST", body },
    ),
};
