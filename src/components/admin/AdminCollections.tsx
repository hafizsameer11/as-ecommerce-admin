import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Toolbar, TableWrap, Empty, IconButton, naira } from "./ui";
import {
  Search, Filter, Download, Plus, X, Copy, Trash2, Star, Eye,
  Sparkles, Layers, CalendarClock, ChevronDown, ChevronUp, Wand2, ExternalLink,
  Home, ShoppingBag, GripVertical, Archive, Check, ImageOff,
} from "lucide-react";
import { useCollections, type Collection, type CollectionStatus, type CollectionSlot } from "@/lib/collections-store";
import { collectionsAdminApi } from "@/lib/api/catalog-admin";
import { koboToNaira } from "@/lib/api/client";
import { downloadCSV } from "@/lib/admin-export";

type PreviewProduct = {
  id: string;
  handle?: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  category?: string;
};

function mapPreviewProduct(raw: Record<string, unknown>): PreviewProduct {
  const price = koboToNaira(Number(raw.price ?? 0));
  return {
    id: String(raw.id ?? raw.handle ?? ""),
    handle: raw.handle ? String(raw.handle) : undefined,
    name: String(raw.name ?? ""),
    brand: String(raw.brand ?? ""),
    image: String(raw.image ?? "/favicon.png"),
    price,
    category: raw.category ? String(raw.category) : undefined,
  };
}

function useCollectionPreview(collectionId: string, enabled = true) {
  const [products, setProducts] = useState<PreviewProduct[]>([]);
  useEffect(() => {
    if (!enabled || !collectionId) return;
    let cancelled = false;
    void collectionsAdminApi
      .preview(collectionId)
      .then((rows) => {
        if (cancelled) return;
        const list = (Array.isArray(rows) ? rows : []).map((r) =>
          mapPreviewProduct(r as Record<string, unknown>),
        );
        setProducts(list);
      })
      .catch((err) => {
        console.warn("[collections] preview", err);
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [collectionId, enabled]);
  return products;
}
const STATUS_META: Record<CollectionStatus, { label: string; tone: Parameters<typeof Chip>[0]["tone"] }> = {
  active: { label: "Active", tone: "green" },
  scheduled: { label: "Scheduled", tone: "amber" },
  draft: { label: "Draft", tone: "slate" },
  archived: { label: "Archived", tone: "neutral" },
};

const SLOT_META: Record<CollectionSlot, { label: string; icon: typeof Home }> = {
  hero: { label: "Hero carousel", icon: Sparkles },
  home_row_1: { label: "Home · Row 1", icon: Home },
  home_row_2: { label: "Home · Row 2", icon: Home },
  shop_hub: { label: "Shop hub", icon: ShoppingBag },
  none: { label: "Unassigned", icon: Layers },
};

const TABS: { id: CollectionStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "scheduled", label: "Scheduled" },
  { id: "draft", label: "Drafts" },
  { id: "archived", label: "Archived" },
];

function Metric({ label, value, sub, tone = "ink" }: { label: string; value: string; sub?: string; tone?: "ink" | "gold" | "green" }) {
  const toneCls = tone === "gold" ? "text-gold-deep" : tone === "green" ? "text-ink" : "text-ink";
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className="text-[12px] text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return " - ";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminCollections() {
  const collections = useCollections((s) => s.collections);
  const hydrate = useCollections((s) => s.hydrate);
  const setStatus = useCollections((s) => s.setStatus);
  const setSlot = useCollections((s) => s.setSlot);
  const toggleFeatured = useCollections((s) => s.toggleFeatured);
  const duplicate = useCollections((s) => s.duplicate);
  const remove = useCollections((s) => s.remove);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<CollectionStatus | "all">("all");
  const [type, setType] = useState<"all" | "manual" | "smart">("all");
  const [slot, setSlotFilter] = useState<CollectionSlot | "all">("all");
  const [sort, setSort] = useState<"updated" | "title" | "products">("updated");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "table">("grid");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = collections.filter((c) => {
      if (tab !== "all" && c.status !== tab) return false;
      if (type !== "all" && c.type !== type) return false;
      if (slot !== "all" && c.slot !== slot) return false;
      if (!q) return true;
      const hay = [c.title, c.handle, c.description, ...c.tags].join(" ").toLowerCase();
      return hay.includes(q);
    });
    if (sort === "title") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "products") list = [...list].sort((a, b) => b.productIds.length - a.productIds.length);
    else list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }, [collections, query, tab, type, slot, sort]);

  const kpis = useMemo(() => {
    const active = collections.filter((c) => c.status === "active").length;
    const scheduled = collections.filter((c) => c.status === "scheduled").length;
    const featured = collections.filter((c) => c.featured).length;
    const slotted = collections.filter((c) => c.slot !== "none").length;
    return { total: collections.length, active, scheduled, featured, slotted };
  }, [collections]);

  const selected = selectedId ? collections.find((c) => c.id === selectedId) ?? null : null;

  function exportCsv() {
    const rows = filtered.map((c) => ({
      id: c.id, title: c.title, handle: c.handle, status: c.status, type: c.type,
      slot: c.slot, featured: c.featured ? "yes" : "no",
      products: c.productIds.length, tags: c.tags.join("; "),
      publishedAt: c.publishedAt ?? "", scheduledFor: c.scheduledFor ?? "",
      updatedAt: c.updatedAt,
    }));
    downloadCSV(`asl-collections-${Date.now()}.csv`, rows);
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Collections"
        subtitle="Curated groupings of products for editorial rows, hero slots and campaigns."
        actions={
          <>
            <button
              onClick={exportCsv}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-black/[0.04]"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => alert("New collection editor - coming next phase.")}
              className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-black"
            >
              <Plus className="w-4 h-4" /> New collection
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Metric label="Total collections" value={String(kpis.total)} sub={`${kpis.active} active`} />
        <Metric label="Featured" value={String(kpis.featured)} sub="Pinned on storefront" tone="gold" />
        <Metric label="Scheduled" value={String(kpis.scheduled)} sub="Auto-publishing" />
        <Metric label="In hero / rows" value={String(kpis.slotted)} sub="Placed on home" tone="green" />
        <Metric label="Avg products" value={String(Math.round(collections.reduce((a, c) => a + c.productIds.length, 0) / Math.max(collections.length, 1)))} sub="Per collection" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-black/10 mb-4 -mt-1">
        {TABS.map((t) => {
          const count = t.id === "all" ? collections.length : collections.filter((c) => c.status === t.id).length;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`h-10 px-3 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                active ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-[11px] ${active ? "text-ink/60" : "text-muted-foreground"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <Toolbar>
        <div className="flex items-center gap-2 bg-white border border-black/10 rounded-md h-9 px-3 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, handle, tag…"
            className="bg-transparent outline-none text-[13px] flex-1"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-ink">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All types</option>
          <option value="manual">Manual</option>
          <option value="smart">Smart</option>
        </select>

        <select
          value={slot}
          onChange={(e) => setSlotFilter(e.target.value as typeof slot)}
          className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All placements</option>
          {(Object.keys(SLOT_META) as CollectionSlot[]).map((s) => (
            <option key={s} value={s}>{SLOT_META[s].label}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="updated">Recently updated</option>
          <option value="title">Title A - Z</option>
          <option value="products">Most products</option>
        </select>

        <div className="ml-auto flex items-center gap-1 bg-white border border-black/10 rounded-md p-0.5">
          <button
            onClick={() => setView("grid")}
            className={`h-7 px-2 rounded text-[12px] font-medium ${view === "grid" ? "bg-ink text-white" : "text-ink hover:bg-black/[0.04]"}`}
          >
            Grid
          </button>
          <button
            onClick={() => setView("table")}
            className={`h-7 px-2 rounded text-[12px] font-medium ${view === "table" ? "bg-ink text-white" : "text-ink hover:bg-black/[0.04]"}`}
          >
            Table
          </button>
        </div>
      </Toolbar>

      {filtered.length === 0 ? (
        <Empty title="No collections match" sub="Try clearing filters or search." />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <CollectionCard
              key={c.id}
              collection={c}
              onOpen={() => setSelectedId(c.id)}
              onDuplicate={() => duplicate(c.id)}
              onDelete={() => setConfirmDelete(c.id)}
              onToggleFeatured={() => toggleFeatured(c.id)}
            />
          ))}
        </div>
      ) : (
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-black/[0.02] border-b border-black/10">
                <th className="py-2.5 px-3 font-medium">Collection</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Type</th>
                <th className="py-2.5 px-3 font-medium">Placement</th>
                <th className="py-2.5 px-3 font-medium text-right">Products</th>
                <th className="py-2.5 px-3 font-medium">Updated</th>
                <th className="py-2.5 px-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-black/[0.06] hover:bg-black/[0.02] cursor-pointer"
                  onClick={() => setSelectedId(c.id)}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      {c.coverImage ? (
                        <img src={c.coverImage} alt="" className="w-9 h-9 rounded-md object-cover bg-black/[0.04]" />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-black/[0.04] grid place-items-center text-muted-foreground">
                          <ImageOff className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-ink flex items-center gap-1.5">
                          {c.title}
                          {c.featured && <Star className="w-3.5 h-3.5 fill-gold text-gold" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground">/{c.handle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3"><Chip tone={STATUS_META[c.status].tone}>{STATUS_META[c.status].label}</Chip></td>
                  <td className="py-3 px-3 capitalize">
                    <span className="inline-flex items-center gap-1 text-[12px]">
                      {c.type === "smart" ? <Wand2 className="w-3.5 h-3.5 text-gold-deep" /> : <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />}
                      {c.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[12px]">{SLOT_META[c.slot].label}</td>
                  <td className="py-3 px-3 text-right font-medium">{c.productIds.length}</td>
                  <td className="py-3 px-3 text-muted-foreground text-[12px]">{fmtDate(c.updatedAt)}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <IconButton title="Duplicate" onClick={() => duplicate(c.id)}><Copy className="w-4 h-4" /></IconButton>
                      <IconButton title="Delete" onClick={() => setConfirmDelete(c.id)}><Trash2 className="w-4 h-4" /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {selected && (
        <CollectionDrawer
          collection={selected}
          onClose={() => setSelectedId(null)}
          onSetStatus={(s) => setStatus(selected.id, s)}
          onSetSlot={(s) => setSlot(selected.id, s)}
          onToggleFeatured={() => toggleFeatured(selected.id)}
          onDuplicate={() => { duplicate(selected.id); setSelectedId(null); }}
          onDelete={() => { setConfirmDelete(selected.id); }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete collection?"
          body="This removes the collection from the storefront. Products remain in your catalog."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            remove(confirmDelete);
            if (selectedId === confirmDelete) setSelectedId(null);
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
}

function CollectionCard({
  collection: c, onOpen, onDuplicate, onDelete, onToggleFeatured,
}: {
  collection: Collection;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  const previewProducts = useCollectionPreview(c.id);
  const thumbs = previewProducts.slice(0, 4);
  const productCount = Math.max(c.productIds.length, previewProducts.length);
  return (
    <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,15,15,0.04)] flex flex-col">
      <button onClick={onOpen} className="relative aspect-[16/9] bg-[#f5f5f4] block w-full text-left">
        {c.coverImage ? (
          <img src={c.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            <ImageOff className="w-6 h-6" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <Chip tone={STATUS_META[c.status].tone}>{STATUS_META[c.status].label}</Chip>
          {c.type === "smart" && <Chip tone="gold"><Wand2 className="w-3 h-3" /> Smart</Chip>}
        </div>
        {c.featured && (
          <div className="absolute top-2 right-2 h-6 px-2 rounded-full bg-black/70 backdrop-blur text-white text-[11px] font-medium inline-flex items-center gap-1">
            <Star className="w-3 h-3 fill-gold text-gold" /> Featured
          </div>
        )}
      </button>
      <div className="p-4 flex-1 flex flex-col">
        <button onClick={onOpen} className="text-left">
          <div className="font-display text-[17px] leading-tight text-ink">{c.title}</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">/{c.handle}</div>
        </button>
        <p className="text-[13px] text-ink/70 mt-2 line-clamp-2">{c.description}</p>

        <div className="flex items-center gap-2 mt-3 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> {productCount} products
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            {(() => {
              const Icon = SLOT_META[c.slot].icon;
              return <Icon className="w-3.5 h-3.5" />;
            })()}
            {SLOT_META[c.slot].label}
          </span>
        </div>

        {thumbs.length > 0 && (
          <div className="flex -space-x-2 mt-3">
            {thumbs.map((p) => (
              <img
                key={p.id}
                src={p.image}
                alt=""
                className="w-9 h-9 rounded-md border-2 border-white bg-[#f5f5f4] object-cover"
              />
            ))}
            {productCount > 4 && (
              <div className="w-9 h-9 rounded-md border-2 border-white bg-black text-white grid place-items-center text-[11px] font-medium">
                +{productCount - 4}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-black/[0.06]">
          <button
            onClick={onOpen}
            className="flex-1 h-8 rounded-md bg-ink text-white text-[12px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-black"
          >
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          <IconButton title={c.featured ? "Unfeature" : "Feature"} onClick={onToggleFeatured} active={c.featured}>
            <Star className={`w-4 h-4 ${c.featured ? "fill-white" : ""}`} />
          </IconButton>
          <IconButton title="Duplicate" onClick={onDuplicate}><Copy className="w-4 h-4" /></IconButton>
          <IconButton title="Delete" onClick={onDelete}><Trash2 className="w-4 h-4" /></IconButton>
        </div>
      </div>
    </div>
  );
}

function CollectionDrawer({
  collection: c, onClose, onSetStatus, onSetSlot, onToggleFeatured, onDuplicate, onDelete,
}: {
  collection: Collection;
  onClose: () => void;
  onSetStatus: (s: CollectionStatus) => void;
  onSetSlot: (s: CollectionSlot) => void;
  onToggleFeatured: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [productsExpanded, setProductsExpanded] = useState(true);
  const items = useCollectionPreview(c.id);
  const totalValue = items.reduce((a, p) => a + (p.price ?? 0), 0);
  const storePath = `/collection/${encodeURIComponent(c.handle)}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[520px] h-full bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover */}
        <div className="relative aspect-[16/9] bg-[#f5f5f4]">
          {c.coverImage ? (
            <img src={c.coverImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted-foreground">
              <ImageOff className="w-8 h-8" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 backdrop-blur grid place-items-center hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-1.5 mb-2">
            <Chip tone={STATUS_META[c.status].tone}>{STATUS_META[c.status].label}</Chip>
            <Chip tone={c.type === "smart" ? "gold" : "neutral"}>
              {c.type === "smart" ? <><Wand2 className="w-3 h-3" /> Smart</> : "Manual"}
            </Chip>
            {c.featured && <Chip tone="gold"><Star className="w-3 h-3 fill-current" /> Featured</Chip>}
          </div>

          <h2 className="font-display text-2xl text-ink">{c.title}</h2>
          <div className="text-[12px] text-muted-foreground mt-0.5">/{c.handle}</div>
          <p className="text-[14px] text-ink/80 mt-3">{c.description}</p>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="rounded-lg border border-black/[0.06] p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Products</div>
              <div className="font-display text-lg mt-0.5">{c.productIds.length}</div>
            </div>
            <div className="rounded-lg border border-black/[0.06] p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Catalog value</div>
              <div className="font-display text-lg mt-0.5">{naira(totalValue)}</div>
            </div>
            <div className="rounded-lg border border-black/[0.06] p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sort</div>
              <div className="font-display text-lg mt-0.5 capitalize">{c.sortOrder.replace("_", " ")}</div>
            </div>
          </div>

          {/* Publish state */}
          <div className="mt-5 space-y-3">
            <Row label="Status">
              <select
                value={c.status}
                onChange={(e) => onSetStatus(e.target.value as CollectionStatus)}
                className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] w-full"
              >
                {(Object.keys(STATUS_META) as CollectionStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </Row>
            <Row label="Placement">
              <select
                value={c.slot}
                onChange={(e) => onSetSlot(e.target.value as CollectionSlot)}
                className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] w-full"
              >
                {(Object.keys(SLOT_META) as CollectionSlot[]).map((s) => (
                  <option key={s} value={s}>{SLOT_META[s].label}</option>
                ))}
              </select>
            </Row>
            <Row label="Featured on storefront">
              <button
                onClick={onToggleFeatured}
                className={`h-9 px-3 rounded-md border text-[13px] font-medium inline-flex items-center gap-1.5 ${
                  c.featured ? "bg-gold/15 border-gold/40 text-gold-deep" : "bg-white border-black/10 text-ink hover:bg-black/[0.04]"
                }`}
              >
                {c.featured ? <><Check className="w-3.5 h-3.5" /> Featured</> : <><Star className="w-3.5 h-3.5" /> Not featured</>}
              </button>
            </Row>
            <Row label={c.status === "scheduled" ? "Scheduled for" : "Published"}>
              <div className="text-[13px] inline-flex items-center gap-1.5 text-ink">
                <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                {fmtDate(c.status === "scheduled" ? c.scheduledFor : c.publishedAt)}
              </div>
            </Row>
          </div>

          {/* Smart rules */}
          {c.type === "smart" && c.rules.length > 0 && (
            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Smart rules</div>
              <div className="rounded-lg border border-black/[0.06] divide-y divide-black/[0.06]">
                {c.rules.map((r) => (
                  <div key={r.id} className="p-3 text-[13px] flex items-center gap-2">
                    <Wand2 className="w-3.5 h-3.5 text-gold-deep" />
                    <span className="capitalize font-medium">{r.field}</span>
                    <span className="text-muted-foreground uppercase text-[11px]">{r.op.replace("_", " ")}</span>
                    <span className="ml-auto font-sans text-[12px] bg-black/[0.04] px-1.5 py-0.5 rounded">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {c.tags.length > 0 && (
            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {c.tags.map((t) => <Chip key={t}>{t}</Chip>)}
              </div>
            </div>
          )}

          {/* Products */}
          <div className="mt-6">
            <button
              onClick={() => setProductsExpanded((v) => !v)}
              className="w-full flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2"
            >
              Products ({c.productIds.length})
              {productsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {productsExpanded && (
              <div className="rounded-lg border border-black/[0.06] divide-y divide-black/[0.06]">
                {items.length === 0 ? (
                  <div className="p-4 text-[13px] text-muted-foreground text-center">No products in this collection.</div>
                ) : items.map((p) => (
                  <div key={p.id} className="p-2.5 flex items-center gap-3">
                    <img src={p.image} alt="" className="w-11 h-11 rounded-md object-cover bg-[#f5f5f4]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{p.brand}</div>
                      <div className="text-[13px] text-ink truncate">{p.name}</div>
                    </div>
                    <div className="text-[13px] font-medium text-ink">{naira(p.price)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center gap-2">
            <a
              href={storePath}
              target="_blank"
              rel="noreferrer"
              className="flex-1 h-9 rounded-md border border-black/10 bg-white text-[13px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-black/[0.04]"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Preview on storefront
            </a>
            <button
              onClick={onDuplicate}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-black/[0.04]"
            >
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>
            <button
              onClick={() => onSetStatus("archived")}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-black/[0.04]"
              title="Archive"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="h-9 px-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-rose-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-5 text-[11px] text-muted-foreground">
            Created {fmtDate(c.createdAt)} · Updated {fmtDate(c.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-[12px] text-muted-foreground w-40 shrink-0">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ConfirmDialog({
  title, body, onCancel, onConfirm,
}: { title: string; body: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-sm bg-white rounded-xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg text-ink">{title}</h3>
        <p className="text-[13px] text-ink/70 mt-1.5">{body}</p>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onCancel} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-medium hover:bg-black/[0.04]">
            Cancel
          </button>
          <button onClick={onConfirm} className="h-9 px-3 rounded-md bg-rose-600 text-white text-[13px] font-medium hover:bg-rose-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
