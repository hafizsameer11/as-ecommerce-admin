import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/AdminShell";
import { useActivity, type ActivityType } from "@/lib/admin-activity-store";
import {
  ShoppingBag, Package, RotateCcw, Sparkles, Star, Wallet, AlertTriangle,
} from "lucide-react";

const ACT_LINK: Partial<Record<ActivityType, string>> = {
  "order.placed": "/orders",
  "order.shipped": "/orders",
  "order.refunded": "/returns",
  "concierge.requested": "/orders",
  "concierge.quoted": "/orders",
  "concierge.approved": "/orders",
  "catalog.updated": "/orders",
  "payout.pending": "/transactions",
  "review.submitted": "/activity",
  "coupon.minted": "/activity",
  "stock.low": "/activity",
  system: "/activity",
};


export const Route = createFileRoute("/_app/activity")({
  head: () => ({
    meta: [
      { title: "Live Activity · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ActivityPage,
});

const META: Record<ActivityType, { label: string; color: string; icon: any }> = {
  "order.placed": { label: "Order placed", color: "bg-ink text-white", icon: ShoppingBag },
  "order.shipped": { label: "Order shipped", color: "bg-sky-100 text-sky-700", icon: Package },
  "order.refunded": { label: "Refund", color: "bg-rose-100 text-rose-700", icon: RotateCcw },
  "concierge.requested": { label: "Concierge requested", color: "bg-amber-100 text-amber-700", icon: Sparkles },
  "concierge.quoted": { label: "Concierge quoted", color: "bg-amber-100 text-amber-700", icon: Sparkles },
  "concierge.approved": { label: "Concierge approved", color: "bg-ink text-white", icon: Sparkles },
  "catalog.updated": { label: "Catalog", color: "bg-zinc-100 text-zinc-700", icon: Package },
  "review.submitted": { label: "Review", color: "bg-amber-100 text-amber-700", icon: Star },
  "coupon.minted": { label: "Coupon", color: "bg-violet-100 text-violet-700", icon: Wallet },
  "payout.pending": { label: "Payout", color: "bg-amber-100 text-amber-700", icon: Wallet },
  "stock.low": { label: "Low stock", color: "bg-rose-100 text-rose-700", icon: AlertTriangle },
  system: { label: "System", color: "bg-zinc-100 text-zinc-700", icon: Sparkles },
};

const FILTERS: { id: "all" | ActivityType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "order.placed", label: "Orders" },
  { id: "concierge.requested", label: "Concierge" },
  { id: "review.submitted", label: "Reviews" },
  { id: "stock.low", label: "Inventory" },
  { id: "payout.pending", label: "Finance" },
];


function ActivityPage() {
  const entries = useActivity((s) => s.entries);
  const hydrate = useActivity((s) => s.hydrate);
  const clear = useActivity((s) => s.clear);
  const [filter, setFilter] = useState<"all" | ActivityType>("all");
  const [live, setLive] = useState(false);

  useEffect(() => {
    const type =
      filter === "all"
        ? undefined
        : filter.startsWith("order.")
          ? "order.*"
          : filter.startsWith("concierge.")
            ? "concierge.*"
            : String(filter);
    void hydrate({ type });
  }, [hydrate, filter]);

  useEffect(() => {
    if (!live) return;
    const type =
      filter === "all"
        ? undefined
        : filter.startsWith("order.")
          ? "order.*"
          : filter.startsWith("concierge.")
            ? "concierge.*"
            : String(filter);
    const id = setInterval(() => {
      void hydrate({ type });
    }, 8000);
    return () => clearInterval(id);
  }, [live, hydrate, filter]);

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        if (filter === "all") return true;
        if (filter === "order.placed") return e.type.startsWith("order.");
        if (filter === "concierge.requested") return e.type.startsWith("concierge.");
        return e.type === filter;
      }),
    [entries, filter],
  );

  const onReset = () => {
    if (confirm("Reload the activity feed from the server?")) {
      clear();
    }
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <PageHeader
        title="Live Activity"
        subtitle="Real-time stream of every operational event across the store"
        actions={
          <>
            <button
              onClick={() => setLive((v) => !v)}
              className={`h-9 px-3 rounded-md border text-[12px] font-semibold flex items-center gap-2 transition-colors ${
                live ? "bg-ink border-ink text-white" : "bg-white border-border hover:bg-black/5"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${live ? "bg-ink animate-pulse" : "bg-muted-foreground"}`} />
              {live ? "Live · streaming" : "Go live"}
            </button>
            <button onClick={onReset} className="h-9 px-3 rounded-md bg-ink text-white text-[12px] font-semibold hover:bg-ink/90">
              Reset feed
            </button>
          </>
        }
      />

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`h-8 px-3 rounded-full text-[12px] font-semibold border transition-colors ${
              filter === f.id ? "bg-ink text-white border-ink" : "bg-white border-border hover:bg-black/5"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-border rounded-lg divide-y divide-border">
        {filtered.map((e) => {
          const meta = META[e.type as keyof typeof META] ?? META.system;
          const Icon = meta.icon;
          const href = e.link || ACT_LINK[e.type as keyof typeof ACT_LINK] || "/activity";
          return (
            <Link key={e.id} to={href} className="px-5 py-3.5 flex items-start gap-3 hover:bg-[#faf8f3] transition-colors">
              <div className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${meta.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {meta.label}
                  </span>
                  {e.amount != null && (
                    <span className="text-[11px] font-bold tabular-nums text-gold">
                      ₦{e.amount.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="text-[13.5px] font-medium leading-snug mt-0.5">{e.title}</div>
                {e.meta && <div className="text-[11.5px] text-muted-foreground mt-0.5">{e.meta}</div>}
              </div>
              <div className="text-[11px] text-muted-foreground shrink-0 pt-1">{timeAgo(e.at)}</div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-[13px]">No activity in this filter.</div>
        )}
      </div>
    </div>
  );
}

function timeAgo(t: number) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

