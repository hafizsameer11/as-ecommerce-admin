import { create } from "zustand";
import { koboToNaira, nairaToKobo } from "@/lib/api/client";
import { ledgerAdminApi } from "@/lib/api/platform";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type EntryStatus = "posted" | "draft" | "void";
export type EntrySource =
  | "order" | "refund" | "payout" | "fee" | "adjustment" | "tax" | "wallet" | "manual";

export type Account = {
  code: string;
  name: string;
  type: AccountType;
  currency: "NGN";
  archived?: boolean;
};

export type JournalLine = {
  id: string;
  accountCode: string;
  debit: number;
  credit: number;
  memo?: string;
};

export type JournalEntry = {
  id: string;
  date: number;
  reference?: string;
  description: string;
  source: EntrySource;
  status: EntryStatus;
  createdBy: string;
  createdAt: number;
  lines: JournalLine[];
  attachments?: number;
};

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; tone: string; normal: "debit" | "credit" }> = {
  asset:     { label: "Asset",     tone: "blue",   normal: "debit"  },
  liability: { label: "Liability", tone: "purple", normal: "credit" },
  equity:    { label: "Equity",    tone: "slate",  normal: "credit" },
  revenue:   { label: "Revenue",   tone: "green",  normal: "credit" },
  expense:   { label: "Expense",   tone: "amber",  normal: "debit"  },
};

export const SOURCE_LABEL: Record<EntrySource, string> = {
  order: "Order", refund: "Refund", payout: "Payout", fee: "Processor fee",
  adjustment: "Adjustment", tax: "Tax", wallet: "Wallet", manual: "Manual",
};

const ACCOUNT_TYPES = new Set<AccountType>(["asset", "liability", "equity", "revenue", "expense"]);
const ENTRY_SOURCES = new Set<EntrySource>([
  "order", "refund", "payout", "fee", "adjustment", "tax", "wallet", "manual",
]);
const ENTRY_STATUSES = new Set<EntryStatus>(["posted", "draft", "void"]);
const MANUAL_SOURCES = new Set(["manual", "adjustment", "tax"]);

function str(v: unknown, fallback = "") {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function ts(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" || v instanceof Date) {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : Date.now();
  }
  return Date.now();
}

function mapAccount(row: Record<string, unknown>): Account {
  const typeRaw = str(row.type, "asset") as AccountType;
  return {
    code: str(row.code),
    name: str(row.name),
    type: ACCOUNT_TYPES.has(typeRaw) ? typeRaw : "asset",
    currency: "NGN",
    archived: Boolean(row.archived),
  };
}

function mapLine(row: Record<string, unknown>): JournalLine {
  return {
    id: str(row.id),
    accountCode: str(row.accountCode),
    debit: koboToNaira(num(row.debit)),
    credit: koboToNaira(num(row.credit)),
    memo: row.memo == null ? undefined : str(row.memo) || undefined,
  };
}

function mapEntry(row: Record<string, unknown>): JournalEntry {
  const sourceRaw = str(row.source, "manual") as EntrySource;
  const statusRaw = str(row.status, "draft") as EntryStatus;
  const lines = Array.isArray(row.lines)
    ? (row.lines as Record<string, unknown>[]).map(mapLine)
    : [];
  return {
    id: str(row.number || row.id),
    date: ts(row.date),
    reference: row.reference == null ? undefined : str(row.reference) || undefined,
    description: str(row.description),
    source: ENTRY_SOURCES.has(sourceRaw) ? sourceRaw : "manual",
    status: ENTRY_STATUSES.has(statusRaw) ? statusRaw : "draft",
    createdBy: str(row.createdBy, "system"),
    createdAt: ts(row.createdAt),
    lines,
    attachments: row.attachments == null ? undefined : num(row.attachments),
  };
}

function entryBody(e: Omit<JournalEntry, "id" | "createdAt"> | Partial<JournalEntry>) {
  const source = e.source && MANUAL_SOURCES.has(e.source) ? e.source : "manual";
  return {
    date: e.date ? new Date(e.date).toISOString() : undefined,
    reference: e.reference ?? null,
    description: e.description ?? "",
    source,
    status: e.status === "draft" ? "draft" : "posted",
    lines: (e.lines ?? []).map((l) => ({
      accountCode: l.accountCode,
      debit: nairaToKobo(l.debit || 0),
      credit: nairaToKobo(l.credit || 0),
      memo: l.memo ?? null,
    })),
  };
}

export type LedgerState = {
  accounts: Account[];
  entries: JournalEntry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addEntry: (e: Omit<JournalEntry, "id" | "createdAt">) => Promise<JournalEntry>;
  updateEntry: (id: string, patch: Partial<JournalEntry>) => Promise<void>;
  postEntry: (id: string) => Promise<void>;
  voidEntry: (id: string) => Promise<void>;
  addAccount: (a: Account) => Promise<void>;
  reseed: () => void;
};

export const useLedger = create<LedgerState>()((set, get) => ({
  accounts: [],
  entries: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const [accountsRes, entriesRes] = await Promise.all([
        ledgerAdminApi.accounts({}),
        ledgerAdminApi.entries({ pageSize: 100 }),
      ]);
      set({
        accounts: (accountsRes.data as Record<string, unknown>[]).map(mapAccount),
        entries: (entriesRes.data as Record<string, unknown>[]).map(mapEntry),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[ledger] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  addEntry: async (e) => {
    try {
      const created = mapEntry(
        (await ledgerAdminApi.createEntry(entryBody(e))) as Record<string, unknown>,
      );
      set((s) => ({ entries: [created, ...s.entries] }));
      return created;
    } catch (err) {
      console.warn("[ledger] addEntry", err);
      await get().hydrate();
      return {
        ...e,
        id: `JE-ERR`,
        createdAt: Date.now(),
      };
    }
  },
  updateEntry: async (id, patch) => {
    set((s) => ({
      entries: s.entries.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
    try {
      const updated = mapEntry(
        (await ledgerAdminApi.updateEntry(id, entryBody(patch))) as Record<string, unknown>,
      );
      set((s) => ({
        entries: s.entries.map((x) => (x.id === id || x.id === updated.id ? updated : x)),
      }));
    } catch (err) {
      console.warn("[ledger] updateEntry", err);
      await get().hydrate();
    }
  },
  postEntry: async (id) => {
    set((s) => ({
      entries: s.entries.map((x) => (x.id === id ? { ...x, status: "posted" as const } : x)),
    }));
    try {
      const updated = mapEntry(
        (await ledgerAdminApi.postEntry(id)) as Record<string, unknown>,
      );
      set((s) => ({
        entries: s.entries.map((x) => (x.id === id || x.id === updated.id ? updated : x)),
      }));
    } catch (err) {
      console.warn("[ledger] postEntry", err);
      await get().hydrate();
    }
  },
  voidEntry: async (id) => {
    set((s) => ({
      entries: s.entries.map((x) => (x.id === id ? { ...x, status: "void" as const } : x)),
    }));
    try {
      const updated = mapEntry(
        (await ledgerAdminApi.voidEntry(id)) as Record<string, unknown>,
      );
      set((s) => ({
        entries: s.entries.map((x) => (x.id === id || x.id === updated.id ? updated : x)),
      }));
    } catch (err) {
      console.warn("[ledger] voidEntry", err);
      await get().hydrate();
    }
  },
  addAccount: async (a) => {
    try {
      const created = mapAccount(
        (await ledgerAdminApi.addAccount({
          code: a.code,
          name: a.name,
          type: a.type,
        })) as Record<string, unknown>,
      );
      set((s) => ({ accounts: [...s.accounts, created] }));
    } catch (err) {
      console.warn("[ledger] addAccount", err);
      await get().hydrate();
    }
  },
  reseed: () => void get().hydrate(),
}));

export function entryTotals(e: JournalEntry) {
  const debit = e.lines.reduce((s, l) => s + l.debit, 0);
  const credit = e.lines.reduce((s, l) => s + l.credit, 0);
  return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 };
}

export type AccountBalance = {
  account: Account;
  debit: number;
  credit: number;
  balance: number;
};

export function computeBalances(
  accounts: Account[],
  entries: JournalEntry[],
  opts: { from?: number; to?: number } = {},
): AccountBalance[] {
  const posted = entries.filter((e) => e.status === "posted");
  return accounts.map((a) => {
    let debit = 0, credit = 0;
    for (const e of posted) {
      if (opts.from && e.date < opts.from) continue;
      if (opts.to && e.date > opts.to) continue;
      for (const l of e.lines) {
        if (l.accountCode !== a.code) continue;
        debit += l.debit;
        credit += l.credit;
      }
    }
    const normal = ACCOUNT_TYPE_META[a.type].normal;
    const balance = normal === "debit" ? debit - credit : credit - debit;
    return { account: a, debit, credit, balance };
  });
}
