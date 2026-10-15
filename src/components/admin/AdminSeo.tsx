import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Empty, Toolbar } from "./ui";
import {
  useSeo, auditPage, type SeoPage, type Redirect, type RedirectStatus,
  type IndexPolicy, type PageType, type SitemapEntry, type AuditFinding,
} from "@/lib/seo-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Search, Globe, LinkIcon, FileCode2, Gauge, X, Check, Copy, Trash2, Plus,
  Download, ExternalLink, AlertTriangle, Info, ShieldCheck, TrendingUp,
  Sparkles, Save, RotateCcw, Play, Pause, Home, ShoppingBag, FolderTree,
  Package, Layers, Newspaper, ScrollText, PenLine, ChevronRight, Eye,
} from "lucide-react";

type Tab = "overview" | "pages" | "redirects" | "sitemap" | "settings";

const TYPE_META: Record<PageType, { label: string; Icon: typeof Home; tone: string }> = {
  home: { label: "Home", Icon: Home, tone: "bg-slate-100 text-slate-700 border-slate-200" },
  shop: { label: "Shop", Icon: ShoppingBag, tone: "bg-sky-50 text-sky-700 border-sky-200" },
  category: { label: "Category", Icon: FolderTree, tone: "bg-ink text-white border-ink" },
  product: { label: "Product", Icon: Package, tone: "bg-amber-50 text-amber-700 border-amber-200" },
  collection: { label: "Collection", Icon: Layers, tone: "bg-violet-50 text-violet-700 border-violet-200" },
  concierge: { label: "Concierge", Icon: Sparkles, tone: "bg-gold/15 text-gold-deep border-gold/30" },
  policy: { label: "Policy", Icon: ScrollText, tone: "bg-slate-50 text-slate-600 border-slate-200" },
  custom: { label: "Custom", Icon: Newspaper, tone: "bg-black/[0.04] text-ink border-black/10" },
};

const INDEX_META: Record<IndexPolicy, { label: string; tone: string }> = {
  index_follow: { label: "Index · Follow", tone: "text-ink" },
  noindex_follow: { label: "No-index · Follow", tone: "text-amber-700" },
  noindex_nofollow: { label: "No-index · No-follow", tone: "text-rose-600" },
};

export function AdminSeo() {
  const hydrate = useSeo((s) => s.hydrate);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="SEO"
        subtitle="Search visibility, meta editor, redirects, sitemap and structured data."
      />
      <div className="flex items-center gap-1 border-b border-black/[0.08] mb-5 overflow-x-auto no-scrollbar">
        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}><Gauge className="h-3.5 w-3.5" /> Overview</TabBtn>
        <TabBtn active={tab === "pages"} onClick={() => setTab("pages")}><PenLine className="h-3.5 w-3.5" /> Pages</TabBtn>
        <TabBtn active={tab === "redirects"} onClick={() => setTab("redirects")}><LinkIcon className="h-3.5 w-3.5" /> Redirects</TabBtn>
        <TabBtn active={tab === "sitemap"} onClick={() => setTab("sitemap")}><FileCode2 className="h-3.5 w-3.5" /> Sitemap & robots</TabBtn>
        <TabBtn active={tab === "settings"} onClick={() => setTab("settings")}><Globe className="h-3.5 w-3.5" /> Settings</TabBtn>
      </div>
      {tab === "overview" && <OverviewTab />}
      {tab === "pages" && <PagesTab />}
      {tab === "redirects" && <RedirectsTab />}
      {tab === "sitemap" && <SitemapTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
        active ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
      }`}>
      {children}
    </button>
  );
}

/* ============================ OVERVIEW ============================ */

function OverviewTab() {
  const { pages, redirects, sitemap } = useSeo();

  const allFindings: AuditFinding[] = useMemo(() => pages.flatMap(auditPage), [pages]);
  const kpis = useMemo(() => {
    const totalImp = pages.reduce((s, p) => s + p.impressions30d, 0);
    const totalClk = pages.reduce((s, p) => s + p.clicks30d, 0);
    const ctr = totalImp ? (totalClk / totalImp) * 100 : 0;
    const avgPos = pages.length ? pages.reduce((s, p) => s + p.avgPosition, 0) / pages.length : 0;
    const healthScore = pages.length
      ? Math.max(0, 100 - Math.round((allFindings.filter((f) => f.severity === "critical").length * 15 +
          allFindings.filter((f) => f.severity === "warning").length * 4 +
          allFindings.filter((f) => f.severity === "info").length * 1)))
      : 100;
    return { totalImp, totalClk, ctr, avgPos, healthScore };
  }, [pages, allFindings]);

  const topPages = [...pages].sort((a, b) => b.clicks30d - a.clicks30d).slice(0, 6);
  const bySeverity = {
    critical: allFindings.filter((f) => f.severity === "critical"),
    warning: allFindings.filter((f) => f.severity === "warning"),
    info: allFindings.filter((f) => f.severity === "info"),
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Impressions (30d)" value={kpis.totalImp.toLocaleString()} Icon={Eye} />
        <KPI label="Clicks (30d)" value={kpis.totalClk.toLocaleString()} sub={`${kpis.ctr.toFixed(2)}% CTR`} Icon={TrendingUp} tone="text-ink" />
        <KPI label="Avg. position" value={kpis.avgPos.toFixed(1)} sub="Lower is better" Icon={Gauge} />
        <KPI label="Health score" value={`${kpis.healthScore}/100`}
          sub={`${bySeverity.critical.length} critical · ${bySeverity.warning.length} warnings`}
          Icon={ShieldCheck}
          tone={kpis.healthScore >= 80 ? "text-ink" : kpis.healthScore >= 60 ? "text-amber-700" : "text-rose-600"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display font-bold text-[15px]">Top pages</div>
              <div className="text-[11.5px] text-muted-foreground">By clicks over the last 30 days</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {topPages.map((p) => {
              const ctr = p.impressions30d ? (p.clicks30d / p.impressions30d) * 100 : 0;
              const meta = TYPE_META[p.type];
              return (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-black/[0.04] last:border-b-0">
                  <div className={`h-7 w-7 rounded-md grid place-items-center border ${meta.tone} shrink-0`}>
                    <meta.Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[13px] truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground font-sans truncate">{p.path}</div>
                  </div>
                  <div className="text-right text-[11.5px] tabular-nums">
                    <div className="font-semibold">{p.clicks30d.toLocaleString()} <span className="text-muted-foreground font-normal">clicks</span></div>
                    <div className="text-muted-foreground">{ctr.toFixed(2)}% · pos {p.avgPosition.toFixed(1)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="font-display font-bold text-[15px] mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold" /> Health audit
          </div>
          <div className="space-y-2 text-[11.5px]">
            <AuditRow tone="rose" count={bySeverity.critical.length} label="Critical" />
            <AuditRow tone="amber" count={bySeverity.warning.length} label="Warnings" />
            <AuditRow tone="slate" count={bySeverity.info.length} label="Suggestions" />
          </div>
          <div className="border-t border-black/[0.06] my-3" />
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Recent findings</div>
          <div className="space-y-1.5 max-h-56 overflow-auto pr-1">
            {allFindings.slice(0, 8).map((f) => (
              <div key={f.id} className="flex items-start gap-2 text-[11.5px]">
                {f.severity === "critical" ? <AlertTriangle className="h-3.5 w-3.5 text-rose-600 mt-0.5 shrink-0" />
                  : f.severity === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  : <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />}
                <div className="min-w-0">
                  <div className="font-semibold">{f.issue}</div>
                  <div className="text-muted-foreground font-sans text-[10.5px] truncate">{f.page}</div>
                </div>
              </div>
            ))}
            {allFindings.length === 0 && (
              <div className="text-[11.5px] text-ink flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> No issues detected.</div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display font-bold text-[15px]">Indexing summary</div>
              <div className="text-[11.5px] text-muted-foreground">What's discoverable to search engines</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryStat label="Pages tracked" value={pages.length} />
            <SummaryStat label="In sitemap" value={sitemap.filter((s) => s.included).length} />
            <SummaryStat label="Active redirects" value={redirects.filter((r) => r.enabled).length} />
            <SummaryStat label="No-indexed" value={pages.filter((p) => p.indexPolicy !== "index_follow").length} />
          </div>
        </Card>
      </div>
    </>
  );
}

function AuditRow({ tone, count, label }: { tone: "rose" | "amber" | "slate"; count: number; label: string }) {
  const styles = tone === "rose"
    ? "bg-rose-50 border-rose-200 text-rose-700"
    : tone === "amber"
      ? "bg-amber-50 border-amber-200 text-amber-700"
      : "bg-slate-50 border-slate-200 text-slate-700";
  return (
    <div className={`rounded-md border px-3 py-2 flex items-center justify-between ${styles}`}>
      <span className="font-semibold">{label}</span>
      <span className="font-display text-[16px] tabular-nums">{count}</span>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-black/[0.08] bg-[#faf8f3] p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="font-display text-[22px] mt-1 tabular-nums">{value}</div>
    </div>
  );
}

/* ============================ PAGES ============================ */

function PagesTab() {
  const { pages, updatePage } = useSeo();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | PageType>("all");
  const [selectedId, setSelectedId] = useState<string | null>(pages[0]?.id ?? null);

  const list = useMemo(() => pages
    .filter((p) => typeFilter === "all" || p.type === typeFilter)
    .filter((p) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return [p.title, p.description, p.path].some((v) => v.toLowerCase().includes(query));
    })
    .sort((a, b) => b.clicks30d - a.clicks30d),
    [pages, typeFilter, q]);

  const selected = pages.find((p) => p.id === selectedId) ?? list[0];

  const exportCSV = () => downloadCSV("seo-pages.csv", pages.map((p) => ({
    Path: p.path, Type: p.type, Title: p.title, Description: p.description,
    Canonical: p.canonical ?? "", Index: p.indexPolicy,
    Impressions30d: p.impressions30d, Clicks30d: p.clicks30d, AvgPosition: p.avgPosition,
  })));

  return (
    <>
      <Toolbar>
        <div className="flex-1 min-w-[220px] max-w-md h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, description, path…"
            className="flex-1 bg-transparent outline-none text-[13px]" />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>
        <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
          <span className="text-muted-foreground text-[11px]">Type</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="bg-transparent outline-none pr-1">
            <option value="all">All types</option>
            {(Object.keys(TYPE_META) as PageType[]).map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
          </select>
        </div>
        <button onClick={exportCSV} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </Toolbar>

      {list.length === 0 ? (
        <Card><Empty title="No pages match" sub="Adjust filters or search." /></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-4">
          <div className="space-y-1.5 max-h-[720px] overflow-y-auto pr-1">
            {list.map((p) => {
              const meta = TYPE_META[p.type];
              const findings = auditPage(p);
              const critical = findings.filter((f) => f.severity === "critical").length;
              const warnings = findings.filter((f) => f.severity === "warning").length;
              const isSelected = selected?.id === p.id;
              return (
                <button key={p.id} onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    isSelected ? "border-ink bg-white shadow-sm" : "border-black/[0.08] bg-white hover:border-black/20"
                  }`}>
                  <div className="flex items-start gap-2">
                    <div className={`h-7 w-7 rounded-md grid place-items-center border ${meta.tone} shrink-0`}>
                      <meta.Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[12.5px] truncate">{p.title}</div>
                      <div className="text-[10.5px] text-muted-foreground font-sans truncate">{p.path}</div>
                    </div>
                    {(critical > 0 || warnings > 0) && (
                      <div className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0 ${critical > 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {critical + warnings}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && <PageEditor page={selected} onChange={(patch) => updatePage(selected.id, patch)} />}
        </div>
      )}
    </>
  );
}

function PageEditor({ page, onChange }: { page: SeoPage; onChange: (patch: Partial<SeoPage>) => void }) {
  const findings = auditPage(page);
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Meta editor</div>
            <div className="font-sans text-[12px] mt-0.5">{page.path}</div>
          </div>
          <a href={page.path} target="_blank" rel="noreferrer"
            className="h-8 px-2.5 rounded-md border border-black/10 bg-white text-[11.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
            <ExternalLink className="h-3 w-3" /> View page
          </a>
        </div>

        <div className="space-y-3">
          <TextField label="Title" value={page.title} onChange={(v) => onChange({ title: v })}
            counter={{ current: page.title.length, low: 30, high: 65 }} />
          <TextArea label="Meta description" value={page.description} onChange={(v) => onChange({ description: v })} rows={3}
            counter={{ current: page.description.length, low: 80, high: 165 }} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField label="OG title" value={page.ogTitle ?? ""} onChange={(v) => onChange({ ogTitle: v })} />
            <TextField label="OG image URL" value={page.ogImageUrl ?? ""} onChange={(v) => onChange({ ogImageUrl: v })} />
          </div>
          <TextArea label="OG description" value={page.ogDescription ?? ""} onChange={(v) => onChange({ ogDescription: v })} rows={2} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField label="Canonical URL" value={page.canonical ?? ""} onChange={(v) => onChange({ canonical: v })} />
            <SelectField label="Indexing" value={page.indexPolicy} onChange={(v) => onChange({ indexPolicy: v as IndexPolicy })}
              options={[
                { value: "index_follow", label: "Index, follow (default)" },
                { value: "noindex_follow", label: "No-index, follow" },
                { value: "noindex_nofollow", label: "No-index, no-follow" },
              ]} />
          </div>
          <KeywordEditor keywords={page.keywords} onChange={(v) => onChange({ keywords: v })} />
        </div>
      </Card>

      <Card>
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
          <Search className="h-3 w-3" /> Google preview
        </div>
        <div className="rounded-md border border-black/[0.08] bg-white p-3">
          <div className="text-[11px] text-muted-foreground truncate">{page.canonical ?? `https://asloriginals.online${page.path}`}</div>
          <div className="text-[#1a0dab] text-[16px] leading-tight mt-1 truncate hover:underline cursor-pointer" style={{ fontFamily: "var(--font-sans)" }}>
            {page.title || "Untitled page"}
          </div>
          <div className="text-[12.5px] text-[#4d5156] mt-1 line-clamp-2" style={{ fontFamily: "var(--font-sans)" }}>
            {page.description || "No description provided."}
          </div>
        </div>

        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 mt-4 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> Social share preview
        </div>
        <div className="rounded-md border border-black/[0.08] bg-white overflow-hidden">
          {page.ogImageUrl ? (
            <div className="aspect-[1.91/1] bg-black/[0.04] flex items-center justify-center text-[11px] text-muted-foreground font-sans truncate px-3">
              {page.ogImageUrl}
            </div>
          ) : (
            <div className="aspect-[1.91/1] bg-black/[0.04] flex items-center justify-center text-[11px] text-muted-foreground">No image</div>
          )}
          <div className="p-3 border-t border-black/[0.06]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">asloriginals.online</div>
            <div className="font-semibold text-[13px] mt-0.5 truncate">{page.ogTitle || page.title}</div>
            <div className="text-[11.5px] text-muted-foreground line-clamp-2">{page.ogDescription || page.description}</div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3" /> Audit ({findings.length})
        </div>
        {findings.length === 0 ? (
          <div className="text-[12px] text-ink flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> No issues on this page.</div>
        ) : (
          <div className="space-y-1.5">
            {findings.map((f) => (
              <div key={f.id} className="flex items-start gap-2 text-[12px]">
                {f.severity === "critical" ? <AlertTriangle className="h-3.5 w-3.5 text-rose-600 mt-0.5 shrink-0" />
                  : f.severity === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  : <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />}
                <div className="min-w-0">
                  <div className="font-semibold">{f.issue}</div>
                  <div className="text-[11px] text-muted-foreground">{f.hint}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Performance (30d)</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Impressions" value={page.impressions30d.toLocaleString()} />
          <MiniStat label="Clicks" value={page.clicks30d.toLocaleString()} />
          <MiniStat label="Avg. position" value={page.avgPosition.toFixed(1)} />
        </div>
      </Card>
    </div>
  );
}

function KeywordEditor({ keywords, onChange }: { keywords: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v || keywords.includes(v)) return;
    onChange([...keywords, v]);
    setInput("");
  };
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Focus keywords</div>
      <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-md border border-black/10 bg-white min-h-[38px]">
        {keywords.map((k) => (
          <span key={k} className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-black/[0.05] text-[11.5px] font-medium">
            {k}
            <button onClick={() => onChange(keywords.filter((x) => x !== k))} className="hover:text-rose-600"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add keyword and press Enter…"
          className="flex-1 min-w-[140px] bg-transparent outline-none text-[12.5px]" />
      </div>
    </div>
  );
}

/* ============================ REDIRECTS ============================ */

function RedirectsTab() {
  const { redirects, addRedirect, toggleRedirect, removeRedirect } = useSeo();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RedirectStatus>("all");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ from: string; to: string; status: RedirectStatus; note: string; enabled: boolean }>({
    from: "", to: "", status: 301, note: "", enabled: true,
  });

  const list = useMemo(() => redirects
    .filter((r) => statusFilter === "all" || r.status === statusFilter)
    .filter((r) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return [r.from, r.to, r.note ?? ""].some((v) => v.toLowerCase().includes(query));
    })
    .sort((a, b) => b.hits - a.hits),
    [redirects, statusFilter, q]);

  const save = () => {
    if (!draft.from || !draft.to) return;
    addRedirect(draft);
    setDraft({ from: "", to: "", status: 301, note: "", enabled: true });
    setCreating(false);
  };

  const exportCSV = () => downloadCSV("redirects.csv", redirects.map((r) => ({
    From: r.from, To: r.to, Status: r.status, Enabled: r.enabled ? "yes" : "no", Hits: r.hits, LastHit: r.lastHitAt ?? "",
  })));

  return (
    <>
      <Toolbar>
        <div className="flex-1 min-w-[220px] max-w-md h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search from / to path…"
            className="flex-1 bg-transparent outline-none text-[13px]" />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>
        <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
          <span className="text-muted-foreground text-[11px]">Type</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value === "all" ? "all" : Number(e.target.value) as RedirectStatus)} className="bg-transparent outline-none pr-1">
            <option value="all">All</option>
            <option value={301}>301 Permanent</option>
            <option value={302}>302 Temporary</option>
            <option value={307}>307 Preserve</option>
            <option value={410}>410 Gone</option>
          </select>
        </div>
        <button onClick={exportCSV} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
        <button onClick={() => setCreating(!creating)} className="ml-auto h-9 px-3 rounded-md bg-ink text-white text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-black">
          <Plus className="h-3.5 w-3.5" /> New redirect
        </button>
      </Toolbar>

      {creating && (
        <Card className="mb-3">
          <div className="font-display font-bold text-[14px] mb-2">New redirect</div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,140px] gap-2">
            <TextField label="From" value={draft.from} onChange={(v) => setDraft({ ...draft, from: v })} placeholder="/old-path" mono />
            <TextField label="To" value={draft.to} onChange={(v) => setDraft({ ...draft, to: v })} placeholder="/new-path" mono />
            <SelectField label="Status" value={String(draft.status)} onChange={(v) => setDraft({ ...draft, status: Number(v) as RedirectStatus })}
              options={[
                { value: "301", label: "301 Permanent" },
                { value: "302", label: "302 Temporary" },
                { value: "307", label: "307 Preserve" },
                { value: "410", label: "410 Gone" },
              ]} />
          </div>
          <div className="mt-2">
            <TextField label="Note (optional)" value={draft.note} onChange={(v) => setDraft({ ...draft, note: v })} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => setCreating(false)} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold hover:bg-black/[0.04]">Cancel</button>
            <button onClick={save} className="ml-auto h-8 px-3 rounded-md bg-ink text-white text-[12px] font-semibold hover:bg-black flex items-center gap-1"><Save className="h-3.5 w-3.5" /> Save redirect</button>
          </div>
        </Card>
      )}

      {list.length === 0 ? (
        <Card><Empty title="No redirects yet" sub="Add a redirect to preserve link equity when URLs change." /></Card>
      ) : (
        <div className="rounded-lg border border-black/[0.08] bg-white overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-[#faf8f3] text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th>From</Th>
                <Th>To</Th>
                <Th>Status</Th>
                <Th>Hits</Th>
                <Th>Last hit</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-black/[0.05] hover:bg-black/[0.015]">
                  <Td><code className="font-sans text-[12px]">{r.from}</code>
                    {r.note && <div className="text-[10.5px] text-muted-foreground mt-0.5">{r.note}</div>}
                  </Td>
                  <Td className="text-muted-foreground"><ChevronRight className="inline h-3 w-3 mr-1" /><code className="font-sans text-[12px] text-ink">{r.to}</code></Td>
                  <Td><StatusChip status={r.status} enabled={r.enabled} /></Td>
                  <Td className="tabular-nums">{r.hits.toLocaleString()}</Td>
                  <Td className="text-muted-foreground">{r.lastHitAt ? new Date(r.lastHitAt).toLocaleDateString() : " - "}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <button onClick={() => toggleRedirect(r.id)}
                      className={`h-7 px-2 rounded-md border text-[11px] font-semibold mr-1 inline-flex items-center gap-1 ${
                        r.enabled ? "border-amber-200 bg-amber-50 text-amber-700" : "border-border bg-muted text-ink"
                      }`}>
                      {r.enabled ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Enable</>}
                    </button>
                    <button onClick={() => { if (confirm(`Delete redirect ${r.from}?`)) removeRedirect(r.id); }}
                      className="h-7 px-2 rounded-md border border-black/10 bg-white text-rose-600 text-[11px] font-semibold hover:bg-rose-50 inline-flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatusChip({ status, enabled }: { status: RedirectStatus; enabled: boolean }) {
  const tone = !enabled
    ? "bg-slate-100 text-slate-500 border-slate-200"
    : status === 301 ? "bg-ink text-white border-ink"
    : status === 302 ? "bg-sky-50 text-sky-700 border-sky-200"
    : status === 307 ? "bg-violet-50 text-violet-700 border-violet-200"
    : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${tone}`}>
      {status}
      {!enabled && <span className="text-[9px] uppercase tracking-wider">Paused</span>}
    </span>
  );
}

/* ============================ SITEMAP ============================ */

function SitemapTab() {
  const { sitemap, toggleSitemap, updateSitemap, config } = useSeo();
  const included = sitemap.filter((s) => s.included);

  const copyXml = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
      included.map((s) => `  <url>\n    <loc>${s.loc}</loc>\n    <changefreq>${s.changefreq}</changefreq>\n    <priority>${s.priority.toFixed(1)}</priority>\n  </url>`).join("\n")
    }\n</urlset>`;
    if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(xml);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-display font-bold text-[15px]">Sitemap entries</div>
            <div className="text-[11.5px] text-muted-foreground">{included.length} of {sitemap.length} URLs included</div>
          </div>
          <button onClick={copyXml} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copy XML
          </button>
        </div>

        <div className="rounded-lg border border-black/[0.08] bg-white overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-[#faf8f3] text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th className="w-[52px]">Include</Th>
                <Th>URL</Th>
                <Th className="w-[130px]">Change freq</Th>
                <Th className="w-[110px]">Priority</Th>
              </tr>
            </thead>
            <tbody>
              {sitemap.map((s) => <SitemapRow key={s.id} entry={s} onToggle={() => toggleSitemap(s.id)} onUpdate={(patch) => updateSitemap(s.id, patch)} />)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div className="font-display font-bold text-[14px]">robots.txt</div>
            <a href={`${config.siteUrl}/robots.txt`} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground hover:text-ink flex items-center gap-1"><ExternalLink className="h-3 w-3" /> View</a>
          </div>
          <pre className="text-[11.5px] font-sans bg-[#faf8f3] rounded-md border border-black/[0.06] p-3 whitespace-pre-wrap max-h-72 overflow-auto">{config.robotsTxt}</pre>
          <div className="text-[10.5px] text-muted-foreground mt-2">Edit in Settings › robots.txt</div>
        </Card>

        <Card>
          <div className="font-display font-bold text-[14px] mb-2">Sitemap URL</div>
          <div className="flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 h-9 text-[12px] font-sans">
            <span className="truncate flex-1">{config.siteUrl}/sitemap.xml</span>
            <button onClick={() => { if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(`${config.siteUrl}/sitemap.xml`); }}
              className="text-muted-foreground hover:text-ink"><Copy className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="h-8 rounded-md border border-black/10 bg-white text-[11.5px] font-semibold hover:bg-black/[0.04] flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Submit to Google
            </button>
            <button className="h-8 rounded-md border border-black/10 bg-white text-[11.5px] font-semibold hover:bg-black/[0.04] flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Submit to Bing
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SitemapRow({ entry, onToggle, onUpdate }: {
  entry: SitemapEntry;
  onToggle: () => void;
  onUpdate: (patch: Partial<SitemapEntry>) => void;
}) {
  return (
    <tr className="border-t border-black/[0.05] hover:bg-black/[0.015]">
      <Td>
        <button onClick={onToggle}
          className={`h-5 w-5 rounded border grid place-items-center transition-colors ${
            entry.included ? "bg-ink border-ink text-white" : "bg-white border-black/20"
          }`}>
          {entry.included && <Check className="h-3 w-3" />}
        </button>
      </Td>
      <Td><code className="font-sans text-[11.5px]">{entry.loc}</code></Td>
      <Td>
        <select value={entry.changefreq} onChange={(e) => onUpdate({ changefreq: e.target.value as SitemapEntry["changefreq"] })}
          className="h-7 rounded border border-black/10 bg-white text-[11.5px] px-1.5 outline-none">
          {["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </Td>
      <Td>
        <input type="number" min={0} max={1} step={0.1} value={entry.priority}
          onChange={(e) => onUpdate({ priority: Math.max(0, Math.min(1, Number(e.target.value) || 0)) })}
          className="h-7 w-16 rounded border border-black/10 bg-white text-[11.5px] px-2 tabular-nums outline-none" />
      </Td>
    </tr>
  );
}

/* ============================ SETTINGS ============================ */

function SettingsTab() {
  const { config, updateConfig, reset } = useSeo();
  const [form, setForm] = useState({ ...config });
  const [saved, setSaved] = useState(false);
  const patch = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });
  const save = () => { updateConfig(form); setSaved(true); setTimeout(() => setSaved(false), 1500); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <div className="font-display font-bold text-[15px] mb-3">Site identity</div>
        <div className="space-y-3">
          <TextField label="Site name" value={form.siteName} onChange={(v) => patch("siteName", v)} />
          <TextField label="Canonical site URL" value={form.siteUrl} onChange={(v) => patch("siteUrl", v)} mono />
          <TextField label="Title template" value={form.defaultTitleTemplate} onChange={(v) => patch("defaultTitleTemplate", v)} mono
            hint="Use %s where the page title should appear." />
          <TextArea label="Default meta description" value={form.defaultDescription} onChange={(v) => patch("defaultDescription", v)} rows={3} />
          <TextField label="Default OG image URL" value={form.ogImageDefault} onChange={(v) => patch("ogImageDefault", v)} mono />
          <TextField label="Twitter handle" value={form.twitterHandle} onChange={(v) => patch("twitterHandle", v)} />
        </div>
      </Card>

      <Card>
        <div className="font-display font-bold text-[15px] mb-3">Analytics & verification</div>
        <div className="space-y-3">
          <TextField label="Google Analytics 4 ID" value={form.gaMeasurementId} onChange={(v) => patch("gaMeasurementId", v)} mono placeholder="G-XXXXXXXXXX" />
          <TextField label="Search Console verification" value={form.gscVerification} onChange={(v) => patch("gscVerification", v)} mono
            hint="Rendered inside <meta name='google-site-verification' …>" />
        </div>
        <div className="border-t border-black/[0.06] my-4" />
        <div className="font-display font-bold text-[15px] mb-2">Sitemap behaviour</div>
        <div className="space-y-2">
          <ToggleRow label="Auto-generate sitemap.xml" caption="Rebuild the sitemap whenever a page is created or its indexing changes."
            value={form.autoGenerateSitemap} onChange={(v) => patch("autoGenerateSitemap", v)} />
          <ToggleRow label="Submit to Bing Webmaster" caption="Ping Bing when a new sitemap is generated."
            value={form.submitToBing} onChange={(v) => patch("submitToBing", v)} />
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <div className="font-display font-bold text-[15px] mb-2">robots.txt</div>
        <div className="text-[11.5px] text-muted-foreground mb-2">Live at <code className="font-sans">{form.siteUrl}/robots.txt</code></div>
        <textarea value={form.robotsTxt} onChange={(e) => patch("robotsTxt", e.target.value)} rows={12}
          className="w-full font-sans text-[12px] rounded-md border border-black/10 bg-[#faf8f3] px-3 py-2 outline-none focus:border-ink resize-y" />
      </Card>

      <div className="lg:col-span-2 flex items-center gap-2">
        <button onClick={() => { if (confirm("Reset all SEO settings to defaults?")) reset(); }}
          className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Reset all
        </button>
        <button onClick={() => setForm({ ...config })} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Revert</button>
        <button onClick={save} className="ml-auto h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
          {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save settings</>}
        </button>
      </div>
    </div>
  );
}

/* ============================ shared UI ============================ */

function KPI({ label, value, sub, Icon, tone = "text-ink" }: {
  label: string; value: string; sub?: string; Icon: typeof Globe; tone?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className={`font-display text-[22px] leading-tight mt-1 ${tone}`}>{value}</div>
          {sub && <div className="text-[10.5px] text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className="h-8 w-8 rounded-md bg-black/[0.04] grid place-items-center"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#faf8f3] py-1.5">
      <div className="font-display text-[14px] leading-tight tabular-nums">{value}</div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-semibold px-3 py-2.5 ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-top ${className}`}>{children}</td>;
}

function TextField({ label, value, onChange, hint, placeholder, mono, counter }: {
  label: string; value: string; onChange: (v: string) => void;
  hint?: string; placeholder?: string; mono?: boolean;
  counter?: { current: number; low: number; high: number };
}) {
  const tone = counter
    ? counter.current === 0 ? "text-rose-600"
      : counter.current < counter.low || counter.current > counter.high ? "text-amber-600" : "text-ink"
    : "";
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
        {counter && <div className={`text-[10.5px] font-semibold tabular-nums ${tone}`}>{counter.current} · {counter.low} - {counter.high}</div>}
      </div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink ${mono ? "font-sans text-[12.5px]" : ""}`} />
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3, counter }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
  counter?: { current: number; low: number; high: number };
}) {
  const tone = counter
    ? counter.current === 0 ? "text-rose-600"
      : counter.current < counter.low || counter.current > counter.high ? "text-amber-600" : "text-ink"
    : "";
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
        {counter && <div className={`text-[10.5px] font-semibold tabular-nums ${tone}`}>{counter.current} · {counter.low} - {counter.high}</div>}
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-none" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function ToggleRow({ label, caption, value, onChange }: {
  label: string; caption: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`w-full text-left rounded-md border p-3 transition-colors ${
        value ? "border-border bg-muted/50" : "border-black/10 bg-white"
      }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-[12.5px]">{label}</div>
        <div className={`h-5 w-9 rounded-full relative transition-colors ${value ? "bg-ink" : "bg-black/15"}`}>
          <div className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-all ${value ? "left-4" : "left-0.5"}`} />
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{caption}</div>
    </button>
  );
}

// Unused import guard - keep bundler happy if unused
void INDEX_META;
