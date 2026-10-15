import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Toolbar, TableWrap, Empty, IconButton } from "./ui";
import {
  Search, Filter, Download, Plus, X, Copy, Trash2, Star, Eye, ExternalLink,
  Crown, Sparkles, Globe, LayoutGrid, List, ImageIcon, Check, Archive,
} from "lucide-react";
import { useBrands, productCountForBrand, type Brand, type BrandStatus, type BrandTier } from "@/lib/brands-store";
import { downloadCSV } from "@/lib/admin-export";
const STATUS_META: Record<BrandStatus, { label: string; tone: Parameters<typeof Chip>[0]["tone"] }> = {
  active: { label: "Active", tone: "green" },
  draft: { label: "Draft", tone: "slate" },
  archived: { label: "Archived", tone: "neutral" },
};

const TIER_META: Record<BrandTier, { label: string; tone: Parameters<typeof Chip>[0]["tone"]; icon: typeof Crown }> = {
  signature: { label: "Signature", tone: "amber", icon: Crown },
  core: { label: "Core", tone: "slate", icon: Sparkles },
  emerging: { label: "Emerging", tone: "neutral", icon: Sparkles },
};

const TABS: { id: BrandStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "draft", label: "Drafts" },
  { id: "archived", label: "Archived" },
];

function Metric({ label, value, sub, tone = "ink" }: { label: string; value: string; sub?: string; tone?: "ink" | "gold" | "green" }) {
  const cls = tone === "gold" ? "text-gold-deep" : tone === "green" ? "text-ink" : "text-ink";
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl mt-1 ${cls}`}>{value}</div>
      {sub && <div className="text-[12px] text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return " - ";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function BrandLogo({ b, size = 56 }: { b: Brand; size?: number }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center font-display font-bold text-white shrink-0"
      style={{ width: size, height: size, background: b.accent, fontSize: size * 0.32, letterSpacing: 1 }}
    >
      {b.logoInitial}
    </div>
  );
}

export function AdminBrands() {
  const brands = useBrands((s) => s.brands);
  const hydrate = useBrands((s) => s.hydrate);
  const setStatus = useBrands((s) => s.setStatus);
  const setTier = useBrands((s) => s.setTier);
  const toggleFeatured = useBrands((s) => s.toggleFeatured);
  const toggleConciergeOnly = useBrands((s) => s.toggleConciergeOnly);
  const update = useBrands((s) => s.update);
  const create = useBrands((s) => s.create);
  const duplicate = useBrands((s) => s.duplicate);
  const remove = useBrands((s) => s.remove);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<BrandStatus | "all">("all");
  const [tierFilter, setTierFilter] = useState<BrandTier | "all">("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sort, setSort] = useState<"updated" | "name" | "products">("updated");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = brands.filter((b) => {
      if (tab !== "all" && b.status !== tab) return false;
      if (tierFilter !== "all" && b.tier !== tierFilter) return false;
      if (featuredOnly && !b.featured) return false;
      if (!query) return true;
      return [b.name, b.handle, b.country, b.tagline].join(" ").toLowerCase().includes(query);
    });
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "products") list = [...list].sort((a, b) => productCountForBrand(b.name) - productCountForBrand(a.name));
    else list = [...list].sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
    return list;
  }, [brands, q, tab, tierFilter, featuredOnly, sort]);

  const counts = useMemo(() => {
    const totalProducts = brands.reduce((n, b) => n + productCountForBrand(b.name), 0);
    return {
      total: brands.length,
      active: brands.filter((b) => b.status === "active").length,
      featured: brands.filter((b) => b.featured).length,
      signature: brands.filter((b) => b.tier === "signature").length,
      totalProducts,
    };
  }, [brands]);

  const selected = selectedId ? brands.find((b) => b.id === selectedId) ?? null : null;
  const del = confirmDelete ? brands.find((b) => b.id === confirmDelete) ?? null : null;

  function exportCSV() {
    downloadCSV(
      `asl-brands-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((b) => ({
        id: b.id, name: b.name, handle: b.handle, status: b.status, tier: b.tier,
        featured: b.featured, concierge_only: b.concierge_only, country: b.country,
        products: productCountForBrand(b.name), updated: b.updatedAt,
      }))
    );
  }

  const activeFilterCount = (tierFilter !== "all" ? 1 : 0) + (featuredOnly ? 1 : 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Brands"
        subtitle="Curate the houses and labels featured across ASL ORIGINALS."
        actions={
          <>
            <button onClick={exportCSV} className="h-9 px-3 rounded-lg border border-black/10 bg-white text-[13px] inline-flex items-center gap-1.5 hover:bg-black/5">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={() => setNewOpen(true)} className="h-9 px-3 rounded-lg bg-black text-white text-[13px] inline-flex items-center gap-1.5 hover:bg-black/85">
              <Plus className="h-4 w-4" /> New brand
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <Metric label="Total brands" value={String(counts.total)} sub={`${counts.active} active`} />
        <Metric label="Signature tier" value={String(counts.signature)} tone="gold" sub="House priority" />
        <Metric label="Featured" value={String(counts.featured)} sub="Homepage & shop hub" />
        <Metric label="Catalog products" value={String(counts.totalProducts)} sub="Across all brands" />
        <Metric label="Concierge-only" value={String(brands.filter((b) => b.concierge_only).length)} sub="Sourced on request" />
      </div>

      <Toolbar>
        <div className="flex items-center gap-1 border border-black/10 rounded-lg bg-white p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`h-8 px-3 rounded-md text-[13px] ${tab === t.id ? "bg-black text-white" : "text-ink/70 hover:bg-black/5"}`}
            >
              {t.label}
              <span className="ml-1.5 text-[11px] opacity-70">
                {t.id === "all" ? brands.length : brands.filter((b) => b.status === t.id).length}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[220px] max-w-[360px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search brands, handle, country..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-black/10 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        <button
          onClick={() => setFiltersOpen(true)}
          className="h-9 px-3 rounded-lg border border-black/10 bg-white text-[13px] inline-flex items-center gap-1.5 hover:bg-black/5"
        >
          <Filter className="h-4 w-4" /> Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 h-5 min-w-5 px-1.5 rounded-full bg-black text-white text-[11px] inline-flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="h-9 px-2.5 rounded-lg border border-black/10 bg-white text-[13px]"
        >
          <option value="updated">Recently updated</option>
          <option value="name">Name A - Z</option>
          <option value="products">Most products</option>
        </select>

        <div className="ml-auto flex items-center gap-1 border border-black/10 rounded-lg bg-white p-0.5">
          <button onClick={() => setView("grid")} className={`h-8 w-8 rounded-md inline-flex items-center justify-center ${view === "grid" ? "bg-black text-white" : "text-ink/70 hover:bg-black/5"}`} aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView("table")} className={`h-8 w-8 rounded-md inline-flex items-center justify-center ${view === "table" ? "bg-black text-white" : "text-ink/70 hover:bg-black/5"}`} aria-label="Table view">
            <List className="h-4 w-4" />
          </button>
        </div>
      </Toolbar>

      {filtered.length === 0 ? (
        <Empty title="No brands match" sub="Adjust your search or filters to see more results." />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((b) => {
            const products = productCountForBrand(b.name);
            const tier = TIER_META[b.tier];
            return (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className="text-left rounded-xl border border-black/10 bg-white hover:border-black/25 hover:shadow-sm transition overflow-hidden group"
              >
                <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${b.accent} 0%, ${b.accent}dd 100%)` }}>
                  {b.featured && (
                    <div className="absolute top-2 right-2 h-6 px-2 rounded-full bg-white/95 text-[11px] font-medium inline-flex items-center gap-1 text-gold-deep">
                      <Star className="h-3 w-3 fill-current" /> Featured
                    </div>
                  )}
                  <div className="absolute -bottom-6 left-4">
                    <BrandLogo b={b} size={56} />
                  </div>
                </div>
                <div className="pt-9 px-4 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display text-[17px] leading-tight truncate">{b.name}</div>
                      <div className="text-[12px] text-muted-foreground truncate">{b.country} · /{b.handle}</div>
                    </div>
                    <Chip tone={STATUS_META[b.status].tone}>{STATUS_META[b.status].label}</Chip>
                  </div>
                  <p className="text-[12.5px] text-ink/70 mt-2 line-clamp-2 min-h-[36px]">{b.tagline}</p>
                  <div className="mt-3 flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-1.5">
                      <tier.icon className="h-3.5 w-3.5 text-gold-deep" />
                      <span className="text-ink/80">{tier.label}</span>
                    </div>
                    <span className="text-muted-foreground">{products} product{products === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.03] text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Brand</th>
                <th className="text-left font-medium px-4 py-2.5">Tier</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-left font-medium px-4 py-2.5">Country</th>
                <th className="text-right font-medium px-4 py-2.5">Products</th>
                <th className="text-left font-medium px-4 py-2.5">Updated</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const products = productCountForBrand(b.name);
                const tier = TIER_META[b.tier];
                return (
                  <tr key={b.id} className="border-t border-black/5 hover:bg-black/[0.02] cursor-pointer" onClick={() => setSelectedId(b.id)}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <BrandLogo b={b} size={36} />
                        <div className="min-w-0">
                          <div className="font-medium flex items-center gap-1.5">
                            {b.name}
                            {b.featured && <Star className="h-3 w-3 fill-gold-deep text-gold-deep" />}
                          </div>
                          <div className="text-[11.5px] text-muted-foreground">/{b.handle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Chip tone={tier.tone}>{tier.label}</Chip>
                    </td>
                    <td className="px-4 py-2.5"><Chip tone={STATUS_META[b.status].tone}>{STATUS_META[b.status].label}</Chip></td>
                    <td className="px-4 py-2.5 text-ink/80">{b.country}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{products}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(b.updatedAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <IconButton title="Open" onClick={() => setSelectedId(b.id)}>
                        <Eye className="h-4 w-4" />
                      </IconButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      {/* Filters sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setFiltersOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-[380px] max-w-full h-full bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
              <div className="font-display text-lg">Filters</div>
              <IconButton onClick={() => setFiltersOpen(false)} title="Close"><X className="h-4 w-4" /></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <div className="text-[12px] uppercase tracking-wider text-muted-foreground mb-2">Tier</div>
                <div className="flex flex-wrap gap-2">
                  {(["all", "signature", "core", "emerging"] as const).map((t) => (
                    <button key={t} onClick={() => setTierFilter(t as any)} className={`h-8 px-3 rounded-full text-[12.5px] border ${tierFilter === t ? "bg-black text-white border-black" : "bg-white border-black/15 hover:bg-black/5"}`}>
                      {t === "all" ? "All tiers" : TIER_META[t as BrandTier].label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} className="h-4 w-4 accent-black" />
                Featured brands only
              </label>
            </div>
            <div className="border-t border-black/10 p-4 flex items-center gap-2">
              <button onClick={() => { setTierFilter("all"); setFeaturedOnly(false); }} className="flex-1 h-10 rounded-lg border border-black/10 text-[13px] hover:bg-black/5">Clear</button>
              <button onClick={() => setFiltersOpen(false)} className="flex-1 h-10 rounded-lg bg-black text-white text-[13px] hover:bg-black/85">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* New brand modal */}
      {newOpen && (
        <NewBrandModal
          onClose={() => setNewOpen(false)}
          onCreate={(payload) => {
            void create(payload).then((id) => {
              setNewOpen(false);
              setSelectedId(id);
            });
          }}
        />
      )}

      {/* Detail drawer */}
      {selected && (
        <BrandDrawer
          brand={selected}
          products={productCountForBrand(selected.name)}
          onClose={() => setSelectedId(null)}
          onStatus={(s) => setStatus(selected.id, s)}
          onTier={(t) => setTier(selected.id, t)}
          onToggleFeatured={() => toggleFeatured(selected.id)}
          onToggleConcierge={() => toggleConciergeOnly(selected.id)}
          onUpdate={(patch) => update(selected.id, patch)}
          onDuplicate={() => { duplicate(selected.id); setSelectedId(null); }}
          onDelete={() => setConfirmDelete(selected.id)}
        />
      )}

      {/* Delete confirm */}
      {del && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-lg">Delete {del.name}?</div>
            <p className="text-[13px] text-muted-foreground mt-2">
              This removes the brand from the catalog. Products tagged with this brand will remain, but the brand landing page will 404.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="h-9 px-3 rounded-lg border border-black/10 text-[13px] hover:bg-black/5">Cancel</button>
              <button onClick={() => { remove(del.id); setConfirmDelete(null); setSelectedId(null); }} className="h-9 px-3 rounded-lg bg-red-600 text-white text-[13px] hover:bg-red-700">Delete brand</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BrandDrawer({
  brand, products, onClose, onStatus, onTier, onToggleFeatured, onToggleConcierge, onUpdate, onDuplicate, onDelete,
}: {
  brand: Brand;
  products: number;
  onClose: () => void;
  onStatus: (s: BrandStatus) => void;
  onTier: (t: BrandTier) => void;
  onToggleFeatured: () => void;
  onToggleConcierge: () => void;
  onUpdate: (patch: Partial<Brand>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "seo">("overview");
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-[560px] max-w-full h-full bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${brand.accent} 0%, ${brand.accent}dd 100%)` }}>
          <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 inline-flex items-center justify-center hover:bg-white" title="Close">
            <X className="h-4 w-4" />
          </button>
          <div className="absolute -bottom-8 left-6">
            <BrandLogo b={brand} size={72} />
          </div>
        </div>

        <div className="px-6 pt-11 pb-3 border-b border-black/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-[22px] leading-tight">{brand.name}</div>
              <div className="text-[12.5px] text-muted-foreground">/{brand.handle} · Updated {fmtDate(brand.updatedAt)}</div>
            </div>
            <Chip tone={STATUS_META[brand.status].tone}>{STATUS_META[brand.status].label}</Chip>
          </div>
          <div className="mt-4 flex items-center gap-1 border border-black/10 rounded-lg bg-white p-0.5 w-fit">
            {(["overview", "seo"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`h-8 px-3 rounded-md text-[12.5px] capitalize ${tab === t ? "bg-black text-white" : "text-ink/70 hover:bg-black/5"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {tab === "overview" ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-black/10 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Products</div>
                  <div className="font-display text-xl mt-0.5">{products}</div>
                </div>
                <div className="rounded-lg border border-black/10 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Tier</div>
                  <div className="font-display text-xl mt-0.5 text-gold-deep">{TIER_META[brand.tier].label}</div>
                </div>
                <div className="rounded-lg border border-black/10 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Country</div>
                  <div className="font-display text-xl mt-0.5">{brand.country}</div>
                </div>
              </div>

              <Field label="Brand name">
                <input value={brand.name} onChange={(e) => onUpdate({ name: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/10" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Handle">
                  <input value={brand.handle} onChange={(e) => onUpdate({ handle: e.target.value.toLowerCase().replace(/\s+/g, "-") })} className="w-full h-10 px-3 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/10" />
                </Field>
                <Field label="Country">
                  <input value={brand.country} onChange={(e) => onUpdate({ country: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/10" />
                </Field>
              </div>
              <Field label="Tagline">
                <input value={brand.tagline} onChange={(e) => onUpdate({ tagline: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/10" />
              </Field>
              <Field label="Description">
                <textarea value={brand.description} onChange={(e) => onUpdate({ description: e.target.value })} rows={4} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/10 resize-none" />
              </Field>
              <Field label="Website">
                <div className="relative">
                  <Globe className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={brand.website ?? ""} onChange={(e) => onUpdate({ website: e.target.value })} placeholder="https://" className="w-full h-10 pl-9 pr-3 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/10" />
                </div>
              </Field>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Status</div>
                <div className="flex gap-2">
                  {(Object.keys(STATUS_META) as BrandStatus[]).map((s) => (
                    <button key={s} onClick={() => onStatus(s)} className={`h-9 px-3 rounded-lg text-[12.5px] border ${brand.status === s ? "bg-black text-white border-black" : "bg-white border-black/15 hover:bg-black/5"}`}>
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Tier</div>
                <div className="flex gap-2">
                  {(Object.keys(TIER_META) as BrandTier[]).map((t) => (
                    <button key={t} onClick={() => onTier(t)} className={`h-9 px-3 rounded-lg text-[12.5px] border inline-flex items-center gap-1.5 ${brand.tier === t ? "bg-black text-white border-black" : "bg-white border-black/15 hover:bg-black/5"}`}>
                      <Crown className="h-3.5 w-3.5" /> {TIER_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <ToggleRow
                  label="Featured on homepage & shop hub"
                  sub="Appears in the Brands entry on /shop and rotates in hero picks."
                  checked={brand.featured} onChange={onToggleFeatured}
                />
                <ToggleRow
                  label="Concierge-only sourcing"
                  sub="Hide from public catalog; surface only via Start a Request."
                  checked={brand.concierge_only} onChange={onToggleConcierge}
                />
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Brand accent</div>
                <div className="flex items-center gap-3">
                  <input type="color" value={brand.accent} onChange={(e) => onUpdate({ accent: e.target.value })} className="h-10 w-14 rounded-lg border border-black/10 bg-white cursor-pointer" />
                  <input value={brand.accent} onChange={(e) => onUpdate({ accent: e.target.value })} className="h-10 px-3 rounded-lg border border-black/10 text-[13px] w-32 focus:outline-none focus:ring-2 focus:ring-black/10" />
                  <span className="text-[12px] text-muted-foreground">Used on the brand card & hero band.</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <Field label="SEO title">
                <input value={brand.seoTitle ?? ""} onChange={(e) => onUpdate({ seoTitle: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/10" />
                <div className="text-[11px] text-muted-foreground mt-1">{(brand.seoTitle ?? "").length}/60</div>
              </Field>
              <Field label="Meta description">
                <textarea value={brand.seoDescription ?? ""} onChange={(e) => onUpdate({ seoDescription: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-black/10" />
                <div className="text-[11px] text-muted-foreground mt-1">{(brand.seoDescription ?? "").length}/160</div>
              </Field>
              <div className="rounded-lg border border-black/10 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Google preview</div>
                <div className="text-[15px] text-blue-800 truncate">{brand.seoTitle || `${brand.name} - ASL ORIGINALS`}</div>
                <div className="text-[12px] text-ink truncate">asloriginals.online/brand/{brand.handle}</div>
                <div className="text-[12.5px] text-ink/80 line-clamp-2">{brand.seoDescription || brand.tagline}</div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-black/10 p-4 flex items-center gap-2">
          <a href="/shop" target="_blank" rel="noreferrer" className="h-9 px-3 rounded-lg border border-black/10 text-[13px] inline-flex items-center gap-1.5 hover:bg-black/5">
            <ExternalLink className="h-4 w-4" /> View on storefront
          </a>
          <button onClick={onDuplicate} className="h-9 px-3 rounded-lg border border-black/10 text-[13px] inline-flex items-center gap-1.5 hover:bg-black/5">
            <Copy className="h-4 w-4" /> Duplicate
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onDelete} className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-[13px] inline-flex items-center gap-1.5 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
            <button onClick={onClose} className="h-9 px-3 rounded-lg bg-black text-white text-[13px] inline-flex items-center gap-1.5 hover:bg-black/85">
              <Check className="h-4 w-4" /> Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function ToggleRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-black/10 hover:bg-black/[0.02] text-left">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{label}</div>
        {sub && <div className="text-[12px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      <div className={`h-5 w-9 rounded-full relative transition ${checked ? "bg-black" : "bg-black/15"}`}>
        <div className={`h-4 w-4 rounded-full bg-white absolute top-0.5 transition ${checked ? "left-[18px]" : "left-0.5"}`} />
      </div>
    </button>
  );
}

function NewBrandModal({ onClose, onCreate }: { onClose: () => void; onCreate: (b: { name: string; handle: string; tier: BrandTier; status: BrandStatus; tagline: string }) => void }) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [tier, setTier] = useState<BrandTier>("emerging");
  const [status, setStatus] = useState<BrandStatus>("draft");
  const handle = name.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-display text-xl">New brand</div>
          <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
        </div>
        <p className="text-[12.5px] text-muted-foreground mb-5">Add a house or label to the catalog. You can enrich the profile in the next screen.</p>

        <div className="space-y-4">
          <Field label="Brand name">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bottega Veneta" className="w-full h-10 px-3 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/10" />
            {name && <div className="text-[11px] text-muted-foreground mt-1">Handle: /{handle}</div>}
          </Field>
          <Field label="Tagline (optional)">
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One-liner for the brand landing page" className="w-full h-10 px-3 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/10" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tier">
              <select value={tier} onChange={(e) => setTier(e.target.value as BrandTier)} className="w-full h-10 px-2.5 rounded-lg border border-black/10 text-[13px] bg-white">
                <option value="signature">Signature</option>
                <option value="core">Core</option>
                <option value="emerging">Emerging</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as BrandStatus)} className="w-full h-10 px-2.5 rounded-lg border border-black/10 text-[13px] bg-white">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-lg border border-black/10 text-[13px] hover:bg-black/5">Cancel</button>
          <button
            disabled={!name.trim()}
            onClick={() => onCreate({ name: name.trim(), handle, tier, status, tagline })}
            className="h-9 px-3 rounded-lg bg-black text-white text-[13px] hover:bg-black/85 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Create brand
          </button>
        </div>
      </div>
    </div>
  );
}
