import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Filter, Download, ArrowUpDown, ChevronRight, X, ChevronLeft } from "lucide-react";
import type { OrderStatus } from "@/components/account/ordersData";
import { PageHeader } from "./AdminShell";
import { Card, Chip, StatusPill, TableWrap, naira, Empty } from "./ui";
import { downloadCSV } from "@/lib/admin-export";
import { ordersAdminApi, koboToNaira, type AdminOrderRow } from "@/lib/api/orders";

const STATUS_TABS = ["All", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"] as const;
type SortKey = "date" | "total";
const PAGE_SIZE = 12;

type AdminOrderView = {
  id: string;
  apiId: string;
  status: OrderStatus;
  total: number;
  placedAt: number;
  payment: string;
  contact: { email?: string } | null;
  items: { name: string }[];
  date: string;
  itemsCount: number;
};

function normalizeStatus(s: string): OrderStatus {
  const key = (s || "").toLowerCase();
  if (key.includes("ship") || key.includes("out_for")) return "Shipped";
  if (key.includes("deliver")) return "Delivered";
  if (key.includes("cancel")) return "Cancelled";
  if (key.includes("return") || key.includes("refund")) return "Returned";
  return "Processing";
}

function mapRow(o: AdminOrderRow): AdminOrderView {
  const placed = o.placedAt ? new Date(o.placedAt) : new Date();
  return {
    id: o.number || o.id,
    apiId: o.id,
    status: normalizeStatus(o.statusLabel || o.status),
    total: koboToNaira(o.total),
    placedAt: placed.getTime(),
    payment: o.paymentMethod || "paystack",
    contact: { email: o.customer?.email ?? o.customerEmail ?? undefined },
    items: [],
    date: placed.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    itemsCount: o.itemsCount ?? 0,
  };
}

type OrderListMeta = {
  kpis?: Record<string, unknown>;
  tabs?: Record<string, number>;
};

export function OrdersTable() {
  const [orders, setOrders] = useState<AdminOrderView[]>([]);
  const [listMeta, setListMeta] = useState<OrderListMeta>({});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("All");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDesc, setSortDesc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [payment, setPayment] = useState<string>("all");
  const [minTotal, setMinTotal] = useState<string>("");
  const [maxTotal, setMaxTotal] = useState<string>("");
  const [page, setPage] = useState(1);

  const reload = async () => {
    try {
      const { data, meta } = await ordersAdminApi.list();
      setOrders(data.map(mapRow));
      if (meta) setListMeta({ kpis: meta.kpis as Record<string, unknown>, tabs: meta.tabs as Record<string, number> });
    } catch (err) {
      console.warn("[admin-orders]", err);
      toast.error(err instanceof Error ? err.message : "Failed to load orders");
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const updateStatus = async (ids: string[], next: OrderStatus) => {
    const statusMap: Record<OrderStatus, string> = {
      Processing: "processing",
      Shipped: "shipped",
      Delivered: "delivered",
      Cancelled: "cancelled",
      Returned: "returned",
    };
    try {
      await Promise.all(
        ids.map((id) => {
          const row = orders.find((o) => o.id === id);
          return ordersAdminApi.setStatus(row?.apiId ?? id, statusMap[next]);
        })
      );
      setOrders((xs) => xs.map((o) => (ids.includes(o.id) ? { ...o, status: next } : o)));
      toast.success(`Updated ${ids.length} order(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const min = minTotal ? parseInt(minTotal, 10) : -Infinity;
    const max = maxTotal ? parseInt(maxTotal, 10) : Infinity;
    let list = orders.filter((o) => {
      if (status !== "All" && o.status !== status) return false;
      if (payment !== "all" && o.payment !== payment) return false;
      if (o.total < min || o.total > max) return false;
      if (!term) return true;
      return (
        o.id.toLowerCase().includes(term) ||
        o.items.some((i) => i.name.toLowerCase().includes(term)) ||
        (o.contact?.email ?? "").toLowerCase().includes(term)
      );
    });
    list = [...list].sort((a, b) => {
      const av = sortKey === "date" ? a.placedAt : a.total;
      const bv = sortKey === "date" ? b.placedAt : b.total;
      return sortDesc ? bv - av : av - bv;
    });
    return list;
  }, [orders, q, status, sortKey, sortDesc, payment, minTotal, maxTotal]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalValue = filtered.reduce((n, o) => n + o.total, 0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc((s) => !s);
    else { setSortKey(key); setSortDesc(true); }
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    const ids = pageRows.map((o) => o.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const exportRows = (rows: typeof orders) =>
    downloadCSV(
      `asl-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((o) => ({
        id: o.id, date: o.date, status: o.status, items: o.itemsCount,
        payment: o.payment, total: o.total, customer: o.contact?.email ?? "guest",
      })),
    );

  const resetFilters = () => { setPayment("all"); setMinTotal(""); setMaxTotal(""); setPage(1); };
  const activeFilters = (payment !== "all" ? 1 : 0) + (minTotal ? 1 : 0) + (maxTotal ? 1 : 0);

  const bulkStatus = (status: OrderStatus, _verb: string) => {
    const ids = [...selected];
    void updateStatus(ids, status);
    setSelected(new Set());
  };
  const bulkCancel = async () => {
    const ids = [...selected];
    if (!confirm(`Cancel ${ids.length} order(s)? Refunds may apply.`)) return;
    try {
      await Promise.all(
        ids.map((id) => {
          const row = orders.find((o) => o.id === id);
          return ordersAdminApi.cancel(row?.apiId ?? id, {
            reason: "Cancelled by admin (bulk)",
            refundTo: "original",
          });
        }),
      );
      setOrders((xs) => xs.map((o) => (ids.includes(o.id) ? { ...o, status: "Cancelled" as OrderStatus } : o)));
      toast.success(`Cancelled ${ids.length} order(s)`);
      setSelected(new Set());
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk cancel failed");
    }
  };
  const bulkPrint = () => {
    toast.success(`Packing slips queued for ${selected.size} order(s)`);
    setSelected(new Set());
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Orders"
        subtitle={`${filtered.length} of ${orders.length} orders · ${naira(totalValue)} filtered value`}
        actions={
          <>
            <div className="relative">
              <button
                onClick={() => setShowExport((v) => !v)}
                className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5 hover:bg-black/[0.04]"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              {showExport && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowExport(false)} />
                  <div className="absolute right-0 top-10 z-30 w-56 bg-white border border-border rounded-md shadow-lg py-1">
                    <button
                      onClick={() => { exportRows(filtered); setShowExport(false); }}
                      className="w-full text-left px-3 py-2 text-[12px] hover:bg-black/5"
                    >
                      Export filtered ({filtered.length})
                    </button>
                    <button
                      onClick={() => { exportRows(orders); setShowExport(false); }}
                      className="w-full text-left px-3 py-2 text-[12px] hover:bg-black/5"
                    >
                      Export all orders ({orders.length})
                    </button>
                    <button
                      onClick={() => { exportRows(orders.filter((o) => selected.has(o.id))); setShowExport(false); }}
                      disabled={selected.size === 0}
                      className="w-full text-left px-3 py-2 text-[12px] hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Export selected ({selected.size})
                    </button>
                  </div>
                </>
              )}
            </div>
            <Link
              to="/drafts"
              className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium hover:opacity-90 flex items-center"
            >
              + Create order
            </Link>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Open orders",
            value:
              Number(listMeta.kpis?.openOrders ?? listMeta.kpis?.open) ||
              (counts["Processing"] ?? 0) + (counts["Shipped"] ?? 0),
            tone: "amber" as const,
          },
          {
            label: "Unfulfilled",
            value: Number(listMeta.kpis?.unfulfilled ?? counts["Processing"] ?? 0),
            tone: "blue" as const,
          },
          {
            label: "Awaiting payment",
            value:
              Number(listMeta.tabs?.awaiting_payment ?? listMeta.kpis?.awaiting_payment ?? 0),
            tone: "purple" as const,
          },
          {
            label: "This month revenue",
            value: naira(
              Number(listMeta.kpis?.revenue30d ?? 0) ||
                orders.reduce((n, o) => n + o.total, 0),
            ),
            tone: "gold" as const,
          },
        ].map((k) => (
          <Card key={k.label} className="!p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <div className="font-display text-2xl font-bold">{k.value}</div>
              <Chip tone={k.tone}>live</Chip>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 bg-white border border-black/10 rounded-lg p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => { setStatus(t); setPage(1); }}
              className={`text-[12px] px-3 h-7 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                status === t ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"
              }`}
            >
              {t}
              <span className={`text-[10px] px-1.5 rounded-full ${status === t ? "bg-white/20" : "bg-black/[0.05]"}`}>
                {counts[t] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search order #, customer, product…"
            className="h-9 pl-8 pr-3 w-[280px] rounded-md bg-white border border-black/10 text-[13px] focus:outline-none focus:border-ink"
          />
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5 hover:bg-black/[0.04]"
        >
          <Filter className="h-3.5 w-3.5" /> Filters
          {activeFilters > 0 && (
            <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-gold text-white text-[10px] font-bold grid place-items-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 bg-ink text-white rounded-lg px-4 py-2.5 text-[12.5px]">
          <span className="font-semibold">{selected.size} selected</span>
          <span className="text-white/50">·</span>
          <button onClick={() => bulkStatus("Shipped", "marked shipped")} className="hover:text-gold">Mark shipped</button>
          <span className="text-white/30">·</span>
          <button onClick={() => bulkStatus("Delivered", "marked delivered")} className="hover:text-gold">Mark delivered</button>
          <span className="text-white/30">·</span>
          <button onClick={bulkPrint} className="hover:text-gold">Print slips</button>
          <span className="text-white/30">·</span>
          <button onClick={() => exportRows(orders.filter((o) => selected.has(o.id)))} className="hover:text-gold">Export</button>
          <span className="text-white/30">·</span>
          <button onClick={bulkCancel} className="text-rose-300 hover:text-rose-100">Cancel</button>
          <div className="flex-1" />
          <button onClick={() => setSelected(new Set())} className="text-white/60 hover:text-white flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

      <TableWrap>
        <table className="w-full text-[13px]">
          <thead className="bg-black/[0.02] text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium w-8">
                <input
                  type="checkbox"
                  checked={pageRows.length > 0 && pageRows.every((o) => selected.has(o.id))}
                  onChange={togglePage}
                />
              </th>
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-4 py-2.5 font-medium">
                <button className="flex items-center gap-1" onClick={() => toggleSort("date")}>
                  Date <ArrowUpDown className={`h-3 w-3 ${sortKey === "date" ? "text-ink" : ""}`} />
                </button>
              </th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Items</th>
              <th className="px-4 py-2.5 font-medium">Payment</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">
                <button className="flex items-center gap-1 ml-auto" onClick={() => toggleSort("total")}>
                  Total <ArrowUpDown className={`h-3 w-3 ${sortKey === "total" ? "text-ink" : ""}`} />
                </button>
              </th>
              <th className="px-4 py-2.5 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((o) => (
              <tr key={o.id} className="border-t border-black/[0.06] hover:bg-black/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleRow(o.id)} />
                </td>
                <td className="px-4 py-3">
                  <Link to="/orders/$id" params={{ id: o.id }} className="font-medium text-ink hover:text-gold">
                    {o.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{o.date}</td>
                <td className="px-4 py-3">
                  <div className="font-medium truncate max-w-[180px]">
                    {o.contact?.email?.split("@")[0].replace(/[._-]+/g, " ") ?? "Guest"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                    {o.contact?.email ?? " - "}
                  </div>
                </td>
                <td className="px-4 py-3">{o.itemsCount}</td>
                <td className="px-4 py-3">
                  <Chip tone="neutral">{o.payment}</Chip>
                </td>
                <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                <td className="px-4 py-3 text-right font-medium">{naira(o.total)}</td>
                <td className="px-4 py-3">
                  <Link
                    to="/orders/$id"
                    params={{ id: o.id }}
                    className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06] text-muted-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={9}><Empty title="No orders match your filters" sub="Try clearing the search or switching tabs." /></td></tr>
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* Pagination */}
      <div className="mt-3 flex items-center gap-3 text-[12px] text-muted-foreground">
        <span>
          Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="h-8 w-8 grid place-items-center rounded border border-border bg-white disabled:opacity-40 hover:bg-black/5"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="tabular-nums font-semibold text-ink">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="h-8 w-8 grid place-items-center rounded border border-border bg-white disabled:opacity-40 hover:bg-black/5"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Filters side sheet */}
      {showFilters && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowFilters(false)} />
          <aside className="fixed right-0 top-0 bottom-0 w-[380px] bg-white z-50 border-l border-border flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-[18px]">Filters</div>
                <div className="text-[11px] text-muted-foreground">Refine the orders view</div>
              </div>
              <button onClick={() => setShowFilters(false)} className="h-8 w-8 grid place-items-center rounded hover:bg-black/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Payment method</label>
                <select
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  className="mt-1.5 w-full h-10 px-3 rounded-md border border-border bg-white text-[13px]"
                >
                  <option value="all">All methods</option>
                  <option value="paystack">Paystack</option>
                  <option value="flutterwave">Flutterwave</option>
                  <option value="wallet">ASL Wallet</option>
                  <option value="cod">Cash on delivery</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Total (₦)</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <input
                    inputMode="numeric" placeholder="Min"
                    value={minTotal} onChange={(e) => setMinTotal(e.target.value.replace(/\D/g, ""))}
                    className="h-10 px-3 rounded-md border border-border text-[13px]"
                  />
                  <input
                    inputMode="numeric" placeholder="Max"
                    value={maxTotal} onChange={(e) => setMaxTotal(e.target.value.replace(/\D/g, ""))}
                    className="h-10 px-3 rounded-md border border-border text-[13px]"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
              <button onClick={resetFilters} className="flex-1 h-10 rounded-md border border-border bg-white text-[13px] font-semibold hover:bg-black/5">
                Reset
              </button>
              <button onClick={() => { setPage(1); setShowFilters(false); }} className="flex-1 h-10 rounded-md bg-ink text-white text-[13px] font-semibold hover:bg-ink/90">
                Apply
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
