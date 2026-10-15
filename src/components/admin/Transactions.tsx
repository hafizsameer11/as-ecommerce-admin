import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, StatusPill, TableWrap, naira } from "./ui";
import { Download } from "lucide-react";
import { commerceAdminApi, koboToNaira, type TransactionRow } from "@/lib/api/commerce";

function statusLabel(s: string) {
  if (s === "succeeded") return "Captured";
  if (s === "refunded" || s === "partially_refunded") return "Refunded";
  if (s === "failed") return "Failed";
  if (s === "pending") return "Pending";
  return s;
}

export function Transactions() {
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await commerceAdminApi.listTransactions();
        setRows(data);
      } catch (err) {
        console.warn("[transactions]", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const txns = useMemo(
    () =>
      rows.map((p) => ({
        id: p.reference || p.id,
        order: p.orderNumber ?? "—",
        method: p.method,
        amount: koboToNaira(p.amount),
        fee: koboToNaira(p.fee),
        net: koboToNaira(p.net),
        status: statusLabel(p.status),
        type: p.status.includes("refund") ? "Refund" : "Payment",
        date: new Date(p.paidAt || p.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
        currency: "NGN",
      })),
    [rows]
  );

  const gross = txns.reduce((n, t) => n + t.amount, 0);
  const fees = txns.reduce((n, t) => n + t.fee, 0);
  const net = txns.reduce((n, t) => n + t.net, 0);
  const successRate = rows.length
    ? Math.round((rows.filter((r) => r.status === "succeeded").length / rows.length) * 1000) / 10
    : 0;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Transactions"
        subtitle="Payment captures, refunds, fees and payout reconciliation"
        actions={
          <button className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Gross</div><div className="font-display text-2xl font-bold mt-1">{loading ? "…" : naira(gross)}</div></Card>
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Processing fees</div><div className="font-display text-2xl font-bold mt-1 text-rose-600">− {naira(fees)}</div></Card>
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Net payouts</div><div className="font-display text-2xl font-bold mt-1 text-ink">{naira(net)}</div></Card>
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Success rate</div><div className="font-display text-2xl font-bold mt-1">{successRate}%</div></Card>
      </div>

      <TableWrap>
        <table className="w-full text-[13px]">
          <thead className="bg-black/[0.02] text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium">Transaction</th>
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Method</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Amount</th>
              <th className="px-4 py-2.5 font-medium text-right">Fee</th>
              <th className="px-4 py-2.5 font-medium text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-t border-black/[0.06] hover:bg-black/[0.02]">
                <td className="px-4 py-3 font-medium">{t.id}</td>
                <td className="px-4 py-3">{t.order}</td>
                <td className="px-4 py-3"><Chip tone={t.type === "Refund" ? "red" : "green"}>{t.type}</Chip></td>
                <td className="px-4 py-3 capitalize">{t.method.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.date}</td>
                <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                <td className="px-4 py-3 text-right font-medium">{naira(t.amount)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{naira(t.fee)}</td>
                <td className="px-4 py-3 text-right font-medium">{naira(t.net)}</td>
              </tr>
            ))}
            {!loading && txns.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No transactions yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
