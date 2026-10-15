import { create } from "zustand";
import { seoAdminApi } from "@/lib/api/cms";

export type PageType = "home" | "shop" | "category" | "product" | "collection" | "concierge" | "policy" | "custom";
export type IndexPolicy = "index_follow" | "noindex_follow" | "noindex_nofollow";

export type SeoPage = {
  id: string;
  path: string;
  type: PageType;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  canonical?: string;
  indexPolicy: IndexPolicy;
  keywords: string[];
  schemaType?: "WebSite" | "Organization" | "Product" | "BreadcrumbList" | "FAQPage" | "Article" | "CollectionPage";
  updatedAt: string;
  impressions30d: number;
  clicks30d: number;
  avgPosition: number;
};

export type RedirectStatus = 301 | 302 | 307 | 410;
export type Redirect = {
  id: string;
  from: string;
  to: string;
  status: RedirectStatus;
  hits: number;
  lastHitAt?: string;
  enabled: boolean;
  createdAt: string;
  note?: string;
};

export type SitemapEntry = {
  id: string;
  loc: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
  included: boolean;
};

export type GlobalConfig = {
  defaultTitleTemplate: string;
  defaultDescription: string;
  siteName: string;
  siteUrl: string;
  robotsTxt: string;
  ogImageDefault: string;
  twitterHandle: string;
  gaMeasurementId: string;
  gscVerification: string;
  autoGenerateSitemap: boolean;
  submitToBing: boolean;
};

const DEFAULT_CONFIG: GlobalConfig = {
  defaultTitleTemplate: "%s · ASL ORIGINALS",
  defaultDescription:
    "Curated luxury footwear, fashion, fragrance and accessories - shop the world's most sought-after brands with white-glove concierge sourcing.",
  siteName: "ASL ORIGINALS",
  siteUrl: "https://asloriginals.online",
  robotsTxt: `User-agent: *
Allow: /

Disallow: /account
Disallow: /checkout
Disallow: /admin

Sitemap: https://asloriginals.online/sitemap.xml`,
  ogImageDefault: "https://asloriginals.online/og/default.jpg",
  twitterHandle: "@asloriginals",
  gaMeasurementId: "",
  gscVerification: "",
  autoGenerateSitemap: true,
  submitToBing: false,
};

function mapConfig(c: Record<string, unknown> | null | undefined): GlobalConfig {
  if (!c) return DEFAULT_CONFIG;
  return {
    defaultTitleTemplate: String(c.defaultTitleTemplate ?? DEFAULT_CONFIG.defaultTitleTemplate),
    defaultDescription: String(c.defaultDescription ?? DEFAULT_CONFIG.defaultDescription),
    siteName: String(c.siteName ?? DEFAULT_CONFIG.siteName),
    siteUrl: String(c.siteUrl ?? DEFAULT_CONFIG.siteUrl),
    robotsTxt: String(c.robotsTxt ?? DEFAULT_CONFIG.robotsTxt),
    ogImageDefault: String(c.ogImageDefault ?? DEFAULT_CONFIG.ogImageDefault),
    twitterHandle: String(c.twitterHandle ?? DEFAULT_CONFIG.twitterHandle),
    gaMeasurementId: String(c.gaMeasurementId ?? ""),
    gscVerification: String(c.gscVerification ?? ""),
    autoGenerateSitemap: c.autoGenerateSitemap !== false,
    submitToBing: !!c.submitToBing,
  };
}

function mapPage(p: Record<string, unknown>): SeoPage {
  return {
    id: String(p.id),
    path: String(p.path ?? "/"),
    type: (p.type as PageType) || "custom",
    title: String(p.title ?? ""),
    description: String(p.description ?? ""),
    ogTitle: p.ogTitle ? String(p.ogTitle) : undefined,
    ogDescription: p.ogDescription ? String(p.ogDescription) : undefined,
    ogImageUrl: p.ogImageUrl ? String(p.ogImageUrl) : undefined,
    canonical: p.canonical ? String(p.canonical) : undefined,
    indexPolicy: (p.indexPolicy as IndexPolicy) || "index_follow",
    keywords: Array.isArray(p.keywords) ? p.keywords.map(String) : [],
    schemaType: (p.schemaType as SeoPage["schemaType"]) || undefined,
    updatedAt: p.updatedAt ? new Date(p.updatedAt as string).toISOString() : new Date().toISOString(),
    impressions30d: Number(p.impressions30d ?? 0),
    clicks30d: Number(p.clicks30d ?? 0),
    avgPosition: Number(p.avgPosition ?? 0),
  };
}

function mapRedirect(r: Record<string, unknown>): Redirect {
  return {
    id: String(r.id),
    from: String(r.from ?? ""),
    to: String(r.to ?? ""),
    status: (Number(r.status) as RedirectStatus) || 301,
    hits: Number(r.hits ?? 0),
    lastHitAt: r.lastHitAt ? new Date(r.lastHitAt as string).toISOString() : undefined,
    enabled: r.enabled !== false,
    createdAt: r.createdAt ? new Date(r.createdAt as string).toISOString() : new Date().toISOString(),
    note: r.note ? String(r.note) : undefined,
  };
}

function mapSitemap(s: Record<string, unknown>): SitemapEntry {
  return {
    id: String(s.id),
    loc: String(s.loc ?? ""),
    changefreq: (s.changefreq as SitemapEntry["changefreq"]) || "weekly",
    priority: Number(s.priority ?? 0.5),
    included: s.included !== false,
  };
}

type State = {
  config: GlobalConfig;
  pages: SeoPage[];
  redirects: Redirect[];
  sitemap: SitemapEntry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  updateConfig: (patch: Partial<GlobalConfig>) => Promise<void>;
  updatePage: (id: string, patch: Partial<SeoPage>) => Promise<void>;
  addRedirect: (r: Omit<Redirect, "id" | "hits" | "createdAt">) => Promise<void>;
  toggleRedirect: (id: string) => Promise<void>;
  removeRedirect: (id: string) => Promise<void>;
  toggleSitemap: (id: string) => Promise<void>;
  updateSitemap: (id: string, patch: Partial<SitemapEntry>) => Promise<void>;
  reset: () => void;
};

export const useSeo = create<State>()((set, get) => ({
  config: DEFAULT_CONFIG,
  pages: [],
  redirects: [],
  sitemap: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const [config, pagesRes, redirectsRes, sitemapRes] = await Promise.all([
        seoAdminApi.config(),
        seoAdminApi.pages({ pageSize: 200 }),
        seoAdminApi.redirects({ pageSize: 200 }),
        seoAdminApi.sitemap(),
      ]);
      const sitemapData = Array.isArray(sitemapRes.data)
        ? sitemapRes.data
        : (sitemapRes.data as { entries?: unknown[] })?.entries ?? [];
      set({
        config: mapConfig(config as Record<string, unknown>),
        pages: (pagesRes.data as Record<string, unknown>[]).map(mapPage),
        redirects: (redirectsRes.data as Record<string, unknown>[]).map(mapRedirect),
        sitemap: (sitemapData as Record<string, unknown>[]).map(mapSitemap),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[seo] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  updateConfig: async (patch) => {
    set((st) => ({ config: { ...st.config, ...patch } }));
    try {
      const res = (await seoAdminApi.updateConfig(patch)) as Record<string, unknown>;
      const updated = mapConfig((res.after ?? res) as Record<string, unknown>);
      set({ config: updated });
    } catch (err) {
      console.warn("[seo] config sync", err);
      await get().hydrate();
    }
  },
  updatePage: async (id, patch) => {
    set((st) => ({
      pages: st.pages.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
      ),
    }));
    try {
      const res = (await seoAdminApi.updatePage(id, patch as Record<string, unknown>)) as Record<string, unknown>;
      const updated = mapPage((res.after ?? res) as Record<string, unknown>);
      set((st) => ({ pages: st.pages.map((p) => (p.id === id ? updated : p)) }));
    } catch (err) {
      console.warn("[seo] page sync", err);
      await get().hydrate();
    }
  },
  addRedirect: async (r) => {
    try {
      const created = mapRedirect(
        (await seoAdminApi.addRedirect({
          from: r.from,
          to: r.to,
          status: r.status,
          enabled: r.enabled,
          note: r.note ?? null,
        })) as Record<string, unknown>,
      );
      set((st) => ({ redirects: [created, ...st.redirects] }));
    } catch (err) {
      console.warn("[seo] add redirect", err);
    }
  },
  toggleRedirect: async (id) => {
    set((st) => ({
      redirects: st.redirects.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    }));
    try {
      const updated = mapRedirect((await seoAdminApi.toggleRedirect(id)) as Record<string, unknown>);
      set((st) => ({ redirects: st.redirects.map((r) => (r.id === id ? updated : r)) }));
    } catch (err) {
      console.warn("[seo] toggle redirect", err);
      await get().hydrate();
    }
  },
  removeRedirect: async (id) => {
    await seoAdminApi.removeRedirect(id);
    set((st) => ({ redirects: st.redirects.filter((r) => r.id !== id) }));
  },
  toggleSitemap: async (id) => {
    set((st) => ({
      sitemap: st.sitemap.map((s) => (s.id === id ? { ...s, included: !s.included } : s)),
    }));
    try {
      const updated = mapSitemap((await seoAdminApi.toggleSitemap(id)) as Record<string, unknown>);
      set((st) => ({ sitemap: st.sitemap.map((s) => (s.id === id ? updated : s)) }));
    } catch (err) {
      console.warn("[seo] toggle sitemap", err);
      await get().hydrate();
    }
  },
  updateSitemap: async (id, patch) => {
    set((st) => ({
      sitemap: st.sitemap.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
    try {
      const updated = mapSitemap(
        (await seoAdminApi.updateSitemap(id, patch as Record<string, unknown>)) as Record<string, unknown>,
      );
      set((st) => ({ sitemap: st.sitemap.map((s) => (s.id === id ? updated : s)) }));
    } catch (err) {
      console.warn("[seo] sitemap sync", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));

/* ============ audit helpers ============ */

export type AuditSeverity = "critical" | "warning" | "info";
export type AuditFinding = {
  id: string;
  severity: AuditSeverity;
  page: string;
  issue: string;
  hint: string;
};

export function auditPage(p: SeoPage): AuditFinding[] {
  const out: AuditFinding[] = [];
  const push = (severity: AuditSeverity, issue: string, hint: string) =>
    out.push({ id: `${p.id}-${issue}`, severity, page: p.path, issue, hint });

  if (!p.title) push("critical", "Missing title", "Add a <title>. Aim for 40 - 60 characters.");
  else if (p.title.length < 30) push("warning", "Title too short", `${p.title.length} chars. Recommended 40 - 60.`);
  else if (p.title.length > 65) push("warning", "Title too long", `${p.title.length} chars. Google truncates around 60.`);

  if (!p.description) push("critical", "Missing description", "Add a meta description of 120 - 160 characters.");
  else if (p.description.length < 80) push("warning", "Description too short", `${p.description.length} chars. Aim for 120 - 160.`);
  else if (p.description.length > 165) push("warning", "Description too long", `${p.description.length} chars. Google truncates around 160.`);

  if (!p.ogImageUrl) push("warning", "Missing OG image", "Add an og:image for richer social previews.");
  if (!p.canonical) push("info", "No canonical URL", "Add a canonical to avoid duplicate content.");
  if (p.type === "product" && p.schemaType !== "Product") push("warning", "Missing Product schema", "Attach Product structured data for rich results.");
  if (p.keywords.length === 0 && (p.type === "category" || p.type === "collection")) {
    push("info", "No focus keywords", "Add 3 - 5 focus keywords to guide content.");
  }
  return out;
}
