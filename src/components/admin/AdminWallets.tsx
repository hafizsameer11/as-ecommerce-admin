import { useEffect, useMemo, useState } from "react";
import {
  Search, Download, X, Wallet, ArrowDownCircle, ArrowUpCircle, Undo2, Snowflake,
  TrendingUp, TrendingDown, Users, Filter, Plus, ChevronDown, ChevronUp,
} from "lucide-react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, TableWrap, Toolbar, Empty, StatusPill, naira, statusTone } from "./ui";
import { useWallets, type WalletTx, type WalletTxKind, type WalletTxStatus } from "@/lib/wallets-store";
import { useCustomers } from "@/lib/customers-store";
import { downloadCSV } from "@/lib/admin-export";

const KINDS: Array<{ id: WalletTxKind | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "topup", label: "Top-ups" },
  { id: "spend", label: "Spend" },
  { id: "refund", label: "Refunds" },
  { id: "credit", label: "Credits" },
  { id: "adjustment", label: "Adjustments" },
  { id: "withdrawal", label: "Withdrawals" },
  { id: "expiry", label: "Expiries" },
];

const KIND_TONE: Record<WalletTxKind, Parameters<typeof Chip>[0]["tone"]> = {
  topup: "green", refund: "blue", credit: "gold",
  adjustment: "slate", spend: "neutral", withdrawal: "amber", expiry: "purple",
};

function Kpi({ label, value, sub, icon: Icon, tone = "gold" }:
  { label: string; value: string; sub?: string; icon: any; tone?: "gold" | "green" | "red" | "blue" }) {
  const toneCls = {
    gold: "bg-gold/15 text-gold-deep",
    green: "bg-muted text-ink",
    red: "bg-rose-50 text-rose-700",
    blue: "bg-sky-50 text-sky-700",
  }[tone];
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
          <div className="font-display text-[24px] leading-tight mt-1">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        <div className={`h-9 w-9 grid place-items-center rounded-lg ${toneCls}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

type SortKey = "at" | "amount" | "customerName";

export function AdminWallets() {
  const txs = useWallets((s) => s.txs);
  const freezes = useWallets((s) => s.freezes);
  const updateStatus = useWallets((s) => s.updateStatus);
  const reverse = useWallets((s) => s.reverse);
  const toggleFreeze = useWallets((s) => s.toggleFreeze);
  const createTx = useWallets((s) => s.create);
  const hydrate = useWallets((s) => s.hydrate);
  const customers = useCustomers((s) => s.customers);
  const hydrateCustomers = useCustomers((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [tab, setTab] = useState<(typeof KINDS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<WalletTxStatus | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "at", dir: "desc" });
  const [openTx, setOpenTx] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);

  const active = txs.find((t) => t.id === openTx) ?? null;

  const kpis = useMemo(() => {
    const completed = txs.filter((t) => t.status === "completed");
    const inflow = completed.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const outflow = -completed.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
    const heldBalance = customers.reduce((s, c) => s + c.walletBalance, 0);
    const pending = txs.filter((t) => t.status === "pending").length;
    return { inflow, outflow, heldBalance, pending, walletCount: customers.filter((c) => c.walletBalance > 0).length };
  }, [txs, customers]);

  const filtered = useMemo(() => {
    let list = txs.slice();
    if (tab !== "all") list = list.filter((t) => t.kind === tab);
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((t) =>
      [t.customerName, t.reference, t.note ?? "", t.customerId, t.channel].join(" ").toLowerCase().includes(q));
    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "at") return (new Date(a.at).getTime() - new Date(b.at).getTime()) * dir;
      if (sort.key === "amount") return (a.amount - b.amount) * dir;
      return a.customerName.localeCompare(b.customerName) * dir;
    });
    return list;
  }, [txs, tab, statusFilter, query, sort]);

  function toggleSort(k: SortKey) {
    setSort((s) => s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "desc" });
  }

  function exportCSV() {
    downloadCSV(`wallet-transactions-${Date.now()}.csv`, filtered.map((t) => ({
      id: t.id, at: t.at, customer_id: t.customerId, customer: t.customerName,
      kind: t.kind, status: t.status, amount: t.amount, balance_after: t.balanceAfter,
      reference: t.reference, channel: t.channel, note: t.note ?? "",
    })));
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Wallets & Credits"
        subtitle="Manage customer wallets, store credits, refunds and withdrawals."
        actions={
          <>
            <button onClick={exportCSV}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-black/[0.04]">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={() => setIssueOpen(true)}
              className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-black">
              <Plus className="h-4 w-4" /> Issue credit
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Held balance" value={naira(kpis.heldBalance)} sub={`${kpis.walletCount} active wallets`} icon={Wallet} tone="gold" />
        <Kpi label="Inflow" value={naira(kpis.inflow)} sub="Top-ups + credits" icon={TrendingUp} tone="green" />
        <Kpi label="Outflow" value={naira(kpis.outflow)} sub="Spend + withdrawals" icon={TrendingDown} tone="red" />
        <Kpi label="Pending" value={String(kpis.pending)} sub="Awaiting settlement" icon={ArrowDownCircle} tone="blue" />
        <Kpi label="Net movement" value={naira(kpis.inflow - kpis.outflow)} sub="Completed only" icon={Users} tone="gold" />
      </div>

      <div className="mb-4 border-b border-black/10 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {KINDS.map((t) => {
          const count = t.id === "all" ? txs.length : txs.filter((x) => x.kind === t.id).length;
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 h-9 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px ${
                on ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
              }`}>
              {t.label} <span className="ml-1 text-[11px] text-muted-foreground">({count})</span>
            </button>
          );
        })}
      </div>

      <Toolbar>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer, reference, channel…"
            className="w-full h-9 pl-8 pr-3 rounded-md border border-black/10 bg-white text-[13px]"
          />
        </div>
        <button onClick={() => setShowFilters((v) => !v)}
          className={`h-9 px-3 rounded-md border text-[13px] font-medium inline-flex items-center gap-1.5 ${
            showFilters || statusFilter !== "all" ? "bg-ink text-white border-ink" : "bg-white border-black/10 hover:bg-black/[0.04]"
          }`}>
          <Filter className="h-4 w-4" /> Filters
        </button>
      </Toolbar>

      {showFilters && (
        <Card className="mb-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Status</div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]">
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
            <button onClick={() => setStatusFilter("all")}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] hover:bg-black/[0.04] inline-flex items-center gap-1.5">
              <X className="h-4 w-4" /> Clear
            </button>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div>
          {filtered.length === 0 ? (
            <Empty title="No transactions" sub="Try a different tab, filter or search term." />
          ) : (
            <TableWrap>
              <table className="w-full text-[13px]">
                <thead className="bg-black/[0.02] text-muted-foreground text-[11px] uppercase tracking-[0.1em]">
                  <tr>
                    <SortHeader label="When" k="at" sort={sort} onClick={toggleSort} />
                    <SortHeader label="Customer" k="customerName" sort={sort} onClick={toggleSort} />
                    <th className="px-3 py-3 text-left">Type</th>
                    <th className="px-3 py-3 text-left">Reference</th>
                    <SortHeader label="Amount" k="amount" sort={sort} onClick={toggleSort} align="right" />
                    <th className="px-3 py-3 text-right">Balance after</th>
                    <th className="px-3 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 40).map((t) => (
                    <tr key={t.id} className="border-t border-black/5 hover:bg-black/[0.02] cursor-pointer" onClick={() => setOpenTx(t.id)}>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{fmtDT(t.at)}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-ink truncate max-w-[180px]">{t.customerName}</div>
                        <div className="text-[11px] text-muted-foreground font-sans">{t.customerId}</div>
                      </td>
                      <td className="px-3 py-3"><Chip tone={KIND_TONE[t.kind]}>{t.kind}</Chip></td>
                      <td className="px-3 py-3 font-sans text-[11.5px] text-muted-foreground">{t.reference}</td>
                      <td className={`px-3 py-3 text-right tabular-nums font-medium ${t.amount < 0 ? "text-rose-700" : "text-ink"}`}>
                        {t.amount < 0 ? "−" : "+"}{naira(Math.abs(t.amount))}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{naira(t.balanceAfter)}</td>
                      <td className="px-3 py-3"><StatusPill status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Top wallet balances</div>
            <div className="space-y-2.5">
              {customers.slice().sort((a, b) => b.walletBalance - a.walletBalance).slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gold/40 to-black/70 grid place-items-center text-white text-[11px] font-semibold shrink-0">
                    {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium truncate">{c.name}</div>
                    <div className="text-[10.5px] text-muted-foreground">{c.tier} · {c.city}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12.5px] font-medium tabular-nums">{naira(c.walletBalance)}</div>
                    {freezes[c.id] && <div className="text-[10px] text-sky-700 inline-flex items-center gap-0.5"><Snowflake className="h-3 w-3" /> Frozen</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Recent withdrawals</div>
            <div className="space-y-2.5">
              {txs.filter((t) => t.kind === "withdrawal").slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-[12px]">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.customerName}</div>
                    <div className="text-[10.5px] text-muted-foreground font-sans">{t.reference}</div>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums font-medium text-rose-700">−{naira(Math.abs(t.amount))}</div>
                    <Chip tone={statusTone(t.status) as any} className="!text-[9px] !py-0">{t.status}</Chip>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {active && (
        <TxDrawer
          tx={active}
          frozen={!!freezes[active.customerId]}
          onClose={() => setOpenTx(null)}
          onApprove={() => updateStatus(active.id, "completed")}
          onFail={() => updateStatus(active.id, "failed")}
          onReverse={() => { if (confirm(`Reverse ${active.reference}? This creates an offsetting adjustment.`)) { reverse(active.id); setOpenTx(null); } }}
          onToggleFreeze={() => toggleFreeze(active.customerId)}
        />
      )}

      {issueOpen && (
        <IssueCreditModal
          customers={customers}
          onClose={() => setIssueOpen(false)}
          onSubmit={(customerId, amount, note, kind) => {
            const cus = customers.find((c) => c.id === customerId);
            if (!cus) return;
            void createTx({
              customerId, customerName: cus.name, kind, status: "completed",
              amount, reference: `ADJ-${Date.now().toString(36).toUpperCase()}`,
              note, channel: "admin", balanceAfter: Math.max(0, cus.walletBalance + amount),
            }).then(() => void hydrateCustomers());
            setIssueOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SortHeader({ label, k, sort, onClick, align = "left" }:
  { label: string; k: SortKey; sort: { key: SortKey; dir: "asc" | "desc" }; onClick: (k: SortKey) => void; align?: "left" | "right" }) {
  const on = sort.key === k;
  return (
    <th className={`px-3 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button onClick={() => onClick(k)} className={`inline-flex items-center gap-1 ${on ? "text-ink" : ""} hover:text-ink`}>
        {label} {on && (sort.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}

function TxDrawer({ tx, frozen, onClose, onApprove, onFail, onReverse, onToggleFreeze }: {
  tx: WalletTx; frozen: boolean;
  onClose: () => void; onApprove: () => void; onFail: () => void; onReverse: () => void; onToggleFreeze: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <aside className="w-full max-w-[460px] h-full bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-black/5 px-5 py-4 flex items-center gap-3">
          <div className={`h-11 w-11 rounded-lg grid place-items-center ${tx.amount < 0 ? "bg-rose-50 text-rose-700" : "bg-muted text-ink"}`}>
            {tx.amount < 0 ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[18px] leading-tight truncate capitalize">{tx.kind}</div>
            <div className="text-[12px] text-muted-foreground truncate font-sans">{tx.reference}</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-black/[0.04]"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="rounded-lg border border-black/10 p-4 text-center">
            <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Amount</div>
            <div className={`font-display text-[30px] leading-tight mt-1 tabular-nums ${tx.amount < 0 ? "text-rose-700" : "text-ink"}`}>
              {tx.amount < 0 ? "−" : "+"}{naira(Math.abs(tx.amount))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Balance after · {naira(tx.balanceAfter)}</div>
          </div>

          <dl className="text-[13px] divide-y divide-black/5 border border-black/10 rounded-lg">
            <Row k="Customer" v={<>{tx.customerName} <span className="text-muted-foreground font-sans text-[11px]">({tx.customerId})</span></>} />
            <Row k="Status" v={<StatusPill status={tx.status} />} />
            <Row k="Type" v={<Chip tone={KIND_TONE[tx.kind]}>{tx.kind}</Chip>} />
            <Row k="Channel" v={<span className="capitalize">{tx.channel.replace("_", " ")}</span>} />
            <Row k="When" v={fmtDT(tx.at)} />
            {tx.note && <Row k="Note" v={tx.note} />}
          </dl>

          <div className="grid grid-cols-2 gap-2">
            {tx.status === "pending" && (
              <>
                <button onClick={onApprove} className="h-9 rounded-md bg-ink text-white text-[13px] font-medium hover:bg-ink">Approve</button>
                <button onClick={onFail} className="h-9 rounded-md border border-rose-200 text-rose-700 text-[13px] font-medium hover:bg-rose-50">Mark failed</button>
              </>
            )}
            {tx.status === "completed" && (
              <button onClick={onReverse} className="col-span-2 h-9 rounded-md border border-black/10 text-[13px] font-medium hover:bg-black/[0.04] inline-flex items-center justify-center gap-1.5">
                <Undo2 className="h-4 w-4" /> Reverse transaction
              </button>
            )}
            <button onClick={onToggleFreeze}
              className="col-span-2 h-9 rounded-md border border-black/10 text-[13px] font-medium hover:bg-black/[0.04] inline-flex items-center justify-center gap-1.5">
              <Snowflake className="h-4 w-4" /> {frozen ? "Unfreeze wallet" : "Freeze wallet"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 gap-3">
      <dt className="text-muted-foreground text-[11.5px] uppercase tracking-[0.1em]">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

function IssueCreditModal({ customers, onClose, onSubmit }: {
  customers: ReturnType<typeof useCustomers.getState>["customers"];
  onClose: () => void;
  onSubmit: (customerId: string, amount: number, note: string, kind: WalletTxKind) => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [amount, setAmount] = useState("10000");
  const [kind, setKind] = useState<WalletTxKind>("credit");
  const [note, setNote] = useState("Goodwill credit");
  const [search, setSearch] = useState("");

  const matches = customers
    .filter((c) => !search || (c.name + c.email).toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-[460px] bg-white rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <div className="font-display text-[18px]">Issue wallet credit</div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-black/[0.04]"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Customer</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer…"
              className="mt-1 w-full h-9 px-3 rounded-md border border-black/10 bg-white text-[13px]" />
            <div className="mt-2 max-h-40 overflow-y-auto border border-black/10 rounded-md divide-y divide-black/5">
              {matches.map((c) => (
                <button key={c.id} onClick={() => setCustomerId(c.id)}
                  className={`w-full text-left px-3 py-2 text-[12.5px] hover:bg-black/[0.03] ${customerId === c.id ? "bg-gold/10" : ""}`}>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.email} · Wallet {naira(c.walletBalance)}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Amount (₦)</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))}
                className="mt-1 w-full h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] tabular-nums" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Type</label>
              <select value={kind} onChange={(e) => setKind(e.target.value as WalletTxKind)}
                className="mt-1 w-full h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]">
                <option value="credit">Credit (goodwill)</option>
                <option value="adjustment">Adjustment</option>
                <option value="refund">Refund</option>
                <option value="topup">Top-up</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              className="mt-1 w-full px-3 py-2 rounded-md border border-black/10 bg-white text-[13px]" />
          </div>
          <div className="text-[11.5px] text-muted-foreground">
            Use negative amounts to debit. Adjustments are logged in the ledger and visible to the customer.
          </div>
        </div>
        <div className="px-5 py-4 border-t border-black/5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-black/10 text-[13px] hover:bg-black/[0.04]">Cancel</button>
          <button
            disabled={!customerId || !amount || isNaN(Number(amount)) || Number(amount) === 0}
            onClick={() => onSubmit(customerId, Number(amount), note, kind)}
            className="h-9 px-4 rounded-md bg-ink text-white text-[13px] font-medium hover:bg-black disabled:opacity-40">
            Issue
          </button>
        </div>
      </div>
    </div>
  );
}
