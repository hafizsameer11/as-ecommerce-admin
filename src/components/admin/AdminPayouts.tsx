import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, IconButton, TableWrap, Toolbar, naira } from "./ui";
import {
  usePayouts, PAYOUT_STATUS_META,
  type Payout, type PayoutStatus, type PayoutProvider,
} from "@/lib/payouts-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Landmark, Search, Download, X, Filter as FilterIcon, Wallet, Copy,
  CheckCircle2, AlertTriangle, Clock, RefreshCw, Pause, Play, Plus, Trash2,
  ArrowUpRight, ExternalLink, Building2, Receipt,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

type Tab = "all" | PayoutStatus;

const PROVIDERS: PayoutProvider[] = ["Paystack", "Flutterwave", "Stripe", "Manual Bank"];

function fmtDate(ts?: number) {
  if (!ts) return " - ";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AdminPayouts() {
  const { payouts, markPaid, markFailed, retry, hold, release, remove, hydrate } = usePayouts();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [holdOpen, setHoldOpen] = useState<string | null>(null);
  const [holdNote, setHoldNote] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return payouts.filter((p) => {
      if (tab !== "all" && p.status !== tab) return false;
      if (provider !== "all" && p.provider !== provider) return false;
      if (!query) return true;
      return [p.id, p.reference, p.provider, p.bankName, p.bankAccountName, p.bankAccountMasked]
        .some((v) => v.toLowerCase().includes(query));
    });
  }, [payouts, tab, q, provider]);

  const kpis = useMemo(() => {
    const day = 86400000;
    const in30 = payouts.filter((p) => p.paidAt && Date.now() - p.paidAt < day * 30);
    const paidTotal = in30.reduce((a, p) => a + p.netNGN, 0);
    const feesTotal = in30.reduce((a, p) => a + p.feesNGN, 0);
    const pending = payouts.filter((p) => p.status === "scheduled" || p.status === "in_transit").reduce((a, p) => a + p.netNGN, 0);
    const issues = payouts.filter((p) => p.status === "failed" || p.status === "on_hold").length;
    return { paidTotal, feesTotal, pending, issues };
  }, [payouts]);

  const openPayout = payouts.find((p) => p.id === openId) || null;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: payouts.length },
    { id: "scheduled", label: "Scheduled", count: payouts.filter((p) => p.status === "scheduled").length },
    { id: "in_transit", label: "In transit", count: payouts.filter((p) => p.status === "in_transit").length },
    { id: "paid", label: "Paid", count: payouts.filter((p) => p.status === "paid").length },
    { id: "on_hold", label: "On hold", count: payouts.filter((p) => p.status === "on_hold").length },
    { id: "failed", label: "Failed", count: payouts.filter((p) => p.status === "failed").length },
  ];

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.id)));
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportCSV = () => {
    const rows = (selected.size ? filtered.filter((p) => selected.has(p.id)) : filtered).map((p) => ({
      id: p.id,
      provider: p.provider,
      reference: p.reference,
      status: PAYOUT_STATUS_META[p.status].label,
      grossNGN: p.grossNGN,
      feesNGN: p.feesNGN,
      refundsNGN: p.refundsNGN,
      adjustmentsNGN: p.adjustmentsNGN,
      netNGN: p.netNGN,
      txnCount: p.txnCount,
      bank: `${p.bankName} ${p.bankAccountMasked}`,
      scheduled: fmtDate(p.scheduledAt),
      paid: fmtDate(p.paidAt),
    }));
    downloadCSV(`payouts-${Date.now()}.csv`, rows);
  };

  const bulkMarkPaid = () => {
    selected.forEach((id) => {
      const p = payouts.find((x) => x.id === id);
      if (p && (p.status === "scheduled" || p.status === "in_transit")) markPaid(id);
    });
    setSelected(new Set());
  };

  const confirmHold = () => {
    if (holdOpen) hold(holdOpen, holdNote || "Placed on hold");
    setHoldOpen(null);
    setHoldNote("");
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Payouts"
        subtitle="Settlement schedules across Paystack, Flutterwave and manual bank runs."
        actions={
          <>
            <button
              onClick={exportCSV}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-black/[0.03]"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-ink/90">
              <Plus className="h-4 w-4" /> New payout
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">Paid · last 30d</div>
              <div className="font-display text-2xl mt-1">{naira(kpis.paidTotal)}</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-muted text-ink">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            Fees {naira(kpis.feesTotal)} · net after fees
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">Pending payout</div>
              <div className="font-display text-2xl mt-1">{naira(kpis.pending)}</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-sky-50 text-sky-700">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">Scheduled + in transit</div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">Needs attention</div>
              <div className="font-display text-2xl mt-1">{kpis.issues}</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-amber-50 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">Failed & on-hold batches</div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">Providers connected</div>
              <div className="font-display text-2xl mt-1">4</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-gold/15 text-gold-deep">
              <Landmark className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            <Link to="/settings" className="underline underline-offset-2 inline-flex items-center gap-1">
              Manage providers <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-black/[0.06] mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 h-9 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id
                ? "border-ink text-ink"
                : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            {t.label} <span className="text-muted-foreground/70">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <Toolbar>
        <div className="relative flex-1 min-w-[220px] max-w-[380px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search payout, reference, bank…"
            className="w-full h-9 pl-8 pr-3 rounded-md border border-black/10 bg-white text-[13px] outline-none focus:border-ink/40"
          />
        </div>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All providers</option>
          {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <IconButton title="Filters"><FilterIcon className="h-4 w-4" /></IconButton>

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2 text-[13px]">
            <span className="text-muted-foreground">{selected.size} selected</span>
            <button
              onClick={bulkMarkPaid}
              className="h-8 px-3 rounded-md bg-ink text-white text-[12px] font-medium inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
            </button>
            <button
              onClick={() => { setSelected(new Set()); }}
              className="h-8 px-2 rounded-md border border-black/10 bg-white text-[12px]"
            >
              Clear
            </button>
          </div>
        )}
      </Toolbar>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card><Empty title="No payouts match" sub="Adjust filters or clear the search." /></Card>
      ) : (
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.02] text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2.5 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="px-3 py-2.5 font-medium">Payout</th>
                <th className="px-3 py-2.5 font-medium">Provider</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium text-right">Gross</th>
                <th className="px-3 py-2.5 font-medium text-right">Fees</th>
                <th className="px-3 py-2.5 font-medium text-right">Net</th>
                <th className="px-3 py-2.5 font-medium">Bank</th>
                <th className="px-3 py-2.5 font-medium">Scheduled</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const meta = PAYOUT_STATUS_META[p.status];
                return (
                  <tr
                    key={p.id}
                    className="border-t border-black/[0.05] hover:bg-black/[0.02] cursor-pointer"
                    onClick={() => setOpenId(p.id)}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-ink">{p.id}</div>
                      <div className="text-[11px] text-muted-foreground font-sans">{p.reference}</div>
                    </td>
                    <td className="px-3 py-3">{p.provider}</td>
                    <td className="px-3 py-3"><Chip tone={meta.tone}>{meta.label}</Chip></td>
                    <td className="px-3 py-3 text-right tabular-nums">{naira(p.grossNGN)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">−{naira(p.feesNGN + p.refundsNGN)}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium">{naira(p.netNGN)}</td>
                    <td className="px-3 py-3">
                      <div>{p.bankName}</div>
                      <div className="text-[11px] text-muted-foreground font-sans">{p.bankAccountMasked}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div>{fmtDate(p.scheduledAt)}</div>
                      {p.paidAt && <div className="text-[11px] text-muted-foreground">Paid {fmtDate(p.paidAt)}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      {/* Drawer */}
      {openPayout && (
        <PayoutDrawer
          payout={openPayout}
          onClose={() => setOpenId(null)}
          onMarkPaid={() => markPaid(openPayout.id)}
          onMarkFailed={(r) => markFailed(openPayout.id, r)}
          onRetry={() => retry(openPayout.id)}
          onHold={() => { setHoldOpen(openPayout.id); }}
          onRelease={() => release(openPayout.id)}
          onDelete={() => { remove(openPayout.id); setOpenId(null); }}
        />
      )}

      {/* Hold modal */}
      {holdOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4" onClick={() => setHoldOpen(null)}>
          <div className="bg-white rounded-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-lg mb-1">Place payout on hold</div>
            <p className="text-[13px] text-muted-foreground mb-3">
              This pauses the settlement and notifies finance. Add a short reason for the audit log.
            </p>
            <textarea
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
              rows={3}
              placeholder="Reason (e.g. suspected fraud, refund spike)…"
              className="w-full rounded-md border border-black/10 p-2 text-[13px] outline-none focus:border-ink/40"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setHoldOpen(null)} className="h-9 px-3 rounded-md border border-black/10 text-[13px]">Cancel</button>
              <button onClick={confirmHold} className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium">Hold payout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PayoutDrawer({
  payout, onClose, onMarkPaid, onMarkFailed, onRetry, onHold, onRelease, onDelete,
}: {
  payout: Payout;
  onClose: () => void;
  onMarkPaid: () => void;
  onMarkFailed: (reason: string) => void;
  onRetry: () => void;
  onHold: () => void;
  onRelease: () => void;
  onDelete: () => void;
}) {
  const meta = PAYOUT_STATUS_META[payout.status];
  const [tab, setTab] = useState<"summary" | "transactions" | "timeline">("summary");

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-[720px] bg-[#f7f5ef] h-full overflow-y-auto border-l border-black/10">
        <div className="sticky top-0 z-10 bg-white border-b border-black/[0.06] px-5 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-display text-lg">{payout.id}</div>
              <Chip tone={meta.tone}>{meta.label}</Chip>
            </div>
            <div className="text-[12px] text-muted-foreground font-sans flex items-center gap-1.5">
              {payout.reference}
              <button
                title="Copy reference"
                onClick={() => navigator.clipboard?.writeText(payout.reference)}
                className="text-muted-foreground hover:text-ink"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
          <IconButton title="Close" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </div>

        {/* Actions */}
        <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b border-black/[0.06] bg-white">
          {payout.status !== "paid" && (
            <button onClick={onMarkPaid} className="h-8 px-3 rounded-md bg-ink text-white text-[12px] font-medium inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
            </button>
          )}
          {payout.status === "failed" && (
            <button onClick={onRetry} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] inline-flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          )}
          {payout.status !== "on_hold" && payout.status !== "paid" && (
            <button onClick={onHold} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] inline-flex items-center gap-1.5">
              <Pause className="h-3.5 w-3.5" /> Hold
            </button>
          )}
          {payout.status === "on_hold" && (
            <button onClick={onRelease} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] inline-flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5" /> Release
            </button>
          )}
          {payout.status !== "paid" && payout.status !== "failed" && (
            <button
              onClick={() => onMarkFailed("Manually marked failed")}
              className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] inline-flex items-center gap-1.5 text-rose-700"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Mark failed
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onDelete}
              className="h-8 px-2 rounded-md border border-black/10 bg-white text-[12px] text-rose-700 inline-flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>

        {/* Failure banner */}
        {payout.failureReason && (
          <div className="mx-5 mt-4 p-3 rounded-md border border-rose-200 bg-rose-50 text-[12.5px] text-rose-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Payout failed</div>
              <div>{payout.failureReason}</div>
            </div>
          </div>
        )}
        {payout.status === "on_hold" && payout.notes && (
          <div className="mx-5 mt-4 p-3 rounded-md border border-amber-200 bg-amber-50 text-[12.5px] text-amber-900 flex items-start gap-2">
            <Pause className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">On hold</div>
              <div>{payout.notes}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1 border-b border-black/[0.06]">
            {(["summary", "transactions", "timeline"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 h-9 text-[13px] font-medium border-b-2 -mb-px capitalize ${
                  tab === t ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
                }`}
              >
                {t === "transactions" ? `Transactions (${payout.txnCount})` : t}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {tab === "summary" && (
            <>
              <Card>
                <div className="text-[12px] text-muted-foreground mb-2">Settlement breakdown</div>
                <div className="space-y-2 text-[13px]">
                  <Row label="Gross captured" value={naira(payout.grossNGN)} />
                  <Row label="Processor fees" value={`− ${naira(payout.feesNGN)}`} muted />
                  <Row label="Refunds" value={`− ${naira(payout.refundsNGN)}`} muted />
                  {payout.adjustmentsNGN !== 0 && (
                    <Row label="Adjustments" value={`${payout.adjustmentsNGN > 0 ? "+ " : "− "}${naira(Math.abs(payout.adjustmentsNGN))}`} muted />
                  )}
                  <div className="h-px bg-black/[0.06] my-2" />
                  <Row label="Net payout" value={naira(payout.netNGN)} strong />
                </div>
              </Card>

              <Card>
                <div className="text-[12px] text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Destination bank
                </div>
                <div className="text-[14px] font-medium">{payout.bankAccountName}</div>
                <div className="text-[12.5px] text-muted-foreground font-sans">
                  {payout.bankName} · {payout.bankAccountMasked}
                </div>
              </Card>

              <Card>
                <div className="text-[12px] text-muted-foreground mb-2">Dates</div>
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <div className="text-muted-foreground text-[12px]">Scheduled</div>
                    <div>{fmtDateTime(payout.scheduledAt)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[12px]">Paid</div>
                    <div>{payout.paidAt ? fmtDateTime(payout.paidAt) : " - "}</div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {tab === "transactions" && (
            <TableWrap>
              <table className="w-full text-[13px]">
                <thead className="bg-black/[0.02] text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Txn</th>
                    <th className="px-3 py-2 font-medium">Order</th>
                    <th className="px-3 py-2 font-medium">Captured</th>
                    <th className="px-3 py-2 font-medium text-right">Gross</th>
                    <th className="px-3 py-2 font-medium text-right">Fee</th>
                    <th className="px-3 py-2 font-medium text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {payout.transactions.map((t) => (
                    <tr key={t.id} className="border-t border-black/[0.05]">
                      <td className="px-3 py-2 font-sans text-[12px]">{t.id}</td>
                      <td className="px-3 py-2">
                        <Link
                          to="/orders/$id"
                          params={{ id: t.orderId }}
                          className="text-ink underline underline-offset-2"
                        >
                          {t.orderId}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{fmtDateTime(t.capturedAt)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{naira(t.grossNGN)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">−{naira(t.feeNGN)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{naira(t.netNGN)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}

          {tab === "timeline" && (
            <Card>
              <ol className="relative pl-5 space-y-4">
                <TimelineDot label="Batch created" at={payout.scheduledAt - 3600000 * 2} tone="slate" icon={<Receipt className="h-3 w-3" />} />
                <TimelineDot label="Scheduled for settlement" at={payout.scheduledAt} tone="blue" icon={<Clock className="h-3 w-3" />} />
                {payout.status === "in_transit" && (
                  <TimelineDot label="Sent to bank" at={payout.scheduledAt + 3600000} tone="blue" icon={<ArrowUpRight className="h-3 w-3" />} />
                )}
                {payout.paidAt && (
                  <TimelineDot label="Paid to bank" at={payout.paidAt} tone="green" icon={<CheckCircle2 className="h-3 w-3" />} />
                )}
                {payout.status === "failed" && (
                  <TimelineDot label={`Failed · ${payout.failureReason ?? "unknown reason"}`} at={payout.scheduledAt + 3600000 * 4} tone="red" icon={<AlertTriangle className="h-3 w-3" />} />
                )}
                {payout.status === "on_hold" && (
                  <TimelineDot label={`On hold · ${payout.notes ?? "manual review"}`} at={Date.now()} tone="amber" icon={<Pause className="h-3 w-3" />} />
                )}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : "text-ink"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-display text-[15px]" : ""} ${muted ? "text-muted-foreground" : ""}`}>{value}</span>
    </div>
  );
}

function TimelineDot({
  label, at, tone, icon,
}: { label: string; at: number; tone: "slate" | "blue" | "green" | "red" | "amber"; icon: React.ReactNode }) {
  const toneMap: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    green: "bg-ink text-white border-ink",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <li className="relative">
      <span className={`absolute -left-5 top-0.5 h-4 w-4 rounded-full grid place-items-center border ${toneMap[tone]}`}>{icon}</span>
      <div className="text-[13px] text-ink">{label}</div>
      <div className="text-[11.5px] text-muted-foreground">{fmtDateTime(at)}</div>
    </li>
  );
}
