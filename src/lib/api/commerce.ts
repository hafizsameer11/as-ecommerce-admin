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

export type AdminCouponDto = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  type: "percent" | "fixed" | "free_shipping" | "bogo";
  value: number;
  status: "active" | "scheduled" | "expired" | "paused" | "draft";
  startsAt?: string | null;
  endsAt?: string | null;
  minSubtotal?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  used: number;
  usedCount?: number;
  revenue: number;
  appliesTo: "all" | "categories" | "brands" | "products" | "collections";
  appliesToRefs?: string[];
  eligibility: "all" | "new" | "vip" | "segment";
  segmentId?: string | null;
  stackable: boolean;
  autoApply: boolean;
  oncePerCustomer: boolean;
  channels: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  notes?: string | null;
};

export type AbandonedCartRow = {
  id: string;
  ref: string;
  customer: string;
  email: string | null;
  items: { name: string; image: string | null; price: number; qty: number }[];
  itemsCount: number;
  total: number;
  stage: string;
  status: string;
  reminderStage: number;
  channel: string;
  abandonedAt: string | null;
};

export type DraftOrderRow = {
  id: string;
  number: string;
  customerName: string;
  email?: string | null;
  itemsCount: number;
  total: number;
  status: string;
  note?: string | null;
  createdAt: string;
};

export type TransactionRow = {
  id: string;
  reference: string;
  purpose: string;
  method: string;
  status: string;
  amount: number;
  fee: number;
  net: number;
  email?: string | null;
  orderNumber?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

const moneyFields = ["value", "minSubtotal", "maxDiscount", "revenue"] as const;

export function mapCouponFromApi(c: AdminCouponDto) {
  const isMoney = c.type === "fixed";
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    description: c.description ?? undefined,
    type: c.type,
    value: isMoney ? koboToNaira(c.value) : c.value,
    status: c.status,
    startsAt: c.startsAt ?? new Date().toISOString(),
    endsAt: c.endsAt ?? undefined,
    minSubtotal: c.minSubtotal != null ? koboToNaira(c.minSubtotal) : undefined,
    maxDiscount: c.maxDiscount != null ? koboToNaira(c.maxDiscount) : undefined,
    usageLimit: c.usageLimit ?? undefined,
    perCustomerLimit: c.perCustomerLimit ?? undefined,
    used: c.used ?? c.usedCount ?? 0,
    redemptions: c.used ?? c.usedCount ?? 0,
    revenue: koboToNaira(Number(c.revenue) || 0),
    appliesTo: c.appliesTo,
    appliesToRefs: c.appliesToRefs,
    eligibility: c.eligibility,
    segmentId: c.segmentId ?? undefined,
    stackable: !!c.stackable,
    autoApply: !!c.autoApply,
    oncePerCustomer: !!c.oncePerCustomer,
    channels: (c.channels ?? []) as ("web" | "mobile" | "concierge")[],
    pinned: !!c.pinned,
    createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date(c.createdAt).toISOString(),
    updatedAt: typeof c.updatedAt === "string" ? c.updatedAt : new Date(c.updatedAt).toISOString(),
    notes: c.notes ?? undefined,
  };
}

export function mapCouponToApiBody(c: Partial<AdminCouponDto> & { type?: string; value?: number }) {
  const body: Record<string, unknown> = { ...c };
  if (c.type === "fixed" && c.value != null) body.value = nairaToKobo(c.value);
  if (c.minSubtotal != null) body.minSubtotal = nairaToKobo(Number(c.minSubtotal));
  if (c.maxDiscount != null) body.maxDiscount = nairaToKobo(Number(c.maxDiscount));
  for (const f of moneyFields) {
    if (f === "value" && c.type !== "fixed") continue;
  }
  return body;
}

export const commerceAdminApi = {
  listCoupons: (query: { status?: string; type?: string; q?: string; page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta<AdminCouponDto[]>(`/admin/coupons${qs(query)}`),

  createCoupon: (body: Record<string, unknown>) =>
    apiRequest<AdminCouponDto>("/admin/coupons", { method: "POST", body }),

  updateCoupon: (id: string, body: Record<string, unknown>) =>
    apiRequest<AdminCouponDto>(`/admin/coupons/${encodeURIComponent(id)}`, { method: "PATCH", body }),

  setCouponStatus: (id: string, status: string) =>
    apiRequest<AdminCouponDto>(`/admin/coupons/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status },
    }),

  toggleCouponPin: (id: string) =>
    apiRequest<AdminCouponDto>(`/admin/coupons/${encodeURIComponent(id)}/pin`, { method: "POST" }),

  duplicateCoupon: (id: string) =>
    apiRequest<AdminCouponDto>(`/admin/coupons/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),

  deleteCoupon: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/admin/coupons/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listAbandonedCarts: (query: { stage?: string; page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta<AbandonedCartRow[]>(`/admin/carts/abandoned${qs({ pageSize: 50, ...query })}`),

  remindCart: (id: string, channel: "email" | "push" = "email") =>
    apiRequest(`/admin/carts/${encodeURIComponent(id)}/remind`, { method: "POST", body: { channel } }),

  remindCartsBulk: (ids?: string[]) =>
    apiRequest("/admin/carts/remind-bulk", { method: "POST", body: ids ? { ids } : {} }),

  recoveryRules: () => apiRequest("/admin/carts/recovery-rules"),

  listDrafts: (query: { tab?: string; page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta<DraftOrderRow[]>(`/admin/draft-orders${qs({ pageSize: 50, tab: "all", ...query })}`),

  createDraft: (body: Record<string, unknown>) =>
    apiRequest<DraftOrderRow>("/admin/draft-orders", { method: "POST", body }),

  sendDraft: (id: string, body: Record<string, unknown> = {}) =>
    apiRequest(`/admin/draft-orders/${encodeURIComponent(id)}/send`, { method: "POST", body }),

  duplicateDraft: (id: string) =>
    apiRequest<DraftOrderRow>(`/admin/draft-orders/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),

  deleteDraft: (id: string) =>
    apiRequest(`/admin/draft-orders/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listTransactions: (query: { page?: number; pageSize?: number; status?: string } = {}) =>
    apiRequestWithMeta<TransactionRow[]>(`/admin/transactions${qs({ pageSize: 50, ...query })}`),
};

export { koboToNaira, nairaToKobo };
