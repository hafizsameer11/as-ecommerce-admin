import { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, ChevronDown, ChevronRight, ArrowUp, ArrowDown,
  Star, Eye, EyeOff, Trash2, Edit3, ExternalLink, Download, X, FolderTree,
} from "lucide-react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, IconButton, StatusPill, Toolbar, Empty } from "./ui";
import { useCategories, type Category, type CategoryStatus } from "@/lib/categories-store";
import { downloadCSV } from "@/lib/admin-export";
import { toast } from "sonner";

const STATUSES: { id: "all" | CategoryStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "hidden", label: "Hidden" },
];

export function AdminCategories() {
  const {
    categories, hydrate, setStatus, toggleFeatured, reorder, remove,
    addCategory, addSubcategory, removeSubcategory, setSubStatus, update,
  } = useCategories();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [tab, setTab] = useState<"all" | CategoryStatus>("all");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");

  const filtered = useMemo(() => {
    return [...categories]
      .sort((a, b) => a.order - b.order)
      .filter((c) => (tab === "all" ? true : c.status === tab))
      .filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true));
  }, [categories, tab, q]);

  const kpis = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.status === "active").length;
    const subs = categories.reduce((n, c) => n + c.subcategories.length, 0);
    const featured = categories.filter((c) => c.featured).length;
    return { total, active, subs, featured };
  }, [categories]);

  const open = openId ? categories.find((c) => c.id === openId) : null;

  const doExport = () => {
    downloadCSV(
      "categories.csv",
      filtered.map((c) => ({
        id: c.id, name: c.name, handle: c.handle, status: c.status,
        featured: c.featured, order: c.order, subcategories: c.subcategories.length,
      }))
    );
  };

  const doAdd = () => {
    const name = newCat.trim();
    if (!name) return;
    addCategory(name);
    setNewCat("");
    toast.success(`Added "${name}"`);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Categories"
        subtitle="Manage catalog taxonomy, subcategories and storefront placement."
        actions={
          <>
            <button
              onClick={doExport}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-2 hover:bg-black/[0.04]"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <div className="flex items-center gap-2">
              <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doAdd()}
                placeholder="New category name…"
                className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] w-[200px]"
              />
              <button
                onClick={doAdd}
                className="h-9 px-3 rounded-md bg-ink text-white text-[13px] flex items-center gap-2 hover:opacity-90"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Categories" value={kpis.total} />
        <Kpi label="Active" value={kpis.active} tone="green" />
        <Kpi label="Subcategories" value={kpis.subs} />
        <Kpi label="Featured" value={kpis.featured} tone="gold" />
      </div>

      {/* Toolbar */}
      <Toolbar>
        <div className="flex items-center gap-1 bg-white border border-black/10 rounded-md p-1">
          {STATUSES.map((s) => {
            const active = tab === s.id;
            const count = s.id === "all" ? categories.length : categories.filter((c) => c.status === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={`h-7 px-3 rounded text-[12px] font-medium flex items-center gap-1.5 transition-colors ${
                  active ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"
                }`}
              >
                {s.label}
                <span className={`text-[10px] ${active ? "opacity-70" : "opacity-60"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search categories…"
            className="h-9 pl-8 pr-3 rounded-md border border-black/10 bg-white text-[13px] w-[240px]"
          />
        </div>
      </Toolbar>

      {/* Tree */}
      {filtered.length === 0 ? (
        <Card>
          <Empty title="No categories" sub="Try a different filter or add a new one." />
        </Card>
      ) : (
        <Card padded={false}>
          <div className="divide-y divide-black/[0.06]">
            {filtered.map((c) => {
              const isOpen = expanded[c.id];
              return (
                <div key={c.id}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02]">
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))}
                      className="h-7 w-7 grid place-items-center rounded-md hover:bg-black/[0.06] text-muted-foreground"
                    >
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="h-9 w-9 rounded-md bg-black/[0.04] grid place-items-center text-muted-foreground">
                      <FolderTree className="w-4 h-4" />
                    </div>
                    <button
                      onClick={() => setOpenId(c.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-[14px] truncate">{c.name}</div>
                        {c.featured && <Chip tone="gold">Featured</Chip>}
                      </div>
                      <div className="text-[12px] text-muted-foreground truncate">
                        /{c.handle} · {c.subcategories.length} subcategories
                      </div>
                    </button>
                    <div className="hidden md:flex items-center gap-6 text-[12px] text-muted-foreground w-[280px]">
                      <div className="w-16">Order #{c.order}</div>
                      <div className="w-20 text-right">
                        {c.subcategories.reduce((n, s) => n + s.productCount, 0)} products
                      </div>
                      <StatusPill status={c.status} />
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton title="Move up" onClick={() => reorder(c.id, "up")}>
                        <ArrowUp className="w-4 h-4" />
                      </IconButton>
                      <IconButton title="Move down" onClick={() => reorder(c.id, "down")}>
                        <ArrowDown className="w-4 h-4" />
                      </IconButton>
                      <IconButton
                        title={c.featured ? "Unfeature" : "Feature"}
                        active={c.featured}
                        onClick={() => toggleFeatured(c.id)}
                      >
                        <Star className={`w-4 h-4 ${c.featured ? "fill-current" : ""}`} />
                      </IconButton>
                      <IconButton
                        title={c.status === "active" ? "Hide" : "Activate"}
                        onClick={() =>
                          setStatus(c.id, c.status === "active" ? "hidden" : "active")
                        }
                      >
                        {c.status === "active" ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </IconButton>
                      <IconButton title="Edit" onClick={() => setOpenId(c.id)}>
                        <Edit3 className="w-4 h-4" />
                      </IconButton>
                      <IconButton
                        title="Delete"
                        onClick={() => {
                          if (confirm(`Delete category "${c.name}"?`)) {
                            remove(c.id);
                            toast.success("Category deleted");
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="bg-black/[0.02] px-4 py-3 border-t border-black/[0.06]">
                      {c.subcategories.length === 0 ? (
                        <div className="text-[12px] text-muted-foreground px-2 py-3">
                          No subcategories yet. Open the editor to add some.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {c.subcategories.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-3 bg-white border border-black/[0.06] rounded-md px-3 py-2"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium truncate">{s.name}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  /{c.handle}/{s.handle} · {s.productCount} products
                                </div>
                              </div>
                              <StatusPill status={s.status} />
                              <button
                                onClick={() =>
                                  setSubStatus(c.id, s.id, s.status === "active" ? "hidden" : "active")
                                }
                                className="text-[11px] text-muted-foreground hover:text-ink"
                              >
                                {s.status === "active" ? "Hide" : "Show"}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Remove "${s.name}"?`)) removeSubcategory(c.id, s.id);
                                }}
                                className="text-muted-foreground hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Drawer */}
      {open && (
        <CategoryDrawer
          category={open}
          onClose={() => setOpenId(null)}
          onUpdate={(patch) => update(open.id, patch)}
          onAddSub={(name) => addSubcategory(open.id, name)}
          onRemoveSub={(subId) => removeSubcategory(open.id, subId)}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: "neutral" | "green" | "gold" }) {
  const tones: Record<string, string> = {
    neutral: "text-ink",
    green: "text-ink",
    gold: "text-gold-deep",
  };
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-display font-bold mt-1 ${tones[tone]}`}>{value}</div>
    </Card>
  );
}

function CategoryDrawer({
  category, onClose, onUpdate, onAddSub, onRemoveSub,
}: {
  category: Category;
  onClose: () => void;
  onUpdate: (patch: Partial<Category>) => void;
  onAddSub: (name: string) => void;
  onRemoveSub: (subId: string) => void;
}) {
  const [newSub, setNewSub] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div
        className="w-full max-w-[560px] bg-white h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-black/[0.06] px-5 py-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Category</div>
            <div className="font-display font-bold text-lg">{category.name}</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-black/[0.06]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Name</label>
            <input
              value={category.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-md border border-black/10 bg-white text-[13px]"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Handle</label>
            <input
              value={category.handle}
              onChange={(e) => onUpdate({ handle: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-sans"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea
              rows={3}
              value={category.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-md border border-black/10 bg-white text-[13px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</label>
              <select
                value={category.status}
                onChange={(e) => onUpdate({ status: e.target.value as CategoryStatus })}
                className="mt-1 w-full h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Featured</label>
              <button
                onClick={() => onUpdate({ featured: !category.featured })}
                className={`mt-1 w-full h-9 rounded-md border text-[13px] flex items-center justify-center gap-2 ${
                  category.featured
                    ? "bg-gold/15 border-gold/40 text-gold-deep"
                    : "bg-white border-black/10"
                }`}
              >
                <Star className={`w-4 h-4 ${category.featured ? "fill-current" : ""}`} />
                {category.featured ? "Featured" : "Not featured"}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Subcategories ({category.subcategories.length})
              </label>
              <a
                href={`/shop/${encodeURIComponent(category.handle)}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-muted-foreground hover:text-ink flex items-center gap-1"
              >
                View on storefront <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-1.5">
              {category.subcategories.map((s) => (
                <div key={s.id} className="flex items-center gap-2 bg-black/[0.03] rounded-md px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{s.productCount} products</div>
                  </div>
                  <StatusPill status={s.status} />
                  <button
                    onClick={() => onRemoveSub(s.id)}
                    className="text-muted-foreground hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSub.trim()) {
                    onAddSub(newSub.trim());
                    setNewSub("");
                  }
                }}
                placeholder="Add subcategory…"
                className="flex-1 h-9 px-3 rounded-md border border-black/10 bg-white text-[13px]"
              />
              <button
                onClick={() => {
                  if (newSub.trim()) {
                    onAddSub(newSub.trim());
                    setNewSub("");
                  }
                }}
                className="h-9 px-3 rounded-md bg-ink text-white text-[13px] flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-black/[0.06]">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">SEO</div>
            <input
              value={category.seoTitle ?? ""}
              onChange={(e) => onUpdate({ seoTitle: e.target.value })}
              placeholder="SEO title"
              className="w-full h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] mb-2"
            />
            <textarea
              rows={2}
              value={category.seoDescription ?? ""}
              onChange={(e) => onUpdate({ seoDescription: e.target.value })}
              placeholder="SEO description"
              className="w-full px-3 py-2 rounded-md border border-black/10 bg-white text-[13px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
