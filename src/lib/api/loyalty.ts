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

export type AdminConciergeRow = {
  id: string;
  number: string;
  customer: { name: string; email: string; tier?: string | null };
  category: string;
  brand: string;
  itemName: string;
  size?: string | null;
  color?: string | null;
  budget?: number | null;
  status: string;
  statusLabel: string;
  priority: string;
  assignee: { id: string; name: string } | null;
  slaDueAt?: string | null;
  quote?: { total?: number; amount?: number; deposit?: number; expiresAt?: string } | null;
  images?: string[];
  notes?: string;
  reference?: string | null;
  timeline?: { kind: string; text: string; by: string; at: string; internal?: boolean }[];
  createdAt: string;
  updatedAt: string;
  unread?: number;
};

export const conciergeAdminApi = {
  listRequests: (query: { page?: number; pageSize?: number; status?: string; q?: string } = {}) =>
    apiRequestWithMeta<AdminConciergeRow[]>(`/admin/concierge/requests${qs({ pageSize: 100, ...query })}`),

  board: () => apiRequestWithMeta<Record<string, AdminConciergeRow[]>>("/admin/concierge/requests/board"),

  getRequest: (id: string) =>
    apiRequest<AdminConciergeRow>(`/admin/concierge/requests/${encodeURIComponent(id)}`),

  setStatus: (id: string, status: string, note?: string) =>
    apiRequest(`/admin/concierge/requests/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status, note },
    }),

  assign: (id: string, adminId: string | null) =>
    apiRequest(`/admin/concierge/requests/${encodeURIComponent(id)}/assign`, {
      method: "POST",
      body: { adminId },
    }),

  setPriority: (id: string, priority: "standard" | "priority" | "vip") =>
    apiRequest(`/admin/concierge/requests/${encodeURIComponent(id)}/priority`, {
      method: "PATCH",
      body: { priority },
    }),

  addNote: (id: string, text: string, internal = true) =>
    apiRequest(`/admin/concierge/requests/${encodeURIComponent(id)}/notes`, {
      method: "POST",
      body: { text, internal },
    }),

  createQuote: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/concierge/requests/${encodeURIComponent(id)}/quotes`, {
      method: "POST",
      body,
    }),

  listQuotes: (query: { page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta(`/admin/concierge/quotes${qs({ pageSize: 50, ...query })}`),

  listThreads: (query: { page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta(`/admin/concierge/threads${qs({ pageSize: 50, ...query })}`),

  threadMessages: (id: string) =>
    apiRequest(`/admin/concierge/threads/${encodeURIComponent(id)}/messages`),

  sendMessage: (id: string, text: string) =>
    apiRequest(`/admin/concierge/threads/${encodeURIComponent(id)}/messages`, {
      method: "POST",
      body: { text },
    }),
};

export const clubAdminApi = {
  overview: () => apiRequest("/admin/club"),
  tiers: () => apiRequest("/admin/club/tiers"),
  updateTier: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/club/tiers/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  rules: () => apiRequest("/admin/club/rules"),
  updateRules: (body: Record<string, unknown>) =>
    apiRequest("/admin/club/rules", { method: "PUT", body }),
  rewards: (query: { page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta(`/admin/club/rewards${qs({ pageSize: 100, ...query })}`),
  createReward: (body: Record<string, unknown>) =>
    apiRequest("/admin/club/rewards", { method: "POST", body }),
  updateReward: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/club/rewards/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  duplicateReward: (id: string) =>
    apiRequest(`/admin/club/rewards/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  toggleReward: (id: string) =>
    apiRequest(`/admin/club/rewards/${encodeURIComponent(id)}/toggle`, { method: "POST" }),
  removeReward: (id: string) =>
    apiRequest(`/admin/club/rewards/${encodeURIComponent(id)}`, { method: "DELETE" }),
  adjustPoints: (body: { customerId: string; delta: number; reason: string }) =>
    apiRequest("/admin/club/points/adjust", { method: "POST", body }),
  ledger: (query: { page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta(`/admin/club/ledger${qs({ pageSize: 50, ...query })}`),
};

export const referralsAdminApi = {
  overview: () => apiRequest("/admin/referrals/overview"),
  config: () => apiRequest("/admin/referrals/config"),
  updateConfig: (body: Record<string, unknown>) =>
    apiRequest("/admin/referrals/config", { method: "PUT", body }),
  advocates: (query: { page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta(`/admin/referrals/advocates${qs({ pageSize: 100, ...query })}`),
  setAdvocateStatus: (id: string, status: string) =>
    apiRequest(`/admin/referrals/advocates/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status },
    }),
  list: (query: { page?: number; pageSize?: number; status?: string } = {}) =>
    apiRequestWithMeta(`/admin/referrals${qs({ pageSize: 100, ...query })}`),
  approve: (id: string, note?: string) =>
    apiRequest(`/admin/referrals/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: { note },
    }),
  reject: (id: string, note?: string) =>
    apiRequest(`/admin/referrals/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: { note },
    }),
};

export const dropsAdminApi = {
  list: (query: { page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta(`/admin/drops${qs({ pageSize: 50, ...query })}`),
};

export { koboToNaira, nairaToKobo };
