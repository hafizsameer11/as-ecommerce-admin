import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./AdminShell";
import { Card, Chip, TableWrap, naira } from "./ui";
import { Mail, Bell, TrendingUp, X } from "lucide-react";
import { commerceAdminApi, koboToNaira, type AbandonedCartRow } from "@/lib/api/commerce";

type Stage = "Just abandoned" | "Reminder 1 sent" | "Reminder 2 sent" | "Recovered" | "Lost";

type Cart = {
  id: string;
  ref: string;
  customer: string;
  email: string | null;
  items: { image: string; name: string; price: number }[];
  total: number;
  stage: Stage;
  abandonedAt: string;
  channel: string;
};

function mapRow(r: AbandonedCartRow): Cart {
  const stage = (r.stage as Stage) || "Just abandoned";
  const abandoned = r.abandonedAt
    ? new Date(r.abandonedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
  return {
    id: r.id,
    ref: r.ref || r.id,
    customer: r.customer,
    email: r.email,
    items: (r.items ?? []).map((it) => ({
      image: it.image || "",
      name: it.name,
      price: koboToNaira(it.price),
    })),
    total: koboToNaira(r.total),
    stage,
    abandonedAt: abandoned,
    channel: r.channel,
  };
}

const stageTone = (s: Stage) =>
  s === "Recovered" ? "green" : s === "Lost" ? "red" : s.includes("Reminder") ? "amber" : "blue";

export function AbandonedCarts() {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      setLoading(true);
      const { data } = await commerceAdminApi.listAbandonedCarts();
      setCarts(data.map(mapRow));
    } catch (err) {
      console.warn("[abandoned-carts]", err);
      toast.error(err instanceof Error ? err.message : "Failed to load abandoned carts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const advance = async (id: string, channel: "Email" | "Push") => {
    const cart = carts.find((c) => c.id === id);
    if (!cart) return;
    if (channel === "Email" && !cart.email) {
      toast.error("No email captured for this cart");
      return;
    }
    if (cart.stage === "Recovered" || cart.stage === "Lost") {
      toast.error(`Cart is ${cart.stage.toLowerCase()} - no reminder sent`);
      return;
    }
    try {
      await commerceAdminApi.remindCart(id, channel === "Email" ? "email" : "push");
      toast.success(`${channel} reminder sent to ${cart.customer}`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reminder failed");
    }
  };

  const bulk = async () => {
    try {
      await commerceAdminApi.remindCartsBulk();
      toast.success("Bulk reminder queued");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk reminder failed");
    }
  };

  const active = useMemo(() => carts.filter((c) => c.stage !== "Recovered" && c.stage !== "Lost").length, [carts]);
  const recovered = useMemo(() => carts.filter((c) => c.stage === "Recovered").length, [carts]);
  const totalValue = useMemo(() => carts.reduce((n, c) => n + c.total, 0), [carts]);
  const recoveryRate = carts.length ? Math.round((recovered / carts.length) * 1000) / 10 : 0;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Abandoned Carts"
        subtitle="Recover checkouts with automated nudges and one-click outreach"
        actions={
          <>
            <button onClick={() => setShowRules(true)} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5 hover:bg-black/5"><TrendingUp className="h-3.5 w-3.5" /> Recovery rules</button>
            <button onClick={() => void bulk()} className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium hover:opacity-90">Send bulk reminder</button>
          </>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Active carts</div><div className="font-display text-2xl font-bold mt-1">{loading ? "…" : active}</div></Card>
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Recovered</div><div className="font-display text-2xl font-bold mt-1 text-ink">{recovered}</div></Card>
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Recovery rate</div><div className="font-display text-2xl font-bold mt-1">{recoveryRate}%</div></Card>
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Value at risk</div><div className="font-display text-2xl font-bold mt-1">{naira(totalValue)}</div></Card>
      </div>

      <TableWrap>
        <table className="w-full text-[13px]">
          <thead className="bg-black/[0.02] text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium">Cart</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Items</th>
              <th className="px-4 py-2.5 font-medium">Channel</th>
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium">Abandoned</th>
              <th className="px-4 py-2.5 font-medium text-right">Value</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {carts.map((c) => (
              <tr key={c.id} className="border-t border-black/[0.06] hover:bg-black/[0.02]">
                <td className="px-4 py-3 font-medium">{c.ref}</td>
                <td className="px-4 py-3">
                  <div className="truncate max-w-[180px]">{c.customer}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{c.email ?? "No email captured"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex -space-x-2">
                    {c.items.map((it, idx) => (
                      <div key={idx} className="w-8 h-8 rounded border border-white bg-[#f2f2f2] overflow-hidden">
                        {it.image ? <img src={it.image} alt="" className="w-full h-full object-contain" /> : null}
                      </div>
                    ))}
                    <span className="pl-3 text-[12px] text-muted-foreground self-center">{c.items.length} item{c.items.length === 1 ? "" : "s"}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><Chip tone="neutral">{c.channel}</Chip></td>
                <td className="px-4 py-3"><Chip tone={stageTone(c.stage) as any}>{c.stage}</Chip></td>
                <td className="px-4 py-3 text-muted-foreground">{c.abandonedAt}</td>
                <td className="px-4 py-3 text-right font-medium">{naira(c.total)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => void advance(c.id, "Email")} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]" title="Email"><Mail className="h-3.5 w-3.5" /></button>
                    <button onClick={() => void advance(c.id, "Push")} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]" title="Push"><Bell className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && carts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No abandoned carts</td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>

      {showRules && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowRules(false)} />
          <aside className="fixed right-0 top-0 bottom-0 w-[420px] bg-white z-50 border-l border-border flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-[18px]">Recovery rules</div>
                <div className="text-[11px] text-muted-foreground">Automated nudge cadence</div>
              </div>
              <button onClick={() => setShowRules(false)} className="h-8 w-8 grid place-items-center rounded hover:bg-black/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-[13px]">
              {[
                { label: "Reminder 1 · Email", delay: "1 hour after abandon", enabled: true },
                { label: "Reminder 2 · Push", delay: "6 hours after abandon", enabled: true },
                { label: "Reminder 3 · Email + 5% coupon", delay: "24 hours after abandon", enabled: false },
                { label: "Lost after", delay: "72 hours with no activity", enabled: true },
              ].map((r, i) => (
                <div key={i} className="border border-border rounded-md p-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{r.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{r.delay}</div>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={r.enabled} className="peer sr-only" />
                    <span className="w-9 h-5 bg-black/10 rounded-full peer-checked:bg-ink relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" />
                  </label>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-border">
              <button onClick={() => { setShowRules(false); toast.success("Recovery rules saved"); }} className="w-full h-10 rounded-md bg-ink text-white text-[13px] font-semibold hover:bg-ink/90">Save rules</button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
