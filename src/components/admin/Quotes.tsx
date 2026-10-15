import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "./AdminShell";
import { Card, Chip, TableWrap, naira } from "./ui";
import { useConciergeRequests, type ConciergeRequest } from "@/lib/concierge-requests-store";
import { downloadCSV } from "@/lib/admin-export";
import { Download, Search, FileText, Send, X, Copy, Check } from "lucide-react";

type QuoteRow = {
  req: ConciergeRequest;
  amount: number;
  deposit: number;
  expiresAt: number;
  state: "Pending" | "Accepted" | "Expired" | "Declined";
};

function classify(r: ConciergeRequest): QuoteRow | null {
  if (!r.quote) return null;
  const { amount, deposit, expiresAt } = r.quote;
  let state: QuoteRow["state"] = "Pending";
  if (r.status === "Approved" || r.status === "Ordered" || r.status === "In Transit" || r.status === "Delivered") state = "Accepted";
  else if (r.status === "Cancelled") state = "Declined";
  else if (expiresAt < Date.now()) state = "Expired";
  return { req: r, amount, deposit, expiresAt, state };
}

const stateTone: Record<QuoteRow["state"], "amber" | "green" | "red" | "slate"> = {
  Pending: "amber",
  Accepted: "green",
  Expired: "slate",
  Declined: "red",
};

const TABS: (QuoteRow["state"] | "All")[] = ["All", "Pending", "Accepted", "Expired", "Declined"];

export function Quotes() {
  const requests = useConciergeRequests((s) => s.requests);
  const hydrate = useConciergeRequests((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<QuoteRow | null>(null);
  const [copied, setCopied] = useState(false);

  const rows = useMemo(
    () => requests.map(classify).filter((x): x is QuoteRow => x !== null),
    [requests],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length, Pending: 0, Accepted: 0, Expired: 0, Declined: 0 };
    rows.forEach((r) => { c[r.state]++; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "All" && r.state !== tab) return false;
      if (q) {
        const t = q.toLowerCase();
        return (
          r.req.id.toLowerCase().includes(t) ||
          r.req.customer.name.toLowerCase().includes(t) ||
          r.req.brand.toLowerCase().includes(t) ||
          r.req.itemName.toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [rows, tab, q]);

  const outstanding = filtered.filter((r) => r.state === "Pending").reduce((n, r) => n + r.amount, 0);
  const accepted = filtered.filter((r) => r.state === "Accepted").reduce((n, r) => n + r.amount, 0);
  const acceptRate = counts.Accepted + counts.Declined + counts.Expired > 0
    ? Math.round((counts.Accepted / (counts.Accepted + counts.Declined + counts.Expired)) * 100)
    : 0;
  const avgQuote = filtered.length ? Math.round(filtered.reduce((n, r) => n + r.amount, 0) / filtered.length) : 0;

  const exportCSV = () => {
    downloadCSV(
      `quotes-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((r) => ({
        id: r.req.id,
        customer: r.req.customer.name,
        tier: r.req.customer.tier,
        brand: r.req.brand,
        item: r.req.itemName,
        assignee: r.req.assignee ?? "",
        amount: r.amount,
        deposit: r.deposit,
        state: r.state,
        expires: new Date(r.expiresAt).toISOString(),
      })),
    );
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Quotes"
        subtitle="Pricing sent to concierge clients, deposits and acceptance status"
        actions={
          <button
            onClick={exportCSV}
            className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5 hover:bg-black/[0.03]"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Outstanding</div>
          <div className="font-display text-2xl font-bold mt-1 text-amber-700">{naira(outstanding)}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Accepted value</div>
          <div className="font-display text-2xl font-bold mt-1 text-ink">{naira(accepted)}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Acceptance rate</div>
          <div className="font-display text-2xl font-bold mt-1">{acceptRate}%</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg quote</div>
          <div className="font-display text-2xl font-bold mt-1">{naira(avgQuote)}</div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex bg-black/[0.04] p-1 rounded-lg">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 h-8 rounded-md text-[12px] font-medium transition-colors ${
                tab === t ? "bg-white shadow-sm text-ink" : "text-muted-foreground hover:text-ink"
              }`}
            >
              {t}
              <span className="ml-1.5 text-[10px] text-muted-foreground">{counts[t]}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px] max-w-[320px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search quote, customer, brand…"
            className="w-full h-9 pl-8 pr-3 rounded-md border border-black/10 bg-white text-[13px]"
          />
        </div>
      </div>

      <TableWrap>
        <table className="w-full text-[13px]">
          <thead className="bg-black/[0.02] text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium">Quote / Request</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Item</th>
              <th className="px-4 py-2.5 font-medium">Agent</th>
              <th className="px-4 py-2.5 font-medium">Expires</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Deposit</th>
              <th className="px-4 py-2.5 font-medium text-right">Amount</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground text-[13px]">
                  No quotes match this view.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const diffH = (r.expiresAt - Date.now()) / 3_600_000;
              return (
                <tr key={r.req.id} className="border-t border-black/[0.06] hover:bg-black/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-sans text-[11px]">QT-{r.req.id.slice(-5)}</div>
                    <Link to="/concierge/inbox" className="text-[11px] text-muted-foreground hover:text-ink font-sans">
                      {r.req.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink">{r.req.customer.name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.req.customer.tier}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[280px]">
                    <div className="text-ink font-medium truncate">{r.req.brand}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.req.itemName}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.req.assignee ?? " - "}</td>
                  <td className="px-4 py-3">
                    <div className="text-[12px]">{new Date(r.expiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>
                    <div className={`text-[10px] ${diffH < 0 ? "text-rose-600" : diffH < 24 ? "text-amber-700" : "text-muted-foreground"}`}>
                      {diffH < 0 ? `${Math.abs(Math.round(diffH))}h ago` : `in ${Math.round(diffH)}h`}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Chip tone={stateTone[r.state]}>{r.state}</Chip></td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{naira(r.deposit)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{naira(r.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setPreview(r); setCopied(false); }}
                      className="text-[12px] text-ink hover:underline inline-flex items-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" /> View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-[560px] shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <div>
                <div className="font-display text-lg font-bold">Quote QT-{preview.req.id.slice(-5)}</div>
                <div className="text-[12px] text-muted-foreground font-sans">{preview.req.id}</div>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="h-8 w-8 grid place-items-center rounded-md hover:bg-black/[0.05]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Client</div>
                  <div className="text-ink font-medium">{preview.req.customer.name}</div>
                  <div className="text-[12px] text-muted-foreground">{preview.req.customer.email}</div>
                </div>
                <Chip tone={stateTone[preview.state]}>{preview.state}</Chip>
              </div>

              <div className="bg-black/[0.02] rounded-lg p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Item</div>
                <div className="font-medium mt-1">{preview.req.brand}</div>
                <div className="text-[13px] text-muted-foreground">{preview.req.itemName}</div>
                {preview.req.reference && (
                  <div className="text-[11px] text-muted-foreground mt-1">Ref: {preview.req.reference}</div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="border border-black/[0.08] rounded-lg p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Deposit (30%)</div>
                  <div className="font-display text-lg font-bold mt-1">{naira(preview.deposit)}</div>
                </div>
                <div className="border border-black/[0.08] rounded-lg p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Balance</div>
                  <div className="font-display text-lg font-bold mt-1">{naira(preview.amount - preview.deposit)}</div>
                </div>
                <div className="border border-gold/40 bg-gold/5 rounded-lg p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Total</div>
                  <div className="font-display text-lg font-bold mt-1">{naira(preview.amount)}</div>
                </div>
              </div>

              <div className="text-[12px] text-muted-foreground border-l-2 border-gold/40 pl-3">
                Valid until {new Date(preview.expiresAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}.
                Deposit is non-refundable once sourcing is confirmed with the boutique.
              </div>
            </div>
            <div className="px-5 py-3 bg-black/[0.02] border-t border-black/[0.06] flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `Quote ${preview.req.id}\n${preview.req.brand} - ${preview.req.itemName}\nTotal: ${naira(preview.amount)}\nDeposit (30%): ${naira(preview.deposit)}`,
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-ink" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy details"}
              </button>
              <button
                onClick={() => setPreview(null)}
                className="h-9 px-4 rounded-md bg-ink text-white text-[13px] flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> Resend to client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
