import { create } from "zustand";
import { koboToNaira, nairaToKobo } from "@/lib/api/client";
import { payoutsAdminApi } from "@/lib/api/platform";

export type PayoutStatus = "scheduled" | "in_transit" | "paid" | "failed" | "on_hold";
export type PayoutProvider = "Paystack" | "Flutterwave" | "Stripe" | "Manual Bank";

export type PayoutTxn = {
  id: string;
  orderId: string;
  grossNGN: number;
  feeNGN: number;
  netNGN: number;
  capturedAt: number;
};

export type Payout = {
  id: string;
  provider: PayoutProvider;
  reference: string;
  status: PayoutStatus;
  currency: "NGN";
  grossNGN: number;
  feesNGN: number;
  refundsNGN: number;
  adjustmentsNGN: number;
  netNGN: number;
  bankName: string;
  bankAccountMasked: string;
  bankAccountName: string;
  scheduledAt: number;
  paidAt?: number;
  txnCount: number;
  transactions: PayoutTxn[];
  notes?: string;
  failureReason?: string;
};

const STATUSES = new Set<PayoutStatus>(["scheduled", "in_transit", "paid", "failed", "on_hold"]);

const PROVIDER_FROM_API: Record<string, PayoutProvider> = {
  paystack: "Paystack",
  flutterwave: "Flutterwave",
  stripe: "Stripe",
  manual: "Manual Bank",
  "manual bank": "Manual Bank",
};

const PROVIDER_TO_API: Record<PayoutProvider, string> = {
  Paystack: "paystack",
  Flutterwave: "flutterwave",
  Stripe: "stripe",
  "Manual Bank": "manual",
};

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

function mapProvider(row: Record<string, unknown>): PayoutProvider {
  const label = str(row.providerLabel || row.provider);
  const key = label.toLowerCase();
  if (PROVIDER_FROM_API[key]) return PROVIDER_FROM_API[key];
  if (label === "Paystack" || label === "Flutterwave" || label === "Stripe" || label === "Manual Bank") {
    return label;
  }
  return "Manual Bank";
}

function mapTxn(row: Record<string, unknown>): PayoutTxn {
  return {
    id: str(row.id || row.paymentRef),
    orderId: str(row.orderNumber || row.orderId, "—"),
    grossNGN: koboToNaira(num(row.gross ?? row.grossNGN)),
    feeNGN: koboToNaira(num(row.fee ?? row.feeNGN)),
    netNGN: koboToNaira(num(row.net ?? row.netNGN)),
    capturedAt: ts(row.capturedAt),
  };
}

function mapPayout(row: Record<string, unknown>): Payout {
  const statusRaw = str(row.status, "scheduled") as PayoutStatus;
  const txns = Array.isArray(row.transactions)
    ? (row.transactions as Record<string, unknown>[]).map(mapTxn)
    : [];
  return {
    id: str(row.number || row.id),
    provider: mapProvider(row),
    reference: str(row.reference),
    status: STATUSES.has(statusRaw) ? statusRaw : "scheduled",
    currency: "NGN",
    grossNGN: koboToNaira(num(row.gross ?? row.grossNGN)),
    feesNGN: koboToNaira(num(row.fees ?? row.feesNGN)),
    refundsNGN: koboToNaira(num(row.refunds ?? row.refundsNGN)),
    adjustmentsNGN: koboToNaira(num(row.adjustments ?? row.adjustmentsNGN)),
    netNGN: koboToNaira(num(row.net ?? row.netNGN)),
    bankName: str(row.bankName),
    bankAccountMasked: str(row.bankAccountMasked),
    bankAccountName: str(row.bankAccountName),
    scheduledAt: ts(row.scheduledAt),
    paidAt: row.paidAt ? ts(row.paidAt) : undefined,
    txnCount: num(row.txnCount, txns.length),
    transactions: txns,
    notes: row.notes == null ? undefined : str(row.notes) || undefined,
    failureReason: row.failureReason == null ? undefined : str(row.failureReason) || undefined,
  };
}

async function mapPayoutDetailed(row: Record<string, unknown>): Promise<Payout> {
  const base = mapPayout(row);
  if (base.transactions.length > 0 || base.txnCount === 0) return base;
  try {
    const full = (await payoutsAdminApi.get(str(row.id || row.number))) as Record<string, unknown>;
    return mapPayout(full);
  } catch {
    return base;
  }
}

type State = {
  payouts: Payout[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (p: Payout) => Promise<void>;
  update: (id: string, patch: Partial<Payout>) => Promise<void>;
  markPaid: (id: string) => Promise<void>;
  markFailed: (id: string, reason: string) => Promise<void>;
  retry: (id: string) => Promise<void>;
  hold: (id: string, note: string) => Promise<void>;
  release: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  sync: () => Promise<void>;
};

function replacePayout(list: Payout[], id: string, next: Payout) {
  return list.map((p) => (p.id === id || p.id === next.id ? next : p));
}

export const usePayouts = create<State>()((set, get) => ({
  payouts: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await payoutsAdminApi.list({ pageSize: 100 });
      const rows = data as Record<string, unknown>[];
      const payouts = await Promise.all(rows.map(mapPayoutDetailed));
      set({ payouts, hydrated: true });
    } catch (err) {
      console.warn("[payouts] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  add: async (p) => {
    try {
      const created = mapPayout(
        (await payoutsAdminApi.create({
          provider: PROVIDER_TO_API[p.provider] ?? "manual",
          reference: p.reference || undefined,
          gross: nairaToKobo(p.grossNGN),
          fees: nairaToKobo(p.feesNGN),
          refunds: nairaToKobo(p.refundsNGN),
          adjustments: nairaToKobo(p.adjustmentsNGN),
          scheduledAt: new Date(p.scheduledAt).toISOString(),
          status: p.status === "in_transit" ? "in_transit" : "scheduled",
          bankName: p.bankName || undefined,
          bankAccountMasked: p.bankAccountMasked || undefined,
          bankAccountName: p.bankAccountName || undefined,
          notes: p.notes ?? null,
        })) as Record<string, unknown>,
      );
      set((st) => ({ payouts: [created, ...st.payouts] }));
    } catch (err) {
      console.warn("[payouts] add", err);
      await get().hydrate();
    }
  },
  update: async (id, patch) => {
    set((st) => ({
      payouts: st.payouts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    try {
      const updated = mapPayout(
        (await payoutsAdminApi.update(id, {
          notes: patch.notes ?? undefined,
          scheduledAt: patch.scheduledAt ? new Date(patch.scheduledAt).toISOString() : undefined,
        })) as Record<string, unknown>,
      );
      set((st) => ({ payouts: replacePayout(st.payouts, id, updated) }));
    } catch (err) {
      console.warn("[payouts] update", err);
      await get().hydrate();
    }
  },
  markPaid: async (id) => {
    set((st) => ({
      payouts: st.payouts.map((p) =>
        p.id === id ? { ...p, status: "paid" as const, paidAt: Date.now(), failureReason: undefined } : p,
      ),
    }));
    try {
      const updated = mapPayout((await payoutsAdminApi.markPaid(id)) as Record<string, unknown>);
      set((st) => ({ payouts: replacePayout(st.payouts, id, updated) }));
    } catch (err) {
      console.warn("[payouts] markPaid", err);
      await get().hydrate();
    }
  },
  markFailed: async (id, reason) => {
    set((st) => ({
      payouts: st.payouts.map((p) =>
        p.id === id ? { ...p, status: "failed" as const, failureReason: reason } : p,
      ),
    }));
    try {
      const updated = mapPayout(
        (await payoutsAdminApi.markFailed(id, { reason })) as Record<string, unknown>,
      );
      set((st) => ({ payouts: replacePayout(st.payouts, id, updated) }));
    } catch (err) {
      console.warn("[payouts] markFailed", err);
      await get().hydrate();
    }
  },
  retry: async (id) => {
    set((st) => ({
      payouts: st.payouts.map((p) =>
        p.id === id
          ? { ...p, status: "in_transit" as const, failureReason: undefined, scheduledAt: Date.now() }
          : p,
      ),
    }));
    try {
      const updated = mapPayout((await payoutsAdminApi.retry(id)) as Record<string, unknown>);
      set((st) => ({ payouts: replacePayout(st.payouts, id, updated) }));
    } catch (err) {
      console.warn("[payouts] retry", err);
      await get().hydrate();
    }
  },
  hold: async (id, note) => {
    set((st) => ({
      payouts: st.payouts.map((p) => (p.id === id ? { ...p, status: "on_hold" as const, notes: note } : p)),
    }));
    try {
      const updated = mapPayout(
        (await payoutsAdminApi.hold(id, { note })) as Record<string, unknown>,
      );
      set((st) => ({ payouts: replacePayout(st.payouts, id, updated) }));
    } catch (err) {
      console.warn("[payouts] hold", err);
      await get().hydrate();
    }
  },
  release: async (id) => {
    set((st) => ({
      payouts: st.payouts.map((p) => (p.id === id ? { ...p, status: "scheduled" as const } : p)),
    }));
    try {
      const updated = mapPayout((await payoutsAdminApi.release(id)) as Record<string, unknown>);
      set((st) => ({ payouts: replacePayout(st.payouts, id, updated) }));
    } catch (err) {
      console.warn("[payouts] release", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    set((st) => ({ payouts: st.payouts.filter((p) => p.id !== id) }));
    try {
      await payoutsAdminApi.remove(id);
    } catch (err) {
      console.warn("[payouts] remove", err);
      await get().hydrate();
    }
  },
  sync: async () => {
    try {
      await payoutsAdminApi.sync();
      await get().hydrate();
    } catch (err) {
      console.warn("[payouts] sync", err);
      await get().hydrate();
    }
  },
}));

export const PAYOUT_STATUS_META: Record<
  PayoutStatus,
  { label: string; tone: "neutral" | "gold" | "green" | "red" | "blue" | "amber" | "purple" | "slate" }
> = {
  scheduled: { label: "Scheduled", tone: "slate" },
  in_transit: { label: "In transit", tone: "blue" },
  paid: { label: "Paid", tone: "green" },
  failed: { label: "Failed", tone: "red" },
  on_hold: { label: "On hold", tone: "amber" },
};
