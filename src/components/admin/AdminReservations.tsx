import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarClock, CheckCircle2, ChevronRight, Package, Search, XCircle,
} from "lucide-react";
import { Card, Chip, naira } from "./ui";
import { useReservations, type Reservation } from "@/lib/reservations-store";

export function AdminReservations({ embedded = false }: { embedded?: boolean }) {
  const { items, hydrated, hydrate, cancel } = useReservations();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "Reserved" | "Cancelled">("all");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items
      .filter((r) => (tab === "all" ? true : r.status === tab))
      .filter((r) => {
        if (!query) return true;
        return [r.id, r.productName, r.brand, r.dropId, r.size]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query));
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [items, q, tab]);

  const kpis = useMemo(() => {
    const active = items.filter((r) => r.status === "Reserved");
    const cancelled = items.filter((r) => r.status === "Cancelled");
    const deposits = active.reduce((n, r) => n + r.deposit, 0);
    return { total: items.length, active: active.length, cancelled: cancelled.length, deposits };
  }, [items]);

  return (
    <div className={embedded ? "space-y-6" : "p-6 max-w-[1400px] mx-auto space-y-6"}>
      {!embedded && (
        <header>
          <div className="flex items-center gap-2 text-xs text-ink/50 mb-2">
            <Link to="/" className="hover:text-ink">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <span>Catalog</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-ink">Reservations</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Drop reservations</h1>
          <p className="text-sm text-ink/60 mt-1">
            Deposit holds across upcoming and live drops. Cancel to release allocation and refund per settings.
          </p>
        </header>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: String(kpis.total), icon: Package },
          { label: "Active", value: String(kpis.active), icon: CalendarClock },
          { label: "Cancelled", value: String(kpis.cancelled), icon: XCircle },
          { label: "Deposits held", value: naira(kpis.deposits), icon: CheckCircle2 },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} padded={false} className="p-4">
              <div className="flex items-center gap-2 text-[11px] text-ink/50 uppercase tracking-wide">
                <Icon className="w-3.5 h-3.5" /> {k.label}
              </div>
              <div className="font-display text-xl mt-2">{k.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reservation, product, brand…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-black/10 bg-white text-sm"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-black/10 p-1 bg-white">
          {(["all", "Reserved", "Cancelled"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`h-8 px-3 rounded-md text-[12px] font-medium ${
                tab === t ? "bg-ink text-white" : "text-ink/70 hover:bg-black/[0.04]"
              }`}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
      </div>

      {!hydrated ? (
        <Card><div className="text-sm text-muted-foreground p-2">Loading reservations…</div></Card>
      ) : filtered.length === 0 ? (
        <Card><div className="text-sm text-muted-foreground p-2">No reservations match.</div></Card>
      ) : (
        <div className="border border-black/[0.06] rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Reservation</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Drop</th>
                <th className="px-4 py-3">Deposit</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <ReservationRow key={r.apiId || r.id} r={r} onCancel={() => void cancel(r.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReservationRow({ r, onCancel }: { r: Reservation; onCancel: () => void }) {
  const release = r.releaseAt
    ? new Date(r.releaseAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";
  return (
    <tr className="border-t border-black/[0.06]">
      <td className="px-4 py-3">
        <div className="font-medium">{r.id}</div>
        <div className="text-[11px] text-muted-foreground">
          {new Date(r.createdAt).toLocaleString()}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <img src={r.image} alt="" className="h-9 w-9 rounded object-cover bg-black/[0.04]" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{r.brand || "—"}</div>
            <div className="font-medium truncate max-w-[220px]">{r.productName || "Product"}</div>
            {r.size && <div className="text-[11px] text-muted-foreground">Size {r.size}</div>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-[12px] font-mono text-ink/80 truncate max-w-[120px]">{r.dropId || "—"}</div>
        <div className="text-[11px] text-muted-foreground">Release {release}</div>
      </td>
      <td className="px-4 py-3 font-medium">{naira(r.deposit)}</td>
      <td className="px-4 py-3">{naira(r.balance)}</td>
      <td className="px-4 py-3">
        <Chip tone={r.status === "Reserved" ? "amber" : "slate"}>{r.status}</Chip>
      </td>
      <td className="px-4 py-3 text-right">
        {r.status === "Reserved" && (
          <button
            onClick={() => {
              if (confirm(`Cancel reservation ${r.id}? Deposit refund follows store settings.`)) onCancel();
            }}
            className="text-[12px] font-medium text-rose-600 hover:underline"
          >
            Cancel
          </button>
        )}
      </td>
    </tr>
  );
}
