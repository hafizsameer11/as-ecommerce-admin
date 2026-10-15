import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock, Plus, Search, Radio, Square, Pencil, X,
} from "lucide-react";
import { Card, Chip, naira } from "./ui";
import { useDrops, type AdminDrop, type DropStatus } from "@/lib/drops-store";
import { productsAdminApi } from "@/lib/api/products-admin";

const STATUS_TONE: Record<DropStatus, "blue" | "green" | "amber" | "slate"> = {
  upcoming: "blue",
  live: "green",
  sold_out: "amber",
  ended: "slate",
};

const TABS: { id: "all" | DropStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "live", label: "Live" },
  { id: "sold_out", label: "Sold out" },
  { id: "ended", label: "Ended" },
];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string) {
  return new Date(local).toISOString();
}

export function AdminDrops({ embedded = false }: { embedded?: boolean }) {
  const { drops, tabs, hydrated, hydrate, create, update, goLive, end } = useDrops();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | DropStatus>("all");
  const [formOpen, setFormOpen] = useState<"create" | AdminDrop | null>(null);

  useEffect(() => {
    void hydrate({ tab: "all" });
  }, [hydrate]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return drops
      .filter((d) => (tab === "all" ? true : d.status === tab))
      .filter((d) => {
        if (!query) return true;
        return [d.productName, d.brand, d.productHandle, d.id]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => new Date(a.releaseAt).getTime() - new Date(b.releaseAt).getTime());
  }, [drops, q, tab]);

  const kpis = useMemo(() => {
    const upcoming = tabs.upcoming ?? drops.filter((d) => d.status === "upcoming").length;
    const live = (tabs.live ?? 0) + (tabs.sold_out ?? 0) || drops.filter((d) => d.status === "live" || d.status === "sold_out").length;
    const allocation = drops.reduce((n, d) => n + d.allocation, 0);
    const reserved = drops.reduce((n, d) => n + d.reservedCount, 0);
    return { total: tabs.all ?? drops.length, upcoming, live, allocation, reserved };
  }, [drops, tabs]);

  return (
    <div className={embedded ? "space-y-6" : "p-6 max-w-[1400px] mx-auto space-y-6"}>
      {!embedded && (
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Drops</h1>
          <p className="text-sm text-ink/60 mt-1">
            Schedule releases, set allocation and deposit %, then go live or end a drop.
          </p>
        </header>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Drops", value: String(kpis.total) },
          { label: "Upcoming", value: String(kpis.upcoming) },
          { label: "Live", value: String(kpis.live) },
          { label: "Reserved / Alloc", value: `${kpis.reserved} / ${kpis.allocation}` },
        ].map((k) => (
          <Card key={k.label} padded={false} className="p-4">
            <div className="text-[11px] text-ink/50 uppercase tracking-wide">{k.label}</div>
            <div className="font-display text-xl mt-2">{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product, brand, drop…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-black/10 bg-white text-sm"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-black/10 p-1 bg-white">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`h-8 px-3 rounded-md text-[12px] font-medium ${
                tab === t.id ? "bg-ink text-white" : "text-ink/70 hover:bg-black/[0.04]"
              }`}
            >
              {t.label}
              {typeof tabs[t.id] === "number" && (
                <span className="ml-1 opacity-70">{tabs[t.id]}</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFormOpen("create")}
          className="h-10 px-3 rounded-lg bg-ink text-white text-[13px] inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> New drop
        </button>
      </div>

      {!hydrated ? (
        <Card><div className="text-sm text-muted-foreground p-2">Loading drops…</div></Card>
      ) : filtered.length === 0 ? (
        <Card><div className="text-sm text-muted-foreground p-2">No drops match.</div></Card>
      ) : (
        <div className="border border-black/[0.06] rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Release</th>
                <th className="px-4 py-3">Allocation</th>
                <th className="px-4 py-3">Deposit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-black/[0.06]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={d.image} alt="" className="h-9 w-9 rounded object-cover bg-black/[0.04]" />
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{d.brand}</div>
                        <div className="font-medium truncate max-w-[240px]">{d.productName}</div>
                        <div className="text-[11px] text-muted-foreground">{naira(d.price)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-ink/40" />
                      {new Date(d.releaseAt).toLocaleString("en-NG", {
                        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{d.reservedCount} / {d.allocation}</div>
                    <div className="text-[11px] text-muted-foreground">{d.remaining} left · {d.fillPct}% fill</div>
                  </td>
                  <td className="px-4 py-3">{d.depositPct}%</td>
                  <td className="px-4 py-3">
                    <Chip tone={STATUS_TONE[d.status]}>{d.statusLabel || d.status}</Chip>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Edit"
                        onClick={() => setFormOpen(d)}
                        className="h-8 w-8 grid place-items-center rounded-md border border-black/10 hover:bg-black/[0.04]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {d.status === "upcoming" && (
                        <button
                          title="Go live"
                          onClick={async () => {
                            if (!confirm(`Go live with ${d.productName}?`)) return;
                            try {
                              await goLive(d.id);
                              toast.success("Drop is live");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Go live failed");
                            }
                          }}
                          className="h-8 px-2 rounded-md border border-black/10 text-[11px] font-medium inline-flex items-center gap-1 hover:bg-black/[0.04]"
                        >
                          <Radio className="h-3.5 w-3.5" /> Live
                        </button>
                      )}
                      {(d.status === "live" || d.status === "sold_out" || d.status === "upcoming") && (
                        <button
                          title="End drop"
                          onClick={async () => {
                            if (!confirm(`End drop for ${d.productName}? Outstanding reservations will be cancelled.`)) return;
                            try {
                              await end(d.id);
                              toast.success("Drop ended");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "End failed");
                            }
                          }}
                          className="h-8 px-2 rounded-md border border-rose-200 text-rose-600 text-[11px] font-medium inline-flex items-center gap-1 hover:bg-rose-50"
                        >
                          <Square className="h-3 w-3" /> End
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <DropFormDialog
          initial={formOpen === "create" ? null : formOpen}
          onClose={() => setFormOpen(null)}
          onSubmit={async (body) => {
            try {
              if (formOpen === "create") {
                await create(body);
                toast.success("Drop created");
              } else {
                await update(formOpen.id, {
                  releaseAt: body.releaseAt,
                  allocation: body.allocation,
                  depositPct: body.depositPct,
                  teaser: body.teaser,
                });
                toast.success("Drop updated");
              }
              setFormOpen(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Save failed");
            }
          }}
        />
      )}
    </div>
  );
}

function DropFormDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial: AdminDrop | null;
  onClose: () => void;
  onSubmit: (body: {
    productId: string;
    releaseAt: string;
    allocation: number;
    depositPct: number;
    teaser: string | null;
  }) => Promise<void>;
}) {
  const [productId, setProductId] = useState(initial?.productHandle || initial?.productId || "");
  const [releaseAt, setReleaseAt] = useState(
    toLocalInput(initial?.releaseAt || new Date(Date.now() + 7 * 86400000).toISOString()),
  );
  const [allocation, setAllocation] = useState(String(initial?.allocation ?? 20));
  const [depositPct, setDepositPct] = useState(String(initial?.depositPct ?? 20));
  const [teaser, setTeaser] = useState(initial?.teaser ?? "");
  const [products, setProducts] = useState<{ id: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) return;
    void (async () => {
      try {
        const { data } = await productsAdminApi.list({ pageSize: 200, status: "active" });
        setProducts(
          ((data as { id: string; productId: string; brand: string; name: string }[]) ?? []).map((p) => ({
            id: p.id,
            label: `${p.brand} — ${p.name}`,
          })),
        );
      } catch (err) {
        console.warn("[drops] product options", err);
      }
    })();
  }, [initial]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="font-semibold text-[15px]">{initial ? "Edit drop" : "New drop"}</div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded hover:bg-black/[0.05]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!initial && (
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-ink/50">Product</span>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-9 px-2 rounded-md border border-black/10 text-sm bg-white"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
        )}

        {initial && (
          <div className="rounded-md bg-black/[0.03] px-3 py-2 text-[13px]">
            <div className="text-[11px] uppercase tracking-wider text-ink/50">Product</div>
            <div className="font-medium mt-0.5">{initial.brand} — {initial.productName}</div>
          </div>
        )}

        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-ink/50">Release at</span>
          <input
            type="datetime-local"
            value={releaseAt}
            onChange={(e) => setReleaseAt(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-black/10 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-ink/50">Allocation</span>
            <input
              type="number"
              min={1}
              value={allocation}
              onChange={(e) => setAllocation(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-black/10 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-ink/50">Deposit %</span>
            <input
              type="number"
              min={1}
              max={100}
              value={depositPct}
              onChange={(e) => setDepositPct(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-black/10 text-sm"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-ink/50">Teaser</span>
          <textarea
            value={teaser}
            onChange={(e) => setTeaser(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-black/10 text-sm resize-none"
          />
        </label>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-9 rounded-md border border-black/10 text-[13px]">Cancel</button>
          <button
            disabled={saving || (!initial && !productId) || !releaseAt || Number(allocation) < 1}
            onClick={async () => {
              setSaving(true);
              try {
                await onSubmit({
                  productId: productId || initial!.productHandle || initial!.productId,
                  releaseAt: fromLocalInput(releaseAt),
                  allocation: Math.max(1, Number(allocation) || 1),
                  depositPct: Math.min(100, Math.max(1, Number(depositPct) || 20)),
                  teaser: teaser.trim() || null,
                });
              } finally {
                setSaving(false);
              }
            }}
            className="flex-1 h-9 rounded-md bg-ink text-white text-[13px] disabled:opacity-40"
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Create drop"}
          </button>
        </div>
      </div>
    </div>
  );
}
