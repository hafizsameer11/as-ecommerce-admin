import { apiRequest, apiRequestWithMeta, koboToNaira, nairaToKobo } from "./client";

function qs(params: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type AdminOrderRow = {
  id: string;
  number: string;
  status: string;
  statusLabel?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  total: number;
  itemsCount?: number;
  customer?: { id?: string | null; name?: string; email?: string | null; tier?: string | null } | null;
  customerName?: string;
  customerEmail?: string;
  placedAt: string;
  channel?: string;
};

export type AdminReturnRow = {
  id: string;
  number: string;
  order: string;
  orderId?: string;
  customerName: string;
  reason: string;
  items: number;
  refund: number;
  status: string;
  statusKey: string;
  requested: string;
  refundedAt?: string | null;
  actions?: string[];
};

export type AdminCustomerRow = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name: string;
  phone?: string | null;
  city?: string;
  country?: string;
  tier: string;
  status: string;
  orders: number;
  concierge?: number;
  spend: number;
  aov?: number;
  walletBalance?: number;
  loyaltyPoints?: number;
  lastOrderAt?: string | null;
  createdAt?: string;
  marketingOptIn?: boolean;
  tags?: string[];
  notes?: { id: string; author: string; at: string; body: string }[];
  addresses?: { label: string; line1: string; city: string; state: string; country: string }[];
};

export type AdminShipmentRow = {
  id: string;
  number: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  carrier: string;
  carrierLabel?: string;
  service: string;
  tracking: string | null;
  status: string;
  statusLabel?: string;
  origin?: string | null;
  warehouseId?: string | null;
  destination: string;
  weightKg: number;
  itemsCount: number;
  declaredValue: number;
  cost: number;
  insured: boolean;
  signatureRequired: boolean;
  notes?: string | null;
  createdAt: string;
  shippedAt?: string | null;
  etaAt?: string | null;
  deliveredAt?: string | null;
  events?: { at: string; status: string; label?: string; location: string; note?: string | null }[];
};

export const ordersAdminApi = {
  list: (query: { status?: string; q?: string; page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta<AdminOrderRow[]>(`/admin/orders${qs({ pageSize: 50, ...query })}`),

  get: (id: string) => apiRequest(`/admin/orders/${encodeURIComponent(id)}`),

  setStatus: (id: string, status: string) =>
    apiRequest(`/admin/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status },
    }),

  fulfill: (id: string, body: Record<string, unknown> = {}) =>
    apiRequest(`/admin/orders/${encodeURIComponent(id)}/fulfil`, { method: "POST", body }),

  refund: (id: string, body: Record<string, unknown> = {}) =>
    apiRequest(`/admin/orders/${encodeURIComponent(id)}/refund`, { method: "POST", body }),

  cancel: (id: string, body: { reason: string; refundTo?: string }) =>
    apiRequest(`/admin/orders/${encodeURIComponent(id)}/cancel`, { method: "POST", body }),

  markPaid: (id: string) =>
    apiRequest(`/admin/orders/${encodeURIComponent(id)}/mark-paid`, { method: "POST", body: {} }),

  addOrderNote: (id: string, body: string) =>
    apiRequest(`/admin/orders/${encodeURIComponent(id)}/notes`, { method: "POST", body: { body } }),

  removeOrderNote: (id: string, noteId: string) =>
    apiRequest(`/admin/orders/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`, {
      method: "DELETE",
    }),

  emailInvoice: (id: string) =>
    apiRequest(`/admin/orders/${encodeURIComponent(id)}/email-invoice`, { method: "POST", body: {} }),

  listReturns: (query: { status?: string; q?: string; page?: number; pageSize?: number; tab?: string } = {}) =>
    apiRequestWithMeta<AdminReturnRow[]>(`/admin/returns${qs({ pageSize: 100, ...query })}`),

  getReturn: (id: string) => apiRequest<AdminReturnRow>(`/admin/returns/${encodeURIComponent(id)}`),

  createReturn: (body: Record<string, unknown>) =>
    apiRequest<AdminReturnRow>("/admin/returns", { method: "POST", body }),

  approveReturn: (id: string, note?: string) =>
    apiRequest(`/admin/returns/${encodeURIComponent(id)}/approve`, { method: "POST", body: { note } }),

  rejectReturn: (id: string, reason: string) =>
    apiRequest(`/admin/returns/${encodeURIComponent(id)}/reject`, { method: "POST", body: { reason } }),

  refundReturn: (id: string, body: Record<string, unknown> = {}) =>
    apiRequest(`/admin/returns/${encodeURIComponent(id)}/refund`, { method: "POST", body }),

  listCustomers: (query: { q?: string; page?: number; pageSize?: number; tab?: string; status?: string } = {}) =>
    apiRequestWithMeta<AdminCustomerRow[]>(`/admin/customers${qs({ pageSize: 100, ...query })}`),

  getCustomer: (id: string) => apiRequest<AdminCustomerRow>(`/admin/customers/${encodeURIComponent(id)}`),

  setCustomerStatus: (id: string, status: string) =>
    apiRequest(`/admin/customers/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } }),

  setCustomerTier: (id: string, tier: string) =>
    apiRequest(`/admin/customers/${encodeURIComponent(id)}/tier`, { method: "PATCH", body: { tier } }),

  setCustomerMarketing: (id: string, optIn: boolean) =>
    apiRequest(`/admin/customers/${encodeURIComponent(id)}/marketing`, {
      method: "POST",
      body: { optIn },
    }),

  addCustomerNote: (id: string, body: string) =>
    apiRequest(`/admin/customers/${encodeURIComponent(id)}/notes`, { method: "POST", body: { body } }),

  removeCustomerNote: (id: string, noteId: string) =>
    apiRequest(`/admin/customers/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`, {
      method: "DELETE",
    }),

  addCustomerTag: (id: string, tag: string) =>
    apiRequest(`/admin/customers/${encodeURIComponent(id)}/tags`, { method: "POST", body: { tag } }),

  removeCustomerTag: (id: string, tag: string) =>
    apiRequest(`/admin/customers/${encodeURIComponent(id)}/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE",
    }),

  adjustCustomerWallet: (
    id: string,
    amountKobo: number,
    kind: "credit" | "debit",
    note: string,
  ) =>
    apiRequest(`/admin/customers/${encodeURIComponent(id)}/wallet-adjust`, {
      method: "POST",
      body: { amount: amountKobo, kind, note },
    }),

  removeCustomer: (id: string) =>
    apiRequest(`/admin/customers/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listAddresses: (query: { page?: number; pageSize?: number; tab?: string; customerId?: string } = {}) =>
    apiRequestWithMeta(`/admin/addresses${qs({ pageSize: 100, ...query })}`),

  updateAddress: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/addresses/${encodeURIComponent(id)}`, { method: "PATCH", body }),

  verifyAddress: (id: string) =>
    apiRequest(`/admin/addresses/${encodeURIComponent(id)}/verify`, { method: "POST" }),

  flagAddress: (id: string, flagged: boolean) =>
    apiRequest(`/admin/addresses/${encodeURIComponent(id)}/flag`, {
      method: "POST",
      body: { flagged },
    }),

  setDefaultAddress: (id: string) =>
    apiRequest(`/admin/addresses/${encodeURIComponent(id)}/default`, { method: "POST" }),

  removeAddress: (id: string) =>
    apiRequest(`/admin/addresses/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listReviews: (query: {
    page?: number;
    pageSize?: number;
    status?: string;
    rating?: number;
    q?: string;
    product?: string;
  } = {}) => apiRequestWithMeta(`/admin/reviews${qs({ pageSize: 100, ...query })}`),

  setReviewStatus: (id: string, status: string, reason?: string) =>
    apiRequest(`/admin/reviews/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status, reason },
    }),

  bulkReviews: (ids: string[], action: "publish" | "reject" | "flag" | "delete") =>
    apiRequest("/admin/reviews/bulk", { method: "POST", body: { ids, action } }),

  replyReview: (id: string, body: string) =>
    apiRequest(`/admin/reviews/${encodeURIComponent(id)}/reply`, { method: "POST", body: { body } }),

  removeReview: (id: string) =>
    apiRequest(`/admin/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listWallets: (query: { page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta(`/admin/wallets/transactions${qs({ pageSize: 50, ...query })}`),

  listShipments: (query: { status?: string; q?: string; page?: number; pageSize?: number; tab?: string } = {}) =>
    apiRequestWithMeta<AdminShipmentRow[]>(`/admin/shipments${qs({ pageSize: 100, ...query })}`),

  getShipment: (id: string) =>
    apiRequest<AdminShipmentRow>(`/admin/shipments/${encodeURIComponent(id)}`),

  createShipment: (body: Record<string, unknown>) =>
    apiRequest<AdminShipmentRow>("/admin/shipments", { method: "POST", body }),

  updateShipment: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/shipments/${encodeURIComponent(id)}`, { method: "PATCH", body }),

  advanceShipment: (id: string, body: { status?: string; location?: string; note?: string }) =>
    apiRequest(`/admin/shipments/${encodeURIComponent(id)}/advance`, { method: "POST", body }),

  removeShipment: (id: string) =>
    apiRequest(`/admin/shipments/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listPickupLocations: () =>
    apiRequest<Record<string, unknown>[]>("/admin/pickup-locations"),

  createPickupLocation: (body: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>("/admin/pickup-locations", { method: "POST", body }),

  updatePickupLocation: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/pickup-locations/${encodeURIComponent(id)}`, { method: "PATCH", body }),

  removePickupLocation: (id: string) =>
    apiRequest(`/admin/pickup-locations/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listPickupBookings: (query: { page?: number; pageSize?: number; tab?: string } = {}) =>
    apiRequestWithMeta(`/admin/pickups/bookings${qs({ pageSize: 100, ...query })}`),

  advancePickup: (id: string, status: string, collectedBy?: string) =>
    apiRequest(`/admin/pickups/bookings/${encodeURIComponent(id)}/advance`, {
      method: "POST",
      body: { status, collectedBy },
    }),

  setPickupNote: (id: string, note: string) =>
    apiRequest(`/admin/pickups/bookings/${encodeURIComponent(id)}/notes`, {
      method: "POST",
      body: { note },
    }),
};

export { koboToNaira, nairaToKobo };
