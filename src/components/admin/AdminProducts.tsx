import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "./AdminShell";
import { Card, Chip, TableWrap, naira } from "./ui";
import { getProductSizeLabel, type Product } from "@/lib/shop-data";
import { useInventory } from "@/lib/inventory-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  useProducts,
  statusLabel,
  statusKey,
  type AdminProduct,
  type UiStatus,
} from "@/lib/products-store";
import { brandsAdminApi, categoriesAdminApi } from "@/lib/api/catalog-admin";
import type { BulkProductBody } from "@/lib/api/products-admin";
import {
  Search, Filter, Download, Plus, ArrowUpDown, ArrowUp, ArrowDown,
  Star, X, Edit3, Eye, Copy, Trash2, Archive, Tag as TagIcon,
  ExternalLink, Package, AlertTriangle, ChevronLeft, ChevronRight, MoreVertical,
} from "lucide-react";

type StockState = "In stock" | "Low stock" | "Out of stock" | "Pre-order";
type Status = UiStatus;

const stockTone: Record<StockState, "green" | "amber" | "red" | "blue"> = {
  "In stock": "green",
  "Low stock": "amber",
  "Out of stock": "red",
  "Pre-order": "blue",
};
const statusTone: Record<Status, "green" | "slate" | "neutral"> = {
  Active: "green",
  Draft: "slate",
  Archived: "neutral",
};

type SortKey = "name" | "price" | "stock" | "rating" | "brand";

function asShopProduct(p: AdminProduct): Product {
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    price: p.price,
    image: p.image,
    category: p.category,
    subcategory: p.subcategory ?? undefined,
    sizes: p.sizes,
    colors: p.colors,
    availability: (["In Stock", "Pre Order", "Limited Pieces", "Restocked"].includes(p.availability)
      ? p.availability
      : "In Stock") as Product["availability"],
    originalPrice: p.originalPrice,
    sizeLabels: p.sizeLabels,
    modelFit: p.modelFit,
  };
}

export function AdminProducts() {
  const products = useProducts((s) => s.products);
  const countsApi = useProducts((s) => s.counts);
  const apiPageCount = useProducts((s) => s.pageCount);
  const apiPage = useProducts((s) => s.page);
  const hydrated = useProducts((s) => s.hydrated);
  const hydrate = useProducts((s) => s.hydrate);
  const createProduct = useProducts((s) => s.create);
  const updateProduct = useProducts((s) => s.update);
  const setStatus = useProducts((s) => s.setStatus);
  const duplicateProduct = useProducts((s) => s.duplicate);
  const removeProduct = useProducts((s) => s.remove);
  const bulk = useProducts((s) => s.bulk);
  const sizingByProduct = useInventory((state) => state.sizingByProduct);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"All" | Status>("All");
  const [category, setCategory] = useState<string>("all");
  const [brand, setBrand] = useState<string>("all");
  const [stock, setStock] = useState<"all" | StockState>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<AdminProduct | null>(null);
  const [editing, setEditing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryPicker, setCategoryPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const perPage = 12;

  const brandOptions = useMemo(
    () => [...new Set(products.map((p) => p.brand))].sort((a, b) => a.localeCompare(b)),
    [products],
  );
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) map.set(p.category, p.categoryName || p.category);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const enriched = useMemo(
    () =>
      products.map((p) => ({
        p,
        stock: p.stock,
        stockLabel: p.stockState as StockState,
        status: statusLabel(p.status),
        rating: p.rating,
        ratingCount: p.ratingCount,
        sale: !!(p.discountPct || (p.originalPrice && p.originalPrice > p.price)),
        discountPct:
          p.discountPct ??
          (p.originalPrice && p.originalPrice > p.price
            ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
            : 0),
      })),
    [products],
  );

  const filtered = useMemo(() => {
    let rows = enriched.slice();
    if (tab !== "All") rows = rows.filter((r) => r.status === tab);
    if (category !== "all") rows = rows.filter((r) => r.p.category === category);
    if (brand !== "all") rows = rows.filter((r) => r.p.brand === brand);
    if (stock !== "all") rows = rows.filter((r) => r.stockLabel === stock);
    if (q) {
      const t = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.p.name.toLowerCase().includes(t) ||
          r.p.brand.toLowerCase().includes(t) ||
          r.p.id.toLowerCase().includes(t) ||
          (r.p.styleCode ?? "").toLowerCase().includes(t),
      );
    }
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.p.name.localeCompare(b.p.name);
      else if (sortKey === "price") cmp = a.p.price - b.p.price;
      else if (sortKey === "stock") cmp = a.stock - b.stock;
      else if (sortKey === "rating") cmp = a.rating - b.rating;
      else if (sortKey === "brand") cmp = a.p.brand.localeCompare(b.p.brand);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [enriched, tab, category, brand, stock, q, sortKey, sortDir]);

  const counts = useMemo(() => {
    const c: Record<"All" | Status, number> = {
      All: countsApi.all || enriched.length,
      Active: countsApi.active,
      Draft: countsApi.draft,
      Archived: countsApi.archived,
    };
    if (!countsApi.all && enriched.length) {
      c.All = enriched.length;
      c.Active = enriched.filter((r) => r.status === "Active").length;
      c.Draft = enriched.filter((r) => r.status === "Draft").length;
      c.Archived = enriched.filter((r) => r.status === "Archived").length;
    }
    return c;
  }, [countsApi, enriched]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);
  const activeFilters = (category !== "all" ? 1 : 0) + (brand !== "all" ? 1 : 0) + (stock !== "all" ? 1 : 0);

  const totalValue = enriched.reduce((n, r) => n + r.p.price * r.stock, 0);
  const lowCount = enriched.filter((r) => r.stockLabel === "Low stock").length;
  const outCount = enriched.filter((r) => r.stockLabel === "Out of stock").length;

  const toggleAll = () => {
    if (pageRows.every((r) => selected.has(r.p.id))) {
      const next = new Set(selected);
      pageRows.forEach((r) => next.delete(r.p.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      pageRows.forEach((r) => next.add(r.p.id));
      setSelected(next);
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const sortBtn = (key: SortKey, label: string) => (
    <button
      onClick={() => {
        if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("asc"); }
      }}
      className="inline-flex items-center gap-1 hover:text-ink"
    >
      {label}
      {sortKey !== key && <ArrowUpDown className="h-3 w-3 opacity-40" />}
      {sortKey === key && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

  const exportRows = (rows: typeof enriched) => {
    downloadCSV(
      `products-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => ({
        id: r.p.id,
        name: r.p.name,
        brand: r.p.brand,
        category: r.p.category,
        price: r.p.price,
        stock: r.stock,
        stockState: r.stockLabel,
        status: r.status,
        rating: r.rating,
      })),
    );
    setExportOpen(false);
  };

  const runBulk = async (action: BulkProductBody["action"], categoryId?: string) => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await bulk({
        ids: [...selected],
        action,
        categoryId,
      });
      toast.success(`Updated ${selected.size} product(s)`);
      setSelected(new Set());
      setCategoryPicker(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setBusy(false);
    }
  };

  const openDrawer = (p: AdminProduct) => {
    setDrawer(p);
    setEditing(false);
  };

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <PageHeader
        title="Products"
        subtitle={
          hydrated
            ? `${enriched.length.toLocaleString()} SKUs across ${brandOptions.length} brands`
            : "Loading catalog…"
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/inventory"
              className="h-9 px-3 rounded-md border border-black/10 bg-white hover:bg-black/[0.04] text-[13px] inline-flex items-center gap-1.5"
            >
              <Package className="h-4 w-4" /> Inventory
            </Link>
            <div className="relative">
              <button
                onClick={() => setExportOpen((v) => !v)}
                className="h-9 px-3 rounded-md border border-black/10 bg-white hover:bg-black/[0.04] text-[13px] inline-flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" /> Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-10 z-20 w-52 bg-white border border-black/10 rounded-md shadow-lg py-1 text-[13px]">
                  <button onClick={() => exportRows(filtered)} className="w-full text-left px-3 py-1.5 hover:bg-black/[0.04]">
                    Filtered ({filtered.length})
                  </button>
                  <button onClick={() => exportRows(enriched.filter((r) => selected.has(r.p.id)))} className="w-full text-left px-3 py-1.5 hover:bg-black/[0.04] disabled:opacity-40" disabled={selected.size === 0}>
                    Selected ({selected.size})
                  </button>
                  <button onClick={() => exportRows(enriched)} className="w-full text-left px-3 py-1.5 hover:bg-black/[0.04]">
                    All ({enriched.length})
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="h-9 px-3 rounded-md bg-ink text-white text-[13px] inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> New product
            </button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-ink/50">Total SKUs</div>
          <div className="text-[22px] font-semibold text-ink mt-0.5">{enriched.length.toLocaleString()}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-ink/50">Catalog value</div>
          <div className="text-[22px] font-semibold text-ink mt-0.5">{naira(totalValue)}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-ink/50 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" /> Low stock
          </div>
          <div className="text-[22px] font-semibold text-amber-600 mt-0.5">{lowCount}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-ink/50">Out of stock</div>
          <div className="text-[22px] font-semibold text-rose-600 mt-0.5">{outCount}</div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-ink/40" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by name, brand or SKU"
            className="w-full h-9 pl-8 pr-3 rounded-md border border-black/10 text-sm bg-white focus:outline-none focus:border-ink"
          />
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className="h-9 px-3 rounded-md border border-black/10 bg-white hover:bg-black/[0.04] text-[13px] inline-flex items-center gap-1.5"
        >
          <Filter className="h-4 w-4" /> Filters
          {activeFilters > 0 && (
            <span className="h-4 min-w-4 px-1 rounded-full bg-ink text-white text-[10px] font-bold grid place-items-center">
              {activeFilters}
            </span>
          )}
        </button>
        <div className="flex items-center gap-1 border border-black/10 rounded-md p-0.5 bg-white ml-auto">
          {(["All", "Active", "Draft", "Archived"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); }}
              className={`px-3 h-8 rounded text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                tab === t ? "bg-ink text-white" : "text-ink/70 hover:bg-black/[0.04]"
              }`}
            >
              {t}
              <span className={`text-[10px] ${tab === t ? "text-white/80" : "text-ink/50"}`}>{counts[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="mb-3 rounded-lg border border-ink bg-ink text-white px-4 py-2.5 flex items-center gap-3 text-[13px]">
          <span className="font-semibold">{selected.size} selected</span>
          <span className="text-white/40">·</span>
          <button
            disabled={busy}
            className="hover:text-gold inline-flex items-center gap-1 disabled:opacity-50"
            onClick={() => setCategoryPicker(true)}
          >
            <TagIcon className="h-3.5 w-3.5" /> Set category
          </button>
          <button
            disabled={busy}
            className="hover:text-gold inline-flex items-center gap-1 disabled:opacity-50"
            onClick={() => void runBulk("archive")}
          >
            <Archive className="h-3.5 w-3.5" /> Archive
          </button>
          <button className="hover:text-gold inline-flex items-center gap-1" onClick={() => exportRows(enriched.filter((r) => selected.has(r.p.id)))}><Download className="h-3.5 w-3.5" /> Export</button>
          <button
            disabled={busy}
            className="hover:text-rose-300 inline-flex items-center gap-1 disabled:opacity-50"
            onClick={() => {
              if (confirm(`Delete ${selected.size} product(s)?`)) void runBulk("delete");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button className="ml-auto text-white/60 hover:text-white" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* Table */}
      <Card padded={false} className="overflow-hidden">
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.02] text-[11px] uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-3 py-2.5 text-left w-8">
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.p.id))}
                    onChange={toggleAll}
                    className="accent-ink"
                  />
                </th>
                <th className="px-3 py-2.5 text-left">{sortBtn("name", "Product")}</th>
                <th className="px-3 py-2.5 text-left">{sortBtn("brand", "Brand")}</th>
                <th className="px-3 py-2.5 text-left">Category</th>
                <th className="px-3 py-2.5 text-right">{sortBtn("price", "Price")}</th>
                <th className="px-3 py-2.5 text-right">{sortBtn("stock", "Stock")}</th>
                <th className="px-3 py-2.5 text-left">Status</th>
                <th className="px-3 py-2.5 text-left">{sortBtn("rating", "Rating")}</th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr
                  key={r.p.id}
                  className="border-t border-black/[0.05] hover:bg-black/[0.02] cursor-pointer"
                  onClick={() => openDrawer(r.p)}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(r.p.id)}
                      onChange={() => toggleOne(r.p.id)}
                      className="accent-ink"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-md bg-[#f2f2f2] grid place-items-center shrink-0 overflow-hidden">
                        <img src={r.p.image} alt="" className="h-9 w-9 object-contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-ink truncate max-w-[280px]">{r.p.name}</div>
                        <div className="text-[11px] text-ink/50 font-sans">{r.p.id}</div>
                      </div>
                      {r.sale && r.discountPct > 0 && <Chip tone="red" className="ml-1">−{r.discountPct}%</Chip>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-ink/80">{r.p.brand}</td>
                  <td className="px-3 py-2.5 text-ink/80 capitalize">{r.p.category}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{naira(r.p.price)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Chip tone={stockTone[r.stockLabel]}>{r.stock} · {r.stockLabel}</Chip>
                  </td>
                  <td className="px-3 py-2.5">
                    <Chip tone={statusTone[r.status]}>{r.status}</Chip>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="inline-flex items-center gap-1 text-ink/80">
                      <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                      {r.rating.toFixed(1)}
                      <span className="text-[11px] text-ink/50">({r.ratingCount})</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <button className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.05] text-ink/60">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-16 text-center text-ink/50 text-sm">
                    {!hydrated ? "Loading products…" : "No products match the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-black/[0.05] flex items-center justify-between text-[12px] text-ink/70">
          <div>
            Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 grid place-items-center rounded border border-black/10 disabled:opacity-30 hover:bg-black/[0.04]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 w-7 grid place-items-center rounded border border-black/10 disabled:opacity-30 hover:bg-black/[0.04]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {apiPage < apiPageCount && (
              <button
                type="button"
                onClick={() => void hydrate({ page: apiPage + 1, append: true })}
                className="ml-2 h-7 px-2 rounded border border-black/10 hover:bg-black/[0.04]"
              >
                Load more from server
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Filters sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowFilters(false)}>
          <div
            className="absolute right-0 top-0 h-full w-[340px] bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-black/[0.06] flex items-center justify-between">
              <div className="font-semibold">Filters</div>
              <button onClick={() => setShowFilters(false)} className="h-8 w-8 grid place-items-center rounded hover:bg-black/[0.05]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">Category</div>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-2 rounded-md border border-black/10 text-sm bg-white">
                  <option value="all">All categories</option>
                  {categoryOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">Brand</div>
                <select value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full h-9 px-2 rounded-md border border-black/10 text-sm bg-white">
                  <option value="all">All brands</option>
                  {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">Stock state</div>
                <div className="grid grid-cols-2 gap-2">
                  {(["all", "In stock", "Low stock", "Out of stock", "Pre-order"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStock(s)}
                      className={`h-9 rounded-md border text-[12px] ${stock === s ? "bg-ink text-white border-ink" : "bg-white border-black/10 hover:bg-black/[0.04]"}`}
                    >
                      {s === "all" ? "Any" : s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-black/[0.06] flex gap-2">
              <button
                onClick={() => { setCategory("all"); setBrand("all"); setStock("all"); }}
                className="flex-1 h-9 rounded-md border border-black/10 text-[13px] hover:bg-black/[0.04]"
              >
                Reset
              </button>
              <button
                onClick={() => { setShowFilters(false); setPage(1); }}
                className="flex-1 h-9 rounded-md bg-ink text-white text-[13px]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick-view drawer */}
      {drawer && (
        <ProductDrawer
          product={drawer}
          editing={editing}
          sizingByProduct={sizingByProduct}
          onClose={() => { setDrawer(null); setEditing(false); }}
          onEdit={() => setEditing(true)}
          onSave={async (patch) => {
            try {
              await updateProduct(drawer.id, patch);
              const next = useProducts.getState().products.find((p) => p.id === drawer.id);
              if (next) setDrawer(next);
              setEditing(false);
              toast.success("Product updated");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Update failed");
            }
          }}
          onStatus={async (label) => {
            try {
              await setStatus(drawer.id, statusKey(label));
              const next = useProducts.getState().products.find((p) => p.id === drawer.id);
              if (next) setDrawer(next);
              toast.success(`Status → ${label}`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Status update failed");
            }
          }}
          onDuplicate={async () => {
            try {
              await duplicateProduct(drawer.id);
              toast.success("Duplicated as draft");
              setDrawer(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Duplicate failed");
            }
          }}
          onDelete={async () => {
            if (!confirm(`Delete ${drawer.name}?`)) return;
            try {
              await removeProduct(drawer.id);
              toast.success("Product deleted");
              setDrawer(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Delete failed");
            }
          }}
        />
      )}

      {createOpen && (
        <CreateProductDialog
          onClose={() => setCreateOpen(false)}
          onCreate={async (body) => {
            try {
              const created = await createProduct(body);
              toast.success("Product created");
              setCreateOpen(false);
              openDrawer(created);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Create failed");
            }
          }}
        />
      )}

      {categoryPicker && (
        <BulkCategoryPicker
          products={products}
          onClose={() => setCategoryPicker(false)}
          onPick={(categoryId) => void runBulk("setCategory", categoryId)}
        />
      )}
    </div>
  );
}

function ProductDrawer({
  product,
  editing,
  sizingByProduct,
  onClose,
  onEdit,
  onSave,
  onStatus,
  onDuplicate,
  onDelete,
}: {
  product: AdminProduct;
  editing: boolean;
  sizingByProduct: Record<string, { sizeLabels: Record<string, string>; modelFit: string }>;
  onClose: () => void;
  onEdit: () => void;
  onSave: (patch: { name?: string; price?: number; status?: "active" | "draft" | "archived" }) => Promise<void>;
  onStatus: (s: Status) => Promise<void>;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const uiStatus = statusLabel(product.status);
  const shop = asShopProduct(product);

  useEffect(() => {
    setName(product.name);
    setPrice(String(product.price));
  }, [product.id, product.name, product.price]);

  return (
    <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-black/[0.06] flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-semibold truncate">{product.name}</div>
            <div className="text-[11px] text-ink/50 font-sans">{product.id}</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded hover:bg-black/[0.05]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-[140px_1fr] gap-4">
            <div className="h-[140px] rounded-lg bg-[#f2f2f2] grid place-items-center overflow-hidden">
              <img src={product.image} alt="" className="h-32 w-32 object-contain" />
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider text-ink/50">{product.brand}</div>
              {editing ? (
                <>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-9 px-2 rounded-md border border-black/10 text-[13px]"
                  />
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full h-9 px-2 rounded-md border border-black/10 text-[13px]"
                  />
                </>
              ) : (
                <div className="text-[15px] font-semibold text-ink">{naira(product.price)}</div>
              )}
              <div className="flex flex-wrap gap-1">
                <Chip tone={stockTone[product.stockState as StockState]}>{product.stock} in stock</Chip>
                <Chip tone={statusTone[uiStatus]}>{uiStatus}</Chip>
                {product.discountPct ? <Chip tone="red">Sale −{product.discountPct}%</Chip> : null}
              </div>
              <div className="inline-flex items-center gap-1 text-[12px] text-ink/70 pt-1">
                <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                {product.rating.toFixed(1)} · {product.ratingCount} reviews
              </div>
            </div>
          </div>

          {editing && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">Status</div>
              <div className="flex gap-2">
                {(["Active", "Draft", "Archived"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => void onStatus(s)}
                    className={`h-8 px-3 rounded-md border text-[12px] ${
                      uiStatus === s ? "bg-ink text-white border-ink" : "border-black/10 hover:bg-black/[0.04]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">Variants - Sizes</div>
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.map((s) => (
                <span key={s} className="text-[12px] px-2 py-1 rounded border border-black/10 bg-white">
                  {getProductSizeLabel(shop, s, sizingByProduct[product.id]?.sizeLabels ?? product.sizeLabels)}
                </span>
              ))}
            </div>
          </div>

          {(sizingByProduct[product.id]?.modelFit || product.modelFit) && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-1">Model fit</div>
              <p className="text-[12px] leading-relaxed text-ink/80">
                {sizingByProduct[product.id]?.modelFit || product.modelFit}
              </p>
            </div>
          )}

          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">Colors</div>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <div key={c.name} className="inline-flex items-center gap-1.5 text-[12px] text-ink/80">
                  <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: c.hex }} />
                  {c.name}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div className="rounded-md bg-black/[0.03] px-3 py-2">
              <div className="text-ink/50 uppercase tracking-wider text-[10px]">Category</div>
              <div className="text-ink font-medium capitalize mt-0.5">
                {product.category}{product.subcategory ? ` · ${product.subcategory}` : ""}
              </div>
            </div>
            <div className="rounded-md bg-black/[0.03] px-3 py-2">
              <div className="text-ink/50 uppercase tracking-wider text-[10px]">Availability</div>
              <div className="text-ink font-medium mt-0.5">{product.availability}</div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-black/[0.06] flex items-center gap-2">
          <a
            href={`/product/${encodeURIComponent(product.id)}`}
            target="_blank"
            rel="noreferrer"
            className="h-9 px-3 rounded-md border border-black/10 hover:bg-black/[0.04] text-[13px] inline-flex items-center gap-1.5"
          >
            <Eye className="h-4 w-4" /> View live <ExternalLink className="h-3 w-3" />
          </a>
          <button
            onClick={() => void onDuplicate()}
            className="h-9 px-3 rounded-md border border-black/10 hover:bg-black/[0.04] text-[13px] inline-flex items-center gap-1.5"
          >
            <Copy className="h-4 w-4" /> Duplicate
          </button>
          {editing ? (
            <>
              <button
                onClick={() => void onDelete()}
                className="h-9 px-3 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 text-[13px] inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <button
                onClick={() =>
                  void onSave({
                    name: name.trim(),
                    price: Number(price) || 0,
                  })
                }
                className="ml-auto h-9 px-4 rounded-md bg-ink text-white text-[13px] inline-flex items-center gap-1.5"
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={onEdit}
              className="ml-auto h-9 px-4 rounded-md bg-ink text-white text-[13px] inline-flex items-center gap-1.5"
            >
              <Edit3 className="h-4 w-4" /> Edit product
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateProductDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (body: {
    name: string;
    brandId: string;
    categoryId: string;
    price: number;
    status: "draft";
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [{ data: brandRows }, cats] = await Promise.all([
          brandsAdminApi.list(),
          categoriesAdminApi.list(),
        ]);
        setBrands(
          ((brandRows as Record<string, unknown>[]) ?? []).map((b) => ({
            id: String(b.id),
            name: String(b.name ?? ""),
          })),
        );
        setCategories(
          ((cats as Record<string, unknown>[]) ?? []).map((c) => ({
            id: String(c.id),
            name: String(c.name ?? ""),
          })),
        );
      } catch (err) {
        console.warn("[products] create options", err);
      }
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="font-semibold text-[15px]">New product</div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded hover:bg-black/[0.05]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-ink/50">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 px-3 rounded-md border border-black/10 text-sm" />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-ink/50">Brand</span>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="w-full h-9 px-2 rounded-md border border-black/10 text-sm bg-white">
            <option value="">Select brand</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-ink/50">Category</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full h-9 px-2 rounded-md border border-black/10 text-sm bg-white">
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-ink/50">Price (₦)</span>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full h-9 px-3 rounded-md border border-black/10 text-sm" />
        </label>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-9 rounded-md border border-black/10 text-[13px]">Cancel</button>
          <button
            disabled={saving || !name.trim() || !brandId || !categoryId}
            onClick={async () => {
              setSaving(true);
              try {
                await onCreate({
                  name: name.trim(),
                  brandId,
                  categoryId,
                  price: Number(price) || 0,
                  status: "draft",
                });
              } finally {
                setSaving(false);
              }
            }}
            className="flex-1 h-9 rounded-md bg-ink text-white text-[13px] disabled:opacity-40"
          >
            {saving ? "Creating…" : "Create draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkCategoryPicker({
  products,
  onClose,
  onPick,
}: {
  products: AdminProduct[];
  onClose: () => void;
  onPick: (categoryId: string) => void;
}) {
  const options = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      if (p.categoryId) map.set(p.categoryId, p.categoryName || p.category);
    }
    return [...map.entries()];
  }, [products]);
  const [value, setValue] = useState(options[0]?.[0] ?? "");

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="font-semibold">Set category</div>
        <select value={value} onChange={(e) => setValue(e.target.value)} className="w-full h-9 px-2 rounded-md border border-black/10 text-sm bg-white">
          {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-9 rounded-md border border-black/10 text-[13px]">Cancel</button>
          <button
            disabled={!value}
            onClick={() => onPick(value)}
            className="flex-1 h-9 rounded-md bg-ink text-white text-[13px] disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
