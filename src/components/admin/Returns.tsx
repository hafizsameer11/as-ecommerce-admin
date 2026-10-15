import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./AdminShell";
import { Card, StatusPill, TableWrap, naira } from "./ui";
import { CheckCircle2, XCircle, ArrowRightCircle, X } from "lucide-react";
import { ordersAdminApi, koboToNaira, type AdminReturnRow } from "@/lib/api/orders";

type ReturnStatus =
  | "Awaiting review"
  | "Approved"
  | "In transit back"
  | "Under investigation"
  | "Refunded"
  | "Rejected"
  | "Received";

type RMA = {
  id: string;
  apiId: string;
  order: string;
  customer: string;
  reason: string;
  items: number;
  refund: number;
  status: ReturnStatus;
  statusKey: string;
  requested: string;
};

function mapRow(r: AdminReturnRow): RMA {
  return {
    id: r.number || r.id,
    apiId: r.id,
    order: r.order,
    customer: r.customerName || "Customer",
    reason: r.reason || "",
    items: r.items ?? 1,
    refund: koboToNaira(r.refund ?? 0),
    status: (r.status as ReturnStatus) || "Awaiting review",
    statusKey: r.statusKey,
    requested: r.requested
      ? new Date(r.requested).toLocaleDateString("en-US", { month: "short", day: "2-digit" })
      : "",
  };
}

export function ReturnsPage() {
  const [items, setItems] = useState<RMA[]>([]);
  const [detail, setDetail] = useState<RMA | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ order: "", customer: "", reason: "Size too small", refund: "" });
  const [loading, setLoading] = useState(true);

  const hydrate = async () => {
    try {
      const { data } = await ordersAdminApi.listReturns({ pageSize: 100 });
      setItems(data.map(mapRow));
    } catch (err) {
      console.warn("[returns] hydrate failed", err);
      toast.error("Could not load returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void hydrate();
  }, []);

  const openCount = useMemo(
    () => items.filter((r) => !["Refunded", "Rejected"].includes(r.status)).length,
    [items]
  );
  const refunded30 = useMemo(
    () => items.filter((r) => r.status === "Refunded").reduce((n, r) => n + r.refund, 0),
    [items]
  );

  const runAction = async (id: string, action: "approve" | "reject" | "refund") => {
    const row = items.find((r) => r.id === id);
    if (!row) return;
    try {
      if (action === "approve") await ordersAdminApi.approveReturn(row.apiId);
      else if (action === "reject") {
        if (!confirm(`Reject return ${id}?`)) return;
        await ordersAdminApi.rejectReturn(row.apiId, "Rejected by admin");
      } else await ordersAdminApi.refundReturn(row.apiId);
      toast.success(`${id} · ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "refund issued"}`);
      await hydrate();
      setDetail((d) => {
        if (!d || d.id !== id) return d;
        const updated = items.find((x) => x.id === id);
        return updated ?? d;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not ${action} return`);
    }
  };

  const createRMA = async () => {
    try {
      await ordersAdminApi.createReturn({
        orderNumber: form.order || undefined,
        reason: form.reason,
        refundAmount: form.refund ? Math.round(Number(form.refund) * 100) : undefined,
        customerName: form.customer || undefined,
      });
      setShowNew(false);
      setForm({ order: "", customer: "", reason: "Size too small", refund: "" });
      toast.success("RMA created");
      await hydrate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create RMA");
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Returns & Refunds"
        subtitle="Authorise returns, process refunds, and monitor authenticity claims"
        actions={
          <button onClick={() => setShowNew(true)} className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium hover:opacity-90">
            New RMA
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Open RMAs</div>
          <div className="font-display text-2xl font-bold mt-1">{loading ? "—" : openCount}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Refunded · 30d</div>
          <div className="font-display text-2xl font-bold mt-1">{naira(refunded30)}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Return rate</div>
          <div className="font-display text-2xl font-bold mt-1">—</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg. resolution</div>
          <div className="font-display text-2xl font-bold mt-1">—</div>
        </Card>
      </div>

      <TableWrap>
        <table className="w-full text-[13px]">
          <thead className="bg-black/[0.02] text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium">RMA</th>
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Reason</th>
              <th className="px-4 py-2.5 font-medium">Items</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Requested</th>
              <th className="px-4 py-2.5 font-medium text-right">Refund</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  No returns yet.
                </td>
              </tr>
            ) : null}
            {items.map((r) => (
              <tr
                key={r.apiId}
                className="border-t border-black/[0.06] hover:bg-black/[0.02] cursor-pointer"
                onClick={() => setDetail(r)}
              >
                <td className="px-4 py-3 font-medium">{r.id}</td>
                <td className="px-4 py-3 font-sans text-[11px]">{r.order}</td>
                <td className="px-4 py-3">{r.customer}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.reason}</td>
                <td className="px-4 py-3">{r.items}</td>
                <td className="px-4 py-3">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.requested}</td>
                <td className="px-4 py-3 text-right font-medium">{naira(r.refund)}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => void runAction(r.id, "approve")}
                      disabled={r.status === "Refunded" || r.status === "Rejected"}
                      className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06] text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Approve"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void runAction(r.id, "reject")}
                      disabled={r.status === "Refunded" || r.status === "Rejected"}
                      className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06] text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Reject"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDetail(r)}
                      className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]"
                      title="Details"
                    >
                      <ArrowRightCircle className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      {detail ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-md bg-white shadow-xl p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display text-lg font-bold">{detail.id}</div>
                <div className="text-[12px] text-muted-foreground">{detail.order}</div>
              </div>
              <button onClick={() => setDetail(null)} className="h-8 w-8 grid place-items-center rounded hover:bg-black/[0.06]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{detail.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reason</span>
                <span className="font-medium">{detail.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusPill status={detail.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refund</span>
                <span className="font-medium">{naira(detail.refund)}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => void runAction(detail.id, "approve")}
                className="h-10 rounded-md bg-ink text-white text-[13px] font-medium"
              >
                Approve
              </button>
              <button
                onClick={() => void runAction(detail.id, "refund")}
                className="h-10 rounded-md border border-black/10 text-[13px] font-medium"
              >
                Issue refund
              </button>
              <button
                onClick={() => void runAction(detail.id, "reject")}
                className="h-10 rounded-md border border-rose-200 text-rose-700 text-[13px] font-medium"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showNew ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setShowNew(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-lg font-bold">New RMA</div>
            <input
              className="w-full h-10 px-3 rounded-md border border-black/10 text-[13px]"
              placeholder="Order number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
            />
            <input
              className="w-full h-10 px-3 rounded-md border border-black/10 text-[13px]"
              placeholder="Customer name"
              value={form.customer}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
            />
            <input
              className="w-full h-10 px-3 rounded-md border border-black/10 text-[13px]"
              placeholder="Reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
            <input
              className="w-full h-10 px-3 rounded-md border border-black/10 text-[13px]"
              placeholder="Refund amount (₦)"
              value={form.refund}
              onChange={(e) => setForm({ ...form, refund: e.target.value })}
            />
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowNew(false)} className="h-9 px-3 rounded-md border border-black/10 text-[13px]">
                Cancel
              </button>
              <button onClick={() => void createRMA()} className="h-9 px-3 rounded-md bg-ink text-white text-[13px]">
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
