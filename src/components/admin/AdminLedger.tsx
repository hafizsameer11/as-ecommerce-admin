import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, IconButton, TableWrap, Toolbar, naira, StatusPill } from "./ui";
import {
  useLedger, ACCOUNT_TYPE_META, SOURCE_LABEL, entryTotals, computeBalances,
  type JournalEntry, type JournalLine, type AccountType, type EntrySource, type Account,
} from "@/lib/ledger-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  ScrollText, Plus, Search, Download, X, Trash2, Check, AlertTriangle,
  BookOpen, Wallet, TrendingUp, TrendingDown, FileText, Save, Ban,
  ChevronRight, Paperclip, RefreshCw,
} from "lucide-react";

type Tab = "journal" | "accounts" | "trial";

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const SOURCE_TONE: Record<EntrySource, Parameters<typeof Chip>[0]["tone"]> = {
  order: "green", refund: "red", payout: "blue", fee: "amber",
  adjustment: "slate", tax: "purple", wallet: "gold", manual: "neutral",
};

export function AdminLedger() {
  const {
    accounts, entries, trialBalances, entriesPage, entriesPageCount,
    addEntry, postEntry, voidEntry, reseed, hydrate, loadTrialBalance,
  } = useLedger();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [tab, setTab] = useState<Tab>("journal");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "posted" | "draft" | "void">("all");
  const [source, setSource] = useState<EntrySource | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (tab === "trial") void loadTrialBalance();
  }, [tab, loadTrialBalance]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (status !== "all" && e.status !== status) return false;
        if (source !== "all" && e.source !== source) return false;
        if (!query) return true;
        return [e.id, e.description, e.reference ?? "", e.createdBy].some((v) =>
          v.toLowerCase().includes(query),
        ) || e.lines.some((l) => l.memo?.toLowerCase().includes(query));
      })
      .sort((a, b) => b.date - a.date);
  }, [entries, q, status, source]);

  const balances = useMemo(() => {
    if (trialBalances.length) return trialBalances;
    return computeBalances(accounts, entries);
  }, [accounts, entries, trialBalances]);

  const kpis = useMemo(() => {
    const posted = entries.filter((e) => e.status === "posted");
    const drafts = entries.filter((e) => e.status === "draft").length;
    const totalDebit = posted.reduce((s, e) => s + entryTotals(e).debit, 0);
    const unbalanced = entries.filter((e) => e.status === "posted" && !entryTotals(e).balanced).length;
    const cash = balances
      .filter((b) => b.account.type === "asset" && b.account.code.startsWith("10"))
      .reduce((s, b) => s + b.balance, 0);
    const revenue = balances
      .filter((b) => b.account.type === "revenue")
      .reduce((s, b) => s + b.balance, 0);
    const expense = balances
      .filter((b) => b.account.type === "expense")
      .reduce((s, b) => s + b.balance, 0);
    return { totalDebit, drafts, unbalanced, cash, revenue, expense, net: revenue - expense };
  }, [entries, balances]);

  const openEntry = entries.find((e) => e.id === openId) ?? null;

  const exportJournal = () => {
    downloadCSV(
      `ledger-journal-${Date.now()}.csv`,
      filtered.flatMap((e) =>
        e.lines.map((l) => ({
          entry: e.id,
          date: new Date(e.date).toISOString(),
          reference: e.reference ?? "",
          description: e.description,
          source: SOURCE_LABEL[e.source],
          status: e.status,
          account: `${l.accountCode} ${accounts.find((a) => a.code === l.accountCode)?.name ?? ""}`,
          memo: l.memo ?? "",
          debit: l.debit,
          credit: l.credit,
        })),
      ),
    );
  };

  const exportTrial = () => {
    downloadCSV(
      `ledger-trial-balance-${Date.now()}.csv`,
      balances.map((b) => ({
        code: b.account.code,
        name: b.account.name,
        type: ACCOUNT_TYPE_META[b.account.type].label,
        debit: b.debit,
        credit: b.credit,
        balance: b.balance,
      })),
    );
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Ledger"
        subtitle="Double-entry general ledger for cash, revenue, taxes and supplier obligations."
        actions={
          <>
            <button
              onClick={reseed}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] inline-flex items-center gap-2 hover:bg-black/[0.04]"
              title="Reload from API"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              onClick={exportJournal}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] inline-flex items-center gap-2 hover:bg-black/[0.04]"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              onClick={() => setCreating(true)}
              className="h-9 px-3 rounded-md bg-ink text-white text-[13px] inline-flex items-center gap-2 hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New journal entry
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPI label="Cash on hand" value={naira(kpis.cash)} icon={<Wallet className="h-4 w-4" />} />
        <KPI label="Revenue (all time)" value={naira(kpis.revenue)} icon={<TrendingUp className="h-4 w-4" />} tone="green" />
        <KPI label="Expenses (all time)" value={naira(kpis.expense)} icon={<TrendingDown className="h-4 w-4" />} tone="red" />
        <KPI
          label="Net position"
          value={naira(kpis.net)}
          icon={<BookOpen className="h-4 w-4" />}
          tone={kpis.net >= 0 ? "green" : "red"}
        />
      </div>

      {kpis.unbalanced > 0 && (
        <div className="mb-4 flex items-center gap-2 text-[13px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          <AlertTriangle className="h-4 w-4" />
          {kpis.unbalanced} posted {kpis.unbalanced === 1 ? "entry is" : "entries are"} unbalanced. Review and correct before month-end close.
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-black/10 mb-4">
        {(
          [
            ["journal", "Journal", entries.length],
            ["accounts", "Chart of accounts", accounts.length],
            ["trial", "Trial balance", null],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 h-10 text-[13px] font-medium border-b-2 -mb-px inline-flex items-center gap-2 ${
              tab === id ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            {label}
            {count != null && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/[0.06] text-ink">{count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "journal" && (
        <>
          <Toolbar>
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search entries, references, memos…"
                className="w-full h-9 pl-8 pr-3 rounded-md border border-black/10 bg-white text-[13px] focus:outline-none focus:border-ink"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
            >
              <option value="all">All statuses</option>
              <option value="posted">Posted</option>
              <option value="draft">Draft</option>
              <option value="void">Void</option>
            </select>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
              className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
            >
              <option value="all">All sources</option>
              {(Object.keys(SOURCE_LABEL) as EntrySource[]).map((s) => (
                <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
              ))}
            </select>
          </Toolbar>

          {filtered.length === 0 ? (
            <Empty title="No entries" sub="Try clearing filters or create a new journal entry." />
          ) : (
            <TableWrap>
              <table className="w-full text-[13px]">
                <thead className="bg-black/[0.02] text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Entry</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Description</th>
                    <th className="px-4 py-2.5 font-medium">Source</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium text-right">Debit</th>
                    <th className="px-4 py-2.5 font-medium text-right">Credit</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map((e) => {
                    const t = entryTotals(e);
                    return (
                      <tr
                        key={e.id}
                        className="hover:bg-black/[0.02] cursor-pointer"
                        onClick={() => setOpenId(e.id)}
                      >
                        <td className="px-4 py-3 font-sans text-[12px] text-ink">{e.id}</td>
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(e.date)}</td>
                        <td className="px-4 py-3">
                          <div className="text-ink">{e.description}</div>
                          {e.reference && (
                            <div className="text-[11px] text-muted-foreground font-sans">{e.reference}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Chip tone={SOURCE_TONE[e.source]}>{SOURCE_LABEL[e.source]}</Chip>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusPill status={e.status} />
                            {e.status === "posted" && !t.balanced && (
                              <span title="Unbalanced" className="text-rose-600">
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-sans">{naira(t.debit)}</td>
                        <td className="px-4 py-3 text-right font-sans">{naira(t.credit)}</td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </>
      )}

      {tab === "accounts" && (
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.02] text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium w-24">Code</th>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Normal</th>
                <th className="px-4 py-2.5 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {accounts.map((a) => {
                const b = balances.find((x) => x.account.code === a.code)!;
                return (
                  <tr key={a.code} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3 font-sans text-[12px]">{a.code}</td>
                    <td className="px-4 py-3 text-ink">{a.name}</td>
                    <td className="px-4 py-3">
                      <Chip tone={ACCOUNT_TYPE_META[a.type].tone as Parameters<typeof Chip>[0]["tone"]}>
                        {ACCOUNT_TYPE_META[a.type].label}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {ACCOUNT_TYPE_META[a.type].normal}
                    </td>
                    <td className={`px-4 py-3 text-right font-sans ${b.balance < 0 ? "text-rose-600" : "text-ink"}`}>
                      {naira(b.balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      {tab === "trial" && (
        <>
          <div className="flex justify-end mb-3">
            <button
              onClick={exportTrial}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] inline-flex items-center gap-2 hover:bg-black/[0.04]"
            >
              <Download className="h-4 w-4" /> Export trial balance
            </button>
          </div>
          <TrialBalance balances={balances} />
        </>
      )}

      {openEntry && (
        <EntryDrawer
          entry={openEntry}
          accounts={accounts}
          onClose={() => setOpenId(null)}
          onPost={() => postEntry(openEntry.id)}
          onVoid={() => voidEntry(openEntry.id)}
        />
      )}

      {creating && (
        <EntryDrawer
          entry={null}
          accounts={accounts}
          onClose={() => setCreating(false)}
          onCreate={(entry) => {
            addEntry(entry);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function KPI({
  label, value, icon, tone = "neutral",
}: {
  label: string; value: string; icon: React.ReactNode;
  tone?: "neutral" | "green" | "red";
}) {
  const toneClass =
    tone === "green" ? "text-ink" : tone === "red" ? "text-rose-700" : "text-ink";
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className={`font-display text-[22px] font-bold mt-1 ${toneClass}`}>{value}</div>
    </Card>
  );
}

function TrialBalance({ balances }: { balances: ReturnType<typeof computeBalances> }) {
  const groups: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];
  const totalDebit = balances.reduce((s, b) => s + b.debit, 0);
  const totalCredit = balances.reduce((s, b) => s + b.credit, 0);
  return (
    <TableWrap>
      <table className="w-full text-[13px]">
        <thead className="bg-black/[0.02] text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium w-24">Code</th>
            <th className="px-4 py-2.5 font-medium">Account</th>
            <th className="px-4 py-2.5 font-medium text-right">Debit</th>
            <th className="px-4 py-2.5 font-medium text-right">Credit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {groups.map((g) => {
            const rows = balances.filter((b) => b.account.type === g);
            if (!rows.length) return null;
            const gDebit = rows.reduce((s, r) => s + r.debit, 0);
            const gCredit = rows.reduce((s, r) => s + r.credit, 0);
            return (
              <>
                <tr key={`h-${g}`} className="bg-black/[0.03]">
                  <td colSpan={4} className="px-4 py-2 text-[11px] uppercase tracking-wide font-semibold text-ink">
                    {ACCOUNT_TYPE_META[g].label}s
                  </td>
                </tr>
                {rows.map((r) => (
                  <tr key={r.account.code}>
                    <td className="px-4 py-2 font-sans text-[12px]">{r.account.code}</td>
                    <td className="px-4 py-2 text-ink">{r.account.name}</td>
                    <td className="px-4 py-2 text-right font-sans">{r.debit ? naira(r.debit) : " - "}</td>
                    <td className="px-4 py-2 text-right font-sans">{r.credit ? naira(r.credit) : " - "}</td>
                  </tr>
                ))}
                <tr key={`t-${g}`} className="bg-black/[0.02] font-medium">
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2 text-muted-foreground">Subtotal</td>
                  <td className="px-4 py-2 text-right font-sans">{naira(gDebit)}</td>
                  <td className="px-4 py-2 text-right font-sans">{naira(gCredit)}</td>
                </tr>
              </>
            );
          })}
          <tr className="bg-ink text-white font-semibold">
            <td className="px-4 py-3" />
            <td className="px-4 py-3">Total</td>
            <td className="px-4 py-3 text-right font-sans">{naira(totalDebit)}</td>
            <td className="px-4 py-3 text-right font-sans">{naira(totalCredit)}</td>
          </tr>
        </tbody>
      </table>
    </TableWrap>
  );
}

function EntryDrawer({
  entry, accounts, onClose, onPost, onVoid, onCreate,
}: {
  entry: JournalEntry | null;
  accounts: Account[];
  onClose: () => void;
  onPost?: () => void;
  onVoid?: () => void;
  onCreate?: (e: Omit<JournalEntry, "id" | "createdAt">) => void;
}) {
  const isNew = !entry;
  const [description, setDescription] = useState(entry?.description ?? "");
  const [reference, setReference] = useState(entry?.reference ?? "");
  const [source, setSource] = useState<EntrySource>(entry?.source ?? "manual");
  const [date, setDate] = useState<number>(entry?.date ?? Date.now());
  const [lines, setLines] = useState<JournalLine[]>(
    entry?.lines ?? [
      { id: "n1", accountCode: accounts[0]?.code ?? "", debit: 0, credit: 0 },
      { id: "n2", accountCode: accounts[1]?.code ?? "", debit: 0, credit: 0 },
    ],
  );

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const diff = totalDebit - totalCredit;
  const balanced = Math.abs(diff) < 0.01 && totalDebit > 0;

  const update = (i: number, patch: Partial<JournalLine>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines([
      ...lines,
      { id: `n${Date.now()}`, accountCode: accounts[0]?.code ?? "", debit: 0, credit: 0 },
    ]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const canPost = balanced && description.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-[720px] bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-black/10 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {isNew ? "New entry" : entry!.id}
            </div>
            <div className="font-display font-semibold text-lg text-ink">
              {isNew ? "Create journal entry" : entry!.description}
            </div>
          </div>
          <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
        </div>

        <div className="p-5 space-y-5">
          {!isNew && (
            <div className="flex flex-wrap gap-2">
              <StatusPill status={entry!.status} />
              <Chip tone={SOURCE_TONE[entry!.source]}>{SOURCE_LABEL[entry!.source]}</Chip>
              {entry!.reference && (
                <Chip tone="neutral">
                  <FileText className="h-3 w-3" /> {entry!.reference}
                </Chip>
              )}
              {entry!.attachments ? (
                <Chip tone="neutral">
                  <Paperclip className="h-3 w-3" /> {entry!.attachments} files
                </Chip>
              ) : null}
              <Chip tone="neutral">Posted by {entry!.createdBy}</Chip>
              <Chip tone="neutral">{fmtDateTime(entry!.createdAt)}</Chip>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Description">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isNew && entry!.status !== "draft"}
                className="w-full h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] focus:outline-none focus:border-ink disabled:bg-black/[0.03]"
              />
            </Field>
            <Field label="Reference">
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={!isNew && entry!.status !== "draft"}
                placeholder="ORD-1234"
                className="w-full h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] focus:outline-none focus:border-ink disabled:bg-black/[0.03]"
              />
            </Field>
            <Field label="Source">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as EntrySource)}
                disabled={!isNew && entry!.status !== "draft"}
                className="w-full h-9 px-2 rounded-md border border-black/10 bg-white text-[13px] disabled:bg-black/[0.03]"
              >
                {(Object.keys(SOURCE_LABEL) as EntrySource[]).map((s) => (
                  <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={new Date(date).toISOString().slice(0, 10)}
                onChange={(e) => setDate(new Date(e.target.value).getTime())}
                disabled={!isNew && entry!.status !== "draft"}
                className="w-full h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] disabled:bg-black/[0.03]"
              />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] uppercase tracking-wide font-semibold text-muted-foreground">
                Lines
              </div>
              {(isNew || entry!.status === "draft") && (
                <button
                  onClick={addLine}
                  className="h-7 px-2 text-[12px] rounded border border-black/10 bg-white inline-flex items-center gap-1 hover:bg-black/[0.04]"
                >
                  <Plus className="h-3 w-3" /> Add line
                </button>
              )}
            </div>
            <div className="border border-black/10 rounded-lg overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-black/[0.03] text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Account</th>
                    <th className="px-3 py-2 font-medium">Memo</th>
                    <th className="px-3 py-2 font-medium text-right w-28">Debit</th>
                    <th className="px-3 py-2 font-medium text-right w-28">Credit</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {lines.map((l, i) => {
                    const editable = isNew || entry!.status === "draft";
                    return (
                      <tr key={l.id}>
                        <td className="px-2 py-1.5">
                          {editable ? (
                            <select
                              value={l.accountCode}
                              onChange={(e) => update(i, { accountCode: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-black/10 bg-white text-[12px]"
                            >
                              {accounts.map((a) => (
                                <option key={a.code} value={a.code}>
                                  {a.code} · {a.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-[12px]">
                              <span className="font-sans text-muted-foreground mr-1">{l.accountCode}</span>
                              {accounts.find((a) => a.code === l.accountCode)?.name}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {editable ? (
                            <input
                              value={l.memo ?? ""}
                              onChange={(e) => update(i, { memo: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-black/10 bg-white text-[12px]"
                            />
                          ) : (
                            <span className="text-[12px] text-muted-foreground">{l.memo || " - "}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {editable ? (
                            <input
                              type="number"
                              value={l.debit || ""}
                              onChange={(e) =>
                                update(i, { debit: Number(e.target.value) || 0, credit: 0 })
                              }
                              className="w-full h-8 px-2 rounded border border-black/10 bg-white text-[12px] text-right font-sans"
                            />
                          ) : (
                            <div className="text-right font-sans text-[12px]">
                              {l.debit ? naira(l.debit) : " - "}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {editable ? (
                            <input
                              type="number"
                              value={l.credit || ""}
                              onChange={(e) =>
                                update(i, { credit: Number(e.target.value) || 0, debit: 0 })
                              }
                              className="w-full h-8 px-2 rounded border border-black/10 bg-white text-[12px] text-right font-sans"
                            />
                          ) : (
                            <div className="text-right font-sans text-[12px]">
                              {l.credit ? naira(l.credit) : " - "}
                            </div>
                          )}
                        </td>
                        <td className="px-1">
                          {editable && lines.length > 2 && (
                            <button
                              onClick={() => removeLine(i)}
                              className="h-7 w-7 grid place-items-center text-muted-foreground hover:text-rose-600"
                              title="Remove line"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-black/[0.02] font-medium">
                  <tr>
                    <td className="px-3 py-2 text-right text-muted-foreground" colSpan={2}>Totals</td>
                    <td className="px-3 py-2 text-right font-sans">{naira(totalDebit)}</td>
                    <td className="px-3 py-2 text-right font-sans">{naira(totalCredit)}</td>
                    <td />
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-right text-muted-foreground" colSpan={2}>Difference</td>
                    <td
                      className={`px-3 py-2 text-right font-sans ${
                        balanced ? "text-ink" : "text-rose-700"
                      }`}
                      colSpan={2}
                    >
                      {balanced ? "Balanced" : naira(diff)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-black/10 px-5 py-3 flex items-center justify-between gap-3">
          <div className="text-[12px] text-muted-foreground">
            {balanced ? (
              <span className="inline-flex items-center gap-1 text-ink">
                <Check className="h-3.5 w-3.5" /> Entry balances
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" /> Debits and credits must match
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isNew && entry!.status === "posted" && (
              <button
                onClick={onVoid}
                className="h-9 px-3 rounded-md border border-rose-200 text-rose-700 bg-white text-[13px] inline-flex items-center gap-2 hover:bg-rose-50"
              >
                <Ban className="h-4 w-4" /> Void
              </button>
            )}
            {!isNew && entry!.status === "draft" && (
              <button
                onClick={onPost}
                disabled={!balanced}
                className="h-9 px-3 rounded-md bg-ink text-white text-[13px] inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> Post entry
              </button>
            )}
            {isNew && (
              <>
                <button
                  onClick={() =>
                    onCreate?.({
                      date, description, reference: reference || undefined, source,
                      status: "draft", createdBy: "finance@aslorig.co", lines,
                    })
                  }
                  disabled={!description.trim()}
                  className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] inline-flex items-center gap-2 hover:bg-black/[0.04] disabled:opacity-40"
                >
                  <Save className="h-4 w-4" /> Save draft
                </button>
                <button
                  onClick={() =>
                    onCreate?.({
                      date, description, reference: reference || undefined, source,
                      status: "posted", createdBy: "finance@aslorig.co", lines,
                    })
                  }
                  disabled={!canPost}
                  className="h-9 px-3 rounded-md bg-ink text-white text-[13px] inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-40"
                >
                  <Check className="h-4 w-4" /> Save & post
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
