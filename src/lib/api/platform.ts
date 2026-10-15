import { apiRequest, apiRequestWithMeta } from "./client";

function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type DateRangeQuery = {
  range?: "7d" | "14d" | "30d" | "90d" | "12m";
  from?: string;
  to?: string;
  days?: number;
  compare?: boolean;
  channel?: string;
  country?: string;
};

export const dashboardAdminApi = {
  get: (query: { range?: "7d" | "14d" | "30d" | "90d" } = {}) =>
    apiRequest<Record<string, unknown>>(`/admin/dashboard${qs(query)}`),
};

export const activityAdminApi = {
  list: (query: { type?: string; from?: string; to?: string; since?: string; q?: string; page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta(`/admin/activity${qs({ pageSize: 50, ...query })}`),
};

export type AnalyticsRange = "7d" | "14d" | "30d" | "90d" | "12m";

export const analyticsAdminApi = {
  sales: (query: { range?: AnalyticsRange; channel?: string; country?: string } = {}) =>
    apiRequest<Record<string, unknown>>(`/admin/analytics/sales${qs(query)}`),
  products: (query: {
    range?: AnalyticsRange;
    category?: string;
    sort?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {}) => apiRequest<Record<string, unknown>>(`/admin/analytics/products${qs(query)}`),
  traffic: (query: { range?: AnalyticsRange; device?: string; source?: string } = {}) =>
    apiRequest<Record<string, unknown>>(`/admin/analytics/traffic${qs(query)}`),
  cohorts: (query: { window?: "6m" | "12m" | "24m"; metric?: "retention" | "revenue" | "orders" } = {}) =>
    apiRequest<Record<string, unknown>>(`/admin/analytics/cohorts${qs(query)}`),
  concierge: (query: { range?: AnalyticsRange; priority?: string } = {}) =>
    apiRequest<Record<string, unknown>>(`/admin/analytics/concierge${qs(query)}`),
};

export const reportsAdminApi = {
  generators: () => apiRequest("/admin/reports/generators"),
  list: (query: { page?: number; pageSize?: number; category?: string; q?: string; tab?: string } = {}) =>
    apiRequestWithMeta(`/admin/reports${qs({ pageSize: 100, ...query })}`),
  get: (id: string) => apiRequest(`/admin/reports/${encodeURIComponent(id)}`),
  create: (body: Record<string, unknown>) =>
    apiRequest("/admin/reports", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/reports/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  remove: (id: string) =>
    apiRequest(`/admin/reports/${encodeURIComponent(id)}`, { method: "DELETE" }),
  favorite: (id: string) =>
    apiRequest(`/admin/reports/${encodeURIComponent(id)}/favorite`, { method: "POST" }),
  schedule: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/reports/${encodeURIComponent(id)}/schedule`, { method: "POST", body }),
  run: (id: string, body: Record<string, unknown> = {}) =>
    apiRequest(`/admin/reports/${encodeURIComponent(id)}/run`, { method: "POST", body }),
  runs: (query: { page?: number; pageSize?: number; status?: string } = {}) =>
    apiRequestWithMeta(`/admin/reports/runs${qs({ pageSize: 50, ...query })}`),
  getRun: (runId: string) =>
    apiRequest(`/admin/reports/runs/${encodeURIComponent(runId)}`),
  downloadRunUrl: (runId: string) =>
    `/admin/reports/runs/${encodeURIComponent(runId)}/download`,
};

export const ledgerAdminApi = {
  accounts: (query: { q?: string; type?: string; archived?: boolean } = {}) =>
    apiRequestWithMeta(`/admin/ledger/accounts${qs(query as Record<string, string | number | boolean | undefined>)}`),
  addAccount: (body: Record<string, unknown>) =>
    apiRequest("/admin/ledger/accounts", { method: "POST", body }),
  renameAccount: (code: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/ledger/accounts/${encodeURIComponent(code)}`, { method: "PATCH", body }),
  archiveAccount: (code: string) =>
    apiRequest(`/admin/ledger/accounts/${encodeURIComponent(code)}/archive`, { method: "POST" }),
  unarchiveAccount: (code: string) =>
    apiRequest(`/admin/ledger/accounts/${encodeURIComponent(code)}/unarchive`, { method: "POST" }),
  entries: (query: Record<string, string | number | boolean | undefined> = {}) =>
    apiRequestWithMeta(`/admin/ledger/entries${qs({ pageSize: 100, ...query })}`),
  getEntry: (id: string) =>
    apiRequest(`/admin/ledger/entries/${encodeURIComponent(id)}`),
  createEntry: (body: Record<string, unknown>) =>
    apiRequest("/admin/ledger/entries", { method: "POST", body }),
  updateEntry: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/ledger/entries/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  postEntry: (id: string) =>
    apiRequest(`/admin/ledger/entries/${encodeURIComponent(id)}/post`, { method: "POST" }),
  voidEntry: (id: string) =>
    apiRequest(`/admin/ledger/entries/${encodeURIComponent(id)}/void`, { method: "POST" }),
  removeEntry: (id: string) =>
    apiRequest(`/admin/ledger/entries/${encodeURIComponent(id)}`, { method: "DELETE" }),
  trialBalance: (query: { from?: string; to?: string } = {}) =>
    apiRequest(`/admin/ledger/trial-balance${qs(query)}`),
};

export const payoutsAdminApi = {
  list: (query: { page?: number; pageSize?: number; status?: string; q?: string } = {}) =>
    apiRequestWithMeta(`/admin/payouts${qs({ pageSize: 100, ...query })}`),
  get: (id: string) => apiRequest(`/admin/payouts/${encodeURIComponent(id)}`),
  providers: () => apiRequest("/admin/payouts/providers"),
  sync: () => apiRequest("/admin/payouts/sync", { method: "POST" }),
  create: (body: Record<string, unknown>) =>
    apiRequest("/admin/payouts", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/payouts/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  markPaid: (id: string) =>
    apiRequest(`/admin/payouts/${encodeURIComponent(id)}/mark-paid`, { method: "POST" }),
  markFailed: (id: string, body: Record<string, unknown> = {}) =>
    apiRequest(`/admin/payouts/${encodeURIComponent(id)}/mark-failed`, { method: "POST", body }),
  retry: (id: string) =>
    apiRequest(`/admin/payouts/${encodeURIComponent(id)}/retry`, { method: "POST" }),
  hold: (id: string, body: Record<string, unknown> = {}) =>
    apiRequest(`/admin/payouts/${encodeURIComponent(id)}/hold`, { method: "POST", body }),
  release: (id: string) =>
    apiRequest(`/admin/payouts/${encodeURIComponent(id)}/release`, { method: "POST" }),
  remove: (id: string) =>
    apiRequest(`/admin/payouts/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const walletsAdminApi = {
  list: (query: { page?: number; pageSize?: number; q?: string; kind?: string; status?: string; customerId?: string } = {}) =>
    apiRequestWithMeta(`/admin/wallets/transactions${qs({ pageSize: 100, ...query })}`),
  get: (id: string) =>
    apiRequest(`/admin/wallets/transactions/${encodeURIComponent(id)}`),
  adjust: (body: Record<string, unknown>) =>
    apiRequest("/admin/wallets/adjust", { method: "POST", body }),
  approve: (id: string) =>
    apiRequest(`/admin/wallets/transactions/${encodeURIComponent(id)}/approve`, { method: "POST" }),
  markFailed: (id: string, body: Record<string, unknown> = {}) =>
    apiRequest(`/admin/wallets/transactions/${encodeURIComponent(id)}/mark-failed`, {
      method: "POST",
      body,
    }),
  reverse: (id: string) =>
    apiRequest(`/admin/wallets/transactions/${encodeURIComponent(id)}/reverse`, { method: "POST" }),
  freeze: (customerId: string) =>
    apiRequest(`/admin/wallets/${encodeURIComponent(customerId)}/freeze`, { method: "POST" }),
  unfreeze: (customerId: string) =>
    apiRequest(`/admin/wallets/${encodeURIComponent(customerId)}/unfreeze`, { method: "POST" }),
};

export const auditAdminApi = {
  list: (query: Record<string, string | number | boolean | undefined> = {}) =>
    apiRequestWithMeta(`/admin/audit${qs({ pageSize: 100, ...query })}`),
};

export const teamAdminApi = {
  members: () => apiRequest("/admin/team/members"),
  invite: (body: Record<string, unknown>) =>
    apiRequest("/admin/team/members", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/team/members/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  remove: (id: string) =>
    apiRequest(`/admin/team/members/${encodeURIComponent(id)}`, { method: "DELETE" }),
  resendInvite: (id: string) =>
    apiRequest(`/admin/team/members/${encodeURIComponent(id)}/resend-invite`, { method: "POST" }),
  roles: () => apiRequest("/admin/team/roles"),
  permissions: () => apiRequest("/admin/team/permissions"),
  setRolePermissions: (role: string, permissions: string[]) =>
    apiRequest(`/admin/team/roles/${encodeURIComponent(role)}/permissions`, {
      method: "PUT",
      body: { permissions },
    }),
  resetRolePermissions: (role: string) =>
    apiRequest(`/admin/team/roles/${encodeURIComponent(role)}/permissions`, { method: "DELETE" }),
};

export const settingsAdminApi = {
  all: () => apiRequest<Record<string, unknown>>("/admin/settings"),
  updateGroup: (group: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/settings/${encodeURIComponent(group)}`, { method: "PATCH", body }),
  togglePayment: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/settings/payment-methods/${encodeURIComponent(id)}/toggle`, {
      method: "POST",
      body,
    }),
  toggleLocale: (code: string) =>
    apiRequest(`/admin/settings/locales/${encodeURIComponent(code)}/toggle`, { method: "POST" }),
  defaultLocale: (code: string) =>
    apiRequest(`/admin/settings/locales/${encodeURIComponent(code)}/default`, { method: "POST" }),
  toggleCurrency: (code: string) =>
    apiRequest(`/admin/settings/currencies/${encodeURIComponent(code)}/toggle`, { method: "POST" }),
  defaultCurrency: (code: string) =>
    apiRequest(`/admin/settings/currencies/${encodeURIComponent(code)}/default`, { method: "POST" }),
  setRate: (code: string, rate: number) =>
    apiRequest(`/admin/settings/currencies/${encodeURIComponent(code)}/rate`, {
      method: "PATCH",
      body: { rate },
    }),
  refreshFx: () => apiRequest("/admin/settings/fx/refresh", { method: "POST" }),
};

export const searchAdminApi = {
  global: (q: string) =>
    apiRequest<Record<string, unknown>>(`/admin/search/global${qs({ q })}`),
};

export const notificationSettingsAdminApi = {
  list: () => apiRequest("/admin/notification-settings"),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/notification-settings/rules/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  toggleRule: (id: string) =>
    apiRequest(`/admin/notification-settings/rules/${encodeURIComponent(id)}/toggle`, { method: "POST" }),
  toggleChannel: (id: string, channel: string) =>
    apiRequest(
      `/admin/notification-settings/rules/${encodeURIComponent(id)}/channels/${encodeURIComponent(channel)}/toggle`,
      { method: "POST" },
    ),
  updateChannels: (body: Record<string, unknown>) =>
    apiRequest("/admin/notification-settings/channels", { method: "PATCH", body }),
  updateQuietHours: (body: Record<string, unknown>) =>
    apiRequest("/admin/notification-settings/quiet-hours", { method: "PATCH", body }),
  updateDigest: (body: Record<string, unknown>) =>
    apiRequest("/admin/notification-settings/digest", { method: "PATCH", body }),
  test: (channel: string) =>
    apiRequest(`/admin/notification-settings/test/${encodeURIComponent(channel)}`, { method: "POST" }),
};

export type DownloadOfferConfig = {
  enabled: boolean;
  percent: number;
  label: string;
  validDays: number;
};

export const appConfigAdminApi = {
  get: () => apiRequest<Record<string, unknown>>("/admin/app/config"),
  update: (body: Record<string, unknown>) =>
    apiRequest("/admin/app/config", { method: "PATCH", body }),
};

export const appConfigStoreApi = {
  get: () => apiRequest<Record<string, unknown>>("/store/app/config"),
  claimDownloadOffer: () =>
    apiRequest<{
      code: string;
      label: string;
      pct: number;
      alreadyClaimed: boolean;
      expiresAt?: string | null;
    }>("/store/app/download-offer/claim", { method: "POST" }),
};
