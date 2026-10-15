import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./AdminShell";
import { Card, Chip, TableWrap, naira } from "./ui";
import {
  useInventory, WAREHOUSES, stockStateOf, productForRow,
  type StockRow, type StockState,
} from "@/lib/inventory-store";
import { downloadCSV } from "@/lib/admin-export";
import { DESIGNER_CLOTHING_SIZE_LABELS } from "@/lib/shop-data";
import {
  Search, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown,
  Boxes, AlertTriangle, TrendingDown, Warehouse as WarehouseIcon,
  Plus, Minus, ArrowRightLeft, History, X, RotateCcw, ChevronLeft, ChevronRight,
} from "lucide-react";

const stockTone: Record<StockState, "green" | "amber" | "red" | "blue"> = {
  "In stock": "green",
  "Low stock": "amber",
  "Out of stock": "red",
  Backorder: "blue",
};

type Tab = "all" | "low" | "out" | "backorder";
type SortKey = "name" | "sku" | "onHand" | "reserved" | "available" | "value";

export default function AdminInventory() {
  const { rows, movements, adjust, setReorder, transfer, updateProductSizing, reset, hydrate } = useInventory();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [warehouse, setWarehouse] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("onHand");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const perPage = 15;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<StockRow | null>(null);
  const [showMovements, setShowMovements] = useState(false);

  const categories = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const p = productForRow(r);
      if (p) s.add(p.category);
    });
    return Array.from(s).sort();
  }, [rows]);

  const enriched = useMemo(() => {
    return rows.map((r) => {
      const p = productForRow(r);
      const state = stockStateOf(r);
      return {
        row: r,
        product: p,
        state,
        name: p?.name ?? r.productId,
        brand: p?.brand ?? " - ",
        category: p?.category ?? " - ",
        image: p?.image,
        available: r.onHand - r.reserved,
        value: r.onHand * r.cost,
      };
    });
  }, [rows]);

  const kpis = useMemo(() => {
    const totalUnits = enriched.reduce((a, e) => a + e.row.onHand, 0);
    const totalValue = enriched.reduce((a, e) => a + e.value, 0);
    const lowSkus = enriched.filter((e) => e.state === "Low stock").length;
    const outSkus = enriched.filter((e) => e.state === "Out of stock").length;
    return { totalUnits, totalValue, lowSkus, outSkus };
  }, [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (tab === "low") list = list.filter((e) => e.state === "Low stock");
    if (tab === "out") list = list.filter((e) => e.state === "Out of stock");
    if (tab === "backorder") list = list.filter((e) => e.state === "Backorder");
    if (warehouse !== "all") list = list.filter((e) => e.row.warehouseId === warehouse);
    if (category !== "all") list = list.filter((e) => e.category === category);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(t) ||
          e.brand.toLowerCase().includes(t) ||
          e.row.sku.toLowerCase().includes(t) ||
          e.row.variant.toLowerCase().includes(t),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      switch (sortKey) {
        case "name": av = a.name; bv = b.name; break;
        case "sku": av = a.row.sku; bv = b.row.sku; break;
        case "onHand": av = a.row.onHand; bv = b.row.onHand; break;
        case "reserved": av = a.row.reserved; bv = b.row.reserved; break;
        case "available": av = a.available; bv = b.available; break;
        case "value": av = a.value; bv = b.value; break;
      }
      if (typeof av === "string") return av.localeCompare(bv as string) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
    return list;
  }, [enriched, tab, warehouse, category, q, sortKey, sortDir]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  const rowKey = (r: StockRow) => `${r.sku}|${r.warehouseId}`;
  const toggleRow = (k: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };
  const toggleAll = () => {
    const allKeys = pageRows.map((e) => rowKey(e.row));
    const all = allKeys.every((k) => selected.has(k));
    setSelected((s) => {
      const n = new Set(s);
      if (all) allKeys.forEach((k) => n.delete(k));
      else allKeys.forEach((k) => n.add(k));
      return n;
    });
  };

  const sortHeader = (key: SortKey, label: string) => (
    <button
      onClick={() => {
        if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("asc"); }
      }}
      className="inline-flex items-center gap-1 hover:text-ink"
    >
      {label}
      {sortKey === key
        ? sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );

  const exportCSV = (which: "all" | "filtered" | "selected") => {
    const src =
      which === "all" ? enriched :
      which === "selected" ? enriched.filter((e) => selected.has(rowKey(e.row))) :
      filtered;
    const w = (id: string) => WAREHOUSES.find((x) => x.id === id)?.code ?? id;
    downloadCSV(
      `asl-inventory-${which}-${new Date().toISOString().slice(0, 10)}.csv`,
      src.map((e) => ({
        sku: e.row.sku,
        product: e.name,
        brand: e.brand,
        variant: e.row.variant,
        warehouse: w(e.row.warehouseId),
        on_hand: e.row.onHand,
        reserved: e.row.reserved,
        available: e.available,
        reorder_point: e.row.reorderPoint,
        state: e.state,
        cost: e.row.cost,
        stock_value: e.value,
      })),
    );
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Inventory"
        subtitle="Stock levels across warehouses, with adjustments, transfers and movement history."
        actions={
          <>
            <button
              onClick={() => setShowMovements(true)}
              className="h-9 px-3 rounded-md border border-black/10 bg-white hover:bg-black/[0.04] text-[13px] font-medium inline-flex items-center gap-2"
            >
              <History className="h-4 w-4" /> Movements
            </button>
            <button
              onClick={() => exportCSV("filtered")}
              className="h-9 px-3 rounded-md border border-black/10 bg-white hover:bg-black/[0.04] text-[13px] font-medium inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={<Boxes className="h-4 w-4" />} label="Total units on hand" value={kpis.totalUnits.toLocaleString()} />
        <Kpi icon={<WarehouseIcon className="h-4 w-4" />} label="Stock value" value={naira(kpis.totalValue)} tone="gold" />
        <Kpi icon={<TrendingDown className="h-4 w-4" />} label="Low stock SKUs" value={kpis.lowSkus.toLocaleString()} tone="amber" onClick={() => setTab("low")} />
        <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Out of stock" value={kpis.outSkus.toLocaleString()} tone="red" onClick={() => setTab("out")} />
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex bg-white border border-black/10 rounded-lg p-1 text-[13px]">
          {([
            ["all", "All"], ["low", "Low stock"], ["out", "Out of stock"], ["backorder", "Backorder"],
          ] as [Tab, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => { setTab(k); setPage(1); }}
              className={`px-3 py-1.5 rounded-md ${tab === k ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search SKU, product, brand…"
              className="w-full h-9 pl-9 pr-3 rounded-md border border-black/10 bg-white text-[13px] focus:outline-none focus:border-ink"
            />
          </div>
        </div>

        <select
          value={warehouse}
          onChange={(e) => { setWarehouse(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All warehouses</option>
          {WAREHOUSES.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.city}</option>)}
        </select>

        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] capitalize"
        >
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>

        <button
          onClick={() => { if (confirm("Reload inventory from the server?")) void reset(); }}
          className="h-9 px-3 rounded-md border border-black/10 bg-white hover:bg-black/[0.04] text-[13px] inline-flex items-center gap-2"
          title="Reload from API"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-16 z-20 mb-3 bg-ink text-white rounded-lg px-4 py-2 flex items-center gap-3 text-[13px] shadow-lg">
          <span className="font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          <button
            onClick={() => exportCSV("selected")}
            className="h-8 px-3 rounded-md bg-white/10 hover:bg-white/20 inline-flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="h-8 w-8 grid place-items-center rounded-md hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <TableWrap>
        <table className="w-full text-[13px]">
          <thead className="bg-black/[0.02] text-muted-foreground text-left">
            <tr>
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  checked={pageRows.length > 0 && pageRows.every((e) => selected.has(rowKey(e.row)))}
                  onChange={toggleAll}
                />
              </th>
              <th className="p-3">{sortHeader("name", "Product")}</th>
              <th className="p-3">{sortHeader("sku", "SKU / Variant")}</th>
              <th className="p-3">Warehouse</th>
              <th className="p-3 text-right">{sortHeader("onHand", "On hand")}</th>
              <th className="p-3 text-right">{sortHeader("reserved", "Reserved")}</th>
              <th className="p-3 text-right">{sortHeader("available", "Available")}</th>
              <th className="p-3">State</th>
              <th className="p-3 text-right">{sortHeader("value", "Stock value")}</th>
              <th className="p-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((e) => {
              const k = rowKey(e.row);
              const wh = WAREHOUSES.find((w) => w.id === e.row.warehouseId);
              return (
                <tr key={k} className="border-t border-black/[0.05] hover:bg-black/[0.015]">
                  <td className="p-3">
                    <input type="checkbox" checked={selected.has(k)} onChange={() => toggleRow(k)} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {e.image && (
                        <div className="h-10 w-10 rounded-md bg-[#f2f2f2] grid place-items-center overflow-hidden shrink-0">
                          <img src={e.image} alt={e.name} className="h-full w-full object-contain" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-ink truncate max-w-[240px]">{e.name}</div>
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{e.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-sans text-[12px] text-ink">{e.row.sku}</div>
                    <div className="text-[11px] text-muted-foreground">{e.row.variant}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-ink">{wh?.code}</div>
                    <div className="text-[11px] text-muted-foreground">{wh?.city}</div>
                  </td>
                  <td className="p-3 text-right font-medium">{e.row.onHand}</td>
                  <td className="p-3 text-right text-muted-foreground">{e.row.reserved}</td>
                  <td className="p-3 text-right font-medium">{e.available}</td>
                  <td className="p-3"><Chip tone={stockTone[e.state]}>{e.state}</Chip></td>
                  <td className="p-3 text-right">{naira(e.value)}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setDrawer(e.row)}
                      className="h-8 px-2.5 rounded-md border border-black/10 hover:bg-black/[0.04] text-[12px] font-medium"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-10 text-center text-muted-foreground">No stock rows match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filtered.length > perPage && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-black/[0.05] text-[12px] text-muted-foreground">
            <div>
              {((page - 1) * perPage) + 1} - {Math.min(page * perPage, filtered.length)} of {filtered.length}
            </div>
            <div className="inline-flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 grid place-items-center rounded-md border border-black/10 disabled:opacity-40 hover:bg-black/[0.04]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2">Page {page} of {pages}</span>
              <button
                disabled={page === pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="h-7 w-7 grid place-items-center rounded-md border border-black/10 disabled:opacity-40 hover:bg-black/[0.04]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </TableWrap>

      {/* Drawer */}
      {drawer && (
        <StockDrawer
          row={drawer}
          onClose={() => setDrawer(null)}
          onAdjust={(d, n) => adjust(drawer.sku, drawer.warehouseId, d, n)}
          onSetReorder={(rp) => setReorder(drawer.sku, drawer.warehouseId, rp)}
          onTransfer={(to, qty, note) => transfer(drawer.sku, drawer.warehouseId, to, qty, note)}
          onSaveSizing={async (sizing) => {
            try {
              await updateProductSizing(drawer.productId, sizing);
              toast.success("Size display saved");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not save size display");
            }
          }}
        />
      )}

      {/* Movements panel */}
      {showMovements && (
        <MovementsPanel movements={movements} onClose={() => setShowMovements(false)} />
      )}
    </div>
  );
}

function Kpi({
  icon, label, value, tone = "neutral", onClick,
}: {
  icon: React.ReactNode; label: string; value: string;
  tone?: "neutral" | "gold" | "amber" | "red"; onClick?: () => void;
}) {
  const ring: Record<string, string> = {
    neutral: "text-ink",
    gold: "text-gold-deep",
    amber: "text-amber-700",
    red: "text-rose-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-left ${onClick ? "hover:shadow-md transition-shadow cursor-pointer" : "cursor-default"}`}
    >
      <Card>
        <div className={`flex items-center gap-2 text-[12px] text-muted-foreground mb-2`}>
          <span className={ring[tone]}>{icon}</span> {label}
        </div>
        <div className={`font-display text-2xl ${ring[tone]}`}>{value}</div>
      </Card>
    </button>
  );
}

function StockDrawer({
  row, onClose, onAdjust, onSetReorder, onTransfer, onSaveSizing,
}: {
  row: StockRow;
  onClose: () => void;
  onAdjust: (delta: number, note: string) => void;
  onSetReorder: (rp: number) => void;
  onTransfer: (to: string, qty: number, note: string) => void;
  onSaveSizing: (sizing: { sizeLabels: Record<string, string>; modelFit: string }) => void | Promise<void>;
}) {
  const product = productForRow(row);
  const savedSizing = useInventory((state) => state.sizingByProduct[row.productId]);
  const wh = WAREHOUSES.find((w) => w.id === row.warehouseId);
  const [delta, setDelta] = useState(1);
  const [note, setNote] = useState("");
  const [rp, setRp] = useState(row.reorderPoint);
  const [toW, setToW] = useState<string>(WAREHOUSES.find((w) => w.id !== row.warehouseId)?.id ?? "");
  const [tqty, setTqty] = useState(1);
  const [sizeLabels, setSizeLabels] = useState<Record<string, string>>(
    savedSizing?.sizeLabels ?? product?.sizeLabels ?? {},
  );
  const [modelFit, setModelFit] = useState(savedSizing?.modelFit ?? product?.modelFit ?? "");
  const applyDesignerSizing = () => {
    if (!product) return;
    const labels = Object.fromEntries(
      product.sizes.map((size) => [size, DESIGNER_CLOTHING_SIZE_LABELS[size] ?? size]),
    );
    setSizeLabels(labels);
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-2xl flex flex-col">
        <div className="p-5 border-b border-black/[0.06] flex items-start gap-3">
          {product?.image && (
            <div className="h-14 w-14 rounded-md bg-[#f2f2f2] grid place-items-center overflow-hidden shrink-0">
              <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{product?.brand}</div>
            <div className="font-display text-lg leading-tight text-ink truncate">{product?.name ?? row.productId}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5 font-sans">{row.sku} · {row.variant}</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-black/[0.04]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3 text-center">
            <StatBlock label="On hand" value={row.onHand} />
            <StatBlock label="Reserved" value={row.reserved} />
            <StatBlock label="Available" value={row.onHand - row.reserved} tone="gold" />
          </div>

          <div>
            <div className="text-[12px] font-medium text-ink mb-1">Warehouse</div>
            <div className="text-[13px] text-muted-foreground">{wh?.name} <span className="font-sans">({wh?.code})</span></div>
          </div>

          {product?.category === "clothing" && product.sizes.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Customer size display</div>
                <button
                  type="button"
                  onClick={applyDesignerSizing}
                  className="h-8 rounded-md border border-black/10 px-2.5 text-[11px] font-semibold text-ink hover:bg-black/[0.04]"
                >
                  Use designer sizes
                </button>
              </div>
              <p className="mb-2 text-[11px] text-muted-foreground">Designer scale: XS (44), S (46), M (48), L (50), XL (52), XXL (54).</p>
              <div className="space-y-2">
                {product.sizes.map((size) => (
                  <label key={size} className="grid grid-cols-[64px_1fr] items-center gap-2">
                    <span className="text-[12px] font-semibold text-ink">{size}</span>
                    <input
                      value={sizeLabels[size] ?? ""}
                      onChange={(event) => setSizeLabels((labels) => ({ ...labels, [size]: event.target.value }))}
                      placeholder={`${size} - Full size name`}
                      className="h-9 rounded-md border border-black/10 px-3 text-[13px]"
                    />
                  </label>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-[12px] font-medium text-ink">Model fit information</span>
                <textarea
                  value={modelFit}
                  onChange={(event) => setModelFit(event.target.value)}
                  placeholder="Example: Model is 6'1 and wears size M."
                  rows={3}
                  className="w-full resize-none rounded-md border border-black/10 px-3 py-2 text-[13px]"
                />
              </label>
              <button
                onClick={() => {
                  const cleaned = Object.fromEntries(Object.entries(sizeLabels).filter(([, label]) => label.trim()));
                  void onSaveSizing({ sizeLabels: cleaned, modelFit: modelFit.trim() });
                }}
                className="mt-2 h-9 w-full rounded-md bg-ink text-[13px] font-medium text-white hover:opacity-90"
              >
                Save size display
              </button>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">Stock variants and SKUs remain unchanged.</p>
            </section>
          )}

          {/* Adjust */}
          <section>
            <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground mb-2">Adjust stock</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDelta((d) => d - 1)} className="h-9 w-9 grid place-items-center rounded-md border border-black/10 hover:bg-black/[0.04]"><Minus className="h-4 w-4" /></button>
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(parseInt(e.target.value || "0", 10))}
                className="w-24 h-9 text-center border border-black/10 rounded-md text-[13px]"
              />
              <button onClick={() => setDelta((d) => d + 1)} className="h-9 w-9 grid place-items-center rounded-md border border-black/10 hover:bg-black/[0.04]"><Plus className="h-4 w-4" /></button>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason (e.g. cycle count)"
                className="flex-1 h-9 px-3 border border-black/10 rounded-md text-[13px]"
              />
            </div>
            <button
              onClick={() => { if (delta !== 0) { onAdjust(delta, note || "Manual adjustment"); setDelta(1); setNote(""); } }}
              className="mt-2 w-full h-9 rounded-md bg-ink text-white text-[13px] font-medium hover:opacity-90"
            >
              Apply adjustment
            </button>
          </section>

          {/* Reorder */}
          <section>
            <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground mb-2">Reorder point</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={rp}
                onChange={(e) => setRp(Math.max(0, parseInt(e.target.value || "0", 10)))}
                className="w-24 h-9 px-3 border border-black/10 rounded-md text-[13px]"
              />
              <button
                onClick={() => onSetReorder(rp)}
                className="h-9 px-3 rounded-md border border-black/10 hover:bg-black/[0.04] text-[13px] font-medium"
              >
                Save
              </button>
              <div className="text-[12px] text-muted-foreground">Alert when on-hand ≤ this value</div>
            </div>
          </section>

          {/* Transfer */}
          <section>
            <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer to warehouse
            </div>
            <div className="flex items-center gap-2">
              <select
                value={toW}
                onChange={(e) => setToW(e.target.value)}
                className="flex-1 h-9 px-2 border border-black/10 rounded-md text-[13px]"
              >
                {WAREHOUSES.filter((w) => w.id !== row.warehouseId).map((w) => (
                  <option key={w.id} value={w.id}>{w.code} · {w.city}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={row.onHand}
                value={tqty}
                onChange={(e) => setTqty(Math.max(1, parseInt(e.target.value || "1", 10)))}
                className="w-20 h-9 px-3 border border-black/10 rounded-md text-[13px]"
              />
            </div>
            <button
              onClick={() => { if (toW && tqty > 0 && tqty <= row.onHand) { onTransfer(toW, tqty, note || "Stock transfer"); setTqty(1); } }}
              disabled={row.onHand === 0}
              className="mt-2 w-full h-9 rounded-md border border-ink text-ink text-[13px] font-medium hover:bg-ink hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-ink"
            >
              Transfer {tqty} unit{tqty === 1 ? "" : "s"}
            </button>
          </section>

          <div className="text-[11px] text-muted-foreground pt-2 border-t border-black/[0.06]">
            Unit cost: <span className="font-medium text-ink">{naira(row.cost)}</span> · Stock value: <span className="font-medium text-ink">{naira(row.cost * row.onHand)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function StatBlock({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "gold" }) {
  return (
    <div className={`rounded-lg border border-black/[0.06] py-3 ${tone === "gold" ? "bg-gold/10" : "bg-black/[0.02]"}`}>
      <div className={`font-display text-2xl ${tone === "gold" ? "text-gold-deep" : "text-ink"}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function MovementsPanel({
  movements, onClose,
}: { movements: ReturnType<typeof useInventory.getState>["movements"]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-2xl flex flex-col">
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <div className="font-display text-lg text-ink">Stock movements</div>
            <div className="text-[12px] text-muted-foreground">Adjustments and transfers, most recent first</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-black/[0.04]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {movements.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-[13px]">No movements yet. Adjust or transfer stock to see history here.</div>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {movements.map((m) => {
                const wh = WAREHOUSES.find((w) => w.id === m.warehouseId);
                const positive = m.qty > 0;
                return (
                  <li key={m.id} className="p-4 flex items-start gap-3">
                    <div className={`h-8 w-8 grid place-items-center rounded-full shrink-0 ${positive ? "bg-muted text-ink" : "bg-rose-50 text-rose-700"}`}>
                      {positive ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-[12px] text-ink">{m.sku}</span>
                        <Chip tone={m.type === "transfer" ? "blue" : "neutral"}>{m.type}</Chip>
                        <span className={`ml-auto font-medium ${positive ? "text-ink" : "text-rose-700"}`}>{positive ? "+" : ""}{m.qty}</span>
                      </div>
                      <div className="text-[12px] text-muted-foreground mt-0.5">
                        {wh?.code} · {m.note}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(m.ts).toLocaleString()} · {m.user}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
