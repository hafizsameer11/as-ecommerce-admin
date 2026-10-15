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

export const bannersAdminApi = {
  list: (query: { page?: number; pageSize?: number; placement?: string; status?: string } = {}) =>
    apiRequestWithMeta(`/admin/banners${qs({ pageSize: 100, ...query })}`),
  create: (body: Record<string, unknown>) =>
    apiRequest("/admin/banners", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/banners/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  setStatus: (id: string, status: string) =>
    apiRequest(`/admin/banners/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } }),
  duplicate: (id: string) =>
    apiRequest(`/admin/banners/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  remove: (id: string) =>
    apiRequest(`/admin/banners/${encodeURIComponent(id)}`, { method: "DELETE" }),
  reorder: (placement: string, ids: string[]) =>
    apiRequest("/admin/banners/reorder", { method: "POST", body: { placement, ids } }),
  move: (id: string, direction: "up" | "down") =>
    apiRequest(`/admin/banners/${encodeURIComponent(id)}/move`, { method: "POST", body: { direction } }),
};

export const announcementsAdminApi = {
  list: (query: { page?: number; pageSize?: number; status?: string; placement?: string } = {}) =>
    apiRequestWithMeta(`/admin/announcements${qs({ pageSize: 100, ...query })}`),
  create: (body: Record<string, unknown> = {}) =>
    apiRequest("/admin/announcements", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/announcements/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  setStatus: (id: string, status: string) =>
    apiRequest(`/admin/announcements/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } }),
  duplicate: (id: string) =>
    apiRequest(`/admin/announcements/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  remove: (id: string) =>
    apiRequest(`/admin/announcements/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const faqsAdminApi = {
  categories: () => apiRequest("/admin/content/faqs/categories"),
  createCategory: (body: Record<string, unknown>) =>
    apiRequest("/admin/content/faqs/categories", { method: "POST", body }),
  updateCategory: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/content/faqs/categories/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  removeCategory: (id: string) =>
    apiRequest(`/admin/content/faqs/categories/${encodeURIComponent(id)}`, { method: "DELETE" }),
  moveCategory: (id: string, dir: -1 | 1) =>
    apiRequest(`/admin/content/faqs/categories/${encodeURIComponent(id)}/move`, {
      method: "POST",
      body: { dir },
    }),
  items: (query: { page?: number; pageSize?: number; categoryId?: string; status?: string } = {}) =>
    apiRequestWithMeta(`/admin/content/faqs${qs({ pageSize: 200, ...query })}`),
  createItem: (body: Record<string, unknown>) =>
    apiRequest("/admin/content/faqs", { method: "POST", body }),
  updateItem: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/content/faqs/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  removeItem: (id: string) =>
    apiRequest(`/admin/content/faqs/${encodeURIComponent(id)}`, { method: "DELETE" }),
  duplicateItem: (id: string) =>
    apiRequest(`/admin/content/faqs/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  setItemStatus: (id: string, status: string) =>
    apiRequest(`/admin/content/faqs/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } }),
  toggleFeatured: (id: string) =>
    apiRequest(`/admin/content/faqs/${encodeURIComponent(id)}/feature`, { method: "POST" }),
  moveItem: (id: string, dir: -1 | 1) =>
    apiRequest(`/admin/content/faqs/${encodeURIComponent(id)}/move`, { method: "POST", body: { dir } }),
};

export const blogAdminApi = {
  list: (query: { page?: number; pageSize?: number; status?: string } = {}) =>
    apiRequestWithMeta(`/admin/content/blog${qs({ pageSize: 50, ...query })}`),
  categories: () => apiRequest("/admin/content/blog/categories"),
  createCategory: (body: Record<string, unknown>) =>
    apiRequest("/admin/content/blog/categories", { method: "POST", body }),
  updateCategory: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/content/blog/categories/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  removeCategory: (id: string) =>
    apiRequest(`/admin/content/blog/categories/${encodeURIComponent(id)}`, { method: "DELETE" }),
  authors: () => apiRequest("/admin/content/blog/authors"),
  create: (body: Record<string, unknown>) =>
    apiRequest("/admin/content/blog", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/content/blog/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  setStatus: (id: string, status: string, scheduledFor?: string) =>
    apiRequest(`/admin/content/blog/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status, scheduledFor },
    }),
  toggleFeatured: (id: string) =>
    apiRequest(`/admin/content/blog/${encodeURIComponent(id)}/feature`, { method: "POST" }),
  remove: (id: string) =>
    apiRequest(`/admin/content/blog/${encodeURIComponent(id)}`, { method: "DELETE" }),
  duplicate: (id: string) =>
    apiRequest(`/admin/content/blog/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
};

export const pagesAdminApi = {
  list: (query: { page?: number; pageSize?: number; status?: string } = {}) =>
    apiRequestWithMeta(`/admin/content/pages${qs({ pageSize: 50, ...query })}`),
  get: (id: string) => apiRequest(`/admin/content/pages/${encodeURIComponent(id)}`),
  create: (body: Record<string, unknown>) =>
    apiRequest("/admin/content/pages", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/content/pages/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  setStatus: (id: string, status: string, scheduledFor?: string) =>
    apiRequest(`/admin/content/pages/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status, scheduledFor },
    }),
  remove: (id: string) =>
    apiRequest(`/admin/content/pages/${encodeURIComponent(id)}`, { method: "DELETE" }),
  duplicate: (id: string) =>
    apiRequest(`/admin/content/pages/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  addBlock: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/content/pages/${encodeURIComponent(id)}/blocks`, { method: "POST", body }),
  updateBlock: (id: string, blockId: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/content/pages/${encodeURIComponent(id)}/blocks/${encodeURIComponent(blockId)}`, {
      method: "PATCH",
      body,
    }),
  removeBlock: (id: string, blockId: string) =>
    apiRequest(`/admin/content/pages/${encodeURIComponent(id)}/blocks/${encodeURIComponent(blockId)}`, {
      method: "DELETE",
    }),
  moveBlock: (id: string, blockId: string, dir: -1 | 1) =>
    apiRequest(`/admin/content/pages/${encodeURIComponent(id)}/blocks/${encodeURIComponent(blockId)}/move`, {
      method: "POST",
      body: { dir },
    }),
};

export const ticketsAdminApi = {
  list: (query: { page?: number; pageSize?: number; tab?: string; q?: string } = {}) =>
    apiRequestWithMeta(`/admin/tickets${qs({ pageSize: 100, ...query })}`),
  get: (id: string) => apiRequest(`/admin/tickets/${encodeURIComponent(id)}`),
  reply: (id: string, body: { body: string; internal?: boolean }) =>
    apiRequest(`/admin/tickets/${encodeURIComponent(id)}/reply`, { method: "POST", body }),
  setStatus: (id: string, status: string) =>
    apiRequest(`/admin/tickets/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } }),
  setPriority: (id: string, priority: string) =>
    apiRequest(`/admin/tickets/${encodeURIComponent(id)}/priority`, { method: "PATCH", body: { priority } }),
  assign: (id: string, adminId: string | null) =>
    apiRequest(`/admin/tickets/${encodeURIComponent(id)}/assign`, { method: "POST", body: { adminId } }),
  addTag: (id: string, tag: string) =>
    apiRequest(`/admin/tickets/${encodeURIComponent(id)}/tags`, { method: "POST", body: { tag } }),
  removeTag: (id: string, tag: string) =>
    apiRequest(`/admin/tickets/${encodeURIComponent(id)}/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE",
    }),
};

export const messagingAdminApi = {
  templates: (query: { page?: number; pageSize?: number } = {}) =>
    apiRequestWithMeta(`/admin/messaging/templates${qs({ pageSize: 100, ...query })}`),
  updateTemplate: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/messaging/templates/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  setTemplateStatus: (id: string, status: string) =>
    apiRequest(`/admin/messaging/templates/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status },
    }),
  duplicateTemplate: (id: string) =>
    apiRequest(`/admin/messaging/templates/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  resetTemplate: (id: string) =>
    apiRequest(`/admin/messaging/templates/${encodeURIComponent(id)}/reset`, { method: "POST" }),
  removeTemplate: (id: string) =>
    apiRequest(`/admin/messaging/templates/${encodeURIComponent(id)}`, { method: "DELETE" }),
  blasts: (query: { page?: number; pageSize?: number; status?: string } = {}) =>
    apiRequestWithMeta(`/admin/messaging/blasts${qs({ pageSize: 100, ...query })}`),
  createBlast: (body: Record<string, unknown>) =>
    apiRequest("/admin/messaging/blasts", { method: "POST", body }),
  updateBlast: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/messaging/blasts/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  scheduleBlast: (id: string, body: Record<string, unknown> = {}) =>
    apiRequest(`/admin/messaging/blasts/${encodeURIComponent(id)}/schedule`, { method: "POST", body }),
  unscheduleBlast: (id: string) =>
    apiRequest(`/admin/messaging/blasts/${encodeURIComponent(id)}/unschedule`, { method: "POST" }),
  sendBlastNow: (id: string) =>
    apiRequest(`/admin/messaging/blasts/${encodeURIComponent(id)}/send-now`, { method: "POST" }),
  removeBlast: (id: string) =>
    apiRequest(`/admin/messaging/blasts/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const campaignsAdminApi = {
  list: (query: { page?: number; pageSize?: number; status?: string; channel?: string } = {}) =>
    apiRequestWithMeta(`/admin/campaigns${qs({ pageSize: 100, ...query })}`),
  get: (id: string) => apiRequest(`/admin/campaigns/${encodeURIComponent(id)}`),
  create: (body: Record<string, unknown>) =>
    apiRequest("/admin/campaigns", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/campaigns/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  duplicate: (id: string) =>
    apiRequest(`/admin/campaigns/${encodeURIComponent(id)}/duplicate`, { method: "POST" }),
  togglePin: (id: string) =>
    apiRequest(`/admin/campaigns/${encodeURIComponent(id)}/pin`, { method: "POST" }),
  setStatus: (id: string, body: { action: string; scheduledAt?: string }) =>
    apiRequest(`/admin/campaigns/${encodeURIComponent(id)}/status`, { method: "PATCH", body }),
  sendNow: (id: string) =>
    apiRequest(`/admin/campaigns/${encodeURIComponent(id)}/send-now`, { method: "POST" }),
  remove: (id: string) =>
    apiRequest(`/admin/campaigns/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const seoAdminApi = {
  config: () => apiRequest<Record<string, unknown>>("/admin/seo/config"),
  updateConfig: (body: Record<string, unknown>) =>
    apiRequest("/admin/seo/config", { method: "PATCH", body }),
  audit: () => apiRequest("/admin/seo/audit"),
  pages: (query: { page?: number; pageSize?: number; type?: string } = {}) =>
    apiRequestWithMeta(`/admin/seo/pages${qs({ pageSize: 200, ...query })}`),
  createPage: (body: Record<string, unknown>) =>
    apiRequest("/admin/seo/pages", { method: "POST", body }),
  updatePage: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/seo/pages/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  removePage: (id: string) =>
    apiRequest(`/admin/seo/pages/${encodeURIComponent(id)}`, { method: "DELETE" }),
  redirects: (query: { page?: number; pageSize?: number; enabled?: string } = {}) =>
    apiRequestWithMeta(`/admin/seo/redirects${qs({ pageSize: 200, ...query })}`),
  addRedirect: (body: Record<string, unknown>) =>
    apiRequest("/admin/seo/redirects", { method: "POST", body }),
  updateRedirect: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/seo/redirects/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  toggleRedirect: (id: string) =>
    apiRequest(`/admin/seo/redirects/${encodeURIComponent(id)}/toggle`, { method: "POST" }),
  removeRedirect: (id: string) =>
    apiRequest(`/admin/seo/redirects/${encodeURIComponent(id)}`, { method: "DELETE" }),
  sitemap: () => apiRequestWithMeta("/admin/seo/sitemap"),
  addSitemap: (body: Record<string, unknown>) =>
    apiRequest("/admin/seo/sitemap", { method: "POST", body }),
  updateSitemap: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/seo/sitemap/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  toggleSitemap: (id: string) =>
    apiRequest(`/admin/seo/sitemap/${encodeURIComponent(id)}/toggle`, { method: "POST" }),
  removeSitemap: (id: string) =>
    apiRequest(`/admin/seo/sitemap/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const mediaAdminApi = {
  list: (query: {
    page?: number;
    pageSize?: number;
    folder?: string;
    type?: string;
    starred?: string;
    q?: string;
  } = {}) => apiRequestWithMeta(`/admin/media${qs({ pageSize: 100, ...query })}`),
  upload: (form: FormData) =>
    apiRequest("/admin/media", { method: "POST", rawBody: form }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest(`/admin/media/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  star: (id: string) =>
    apiRequest(`/admin/media/${encodeURIComponent(id)}/star`, { method: "POST" }),
  remove: (id: string, force = false) =>
    apiRequest(`/admin/media/${encodeURIComponent(id)}${qs({ force: force ? "true" : undefined })}`, {
      method: "DELETE",
    }),
  move: (ids: string[], folder: string) =>
    apiRequest("/admin/media/move", { method: "POST", body: { ids, folder } }),
  bulkDelete: (ids: string[], force = false) =>
    apiRequest("/admin/media/bulk-delete", { method: "POST", body: { ids, force } }),
};
