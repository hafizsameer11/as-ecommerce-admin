import { create } from "zustand";
import { koboToNaira, nairaToKobo } from "@/lib/api/client";
import { walletsAdminApi } from "@/lib/api/platform";

export type WalletTxKind =
  | "topup"
  | "refund"
  | "credit"
  | "adjustment"
  | "spend"
  | "withdrawal"
  | "expiry";

export type WalletTxStatus = "completed" | "pending" | "failed" | "reversed";

export type WalletTx = {
  id: string;
  customerId: string;
  customerName: string;
  kind: WalletTxKind;
  status: WalletTxStatus;
  amount: number;
  balanceAfter: number;
  reference: string;
  note?: string;
  channel: "paystack" | "flutterwave" | "bank_transfer" | "admin" | "system";
  at: string;
};

const KINDS = new Set<WalletTxKind>([
  "topup", "refund", "credit", "adjustment", "spend", "withdrawal", "expiry",
]);
const STATUSES = new Set<WalletTxStatus>(["completed", "pending", "failed", "reversed"]);
const CHANNELS = new Set<WalletTx["channel"]>([
  "paystack", "flutterwave", "bank_transfer", "admin", "system",
]);

function str(v: unknown, fallback = "") {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapChannel(raw: string): WalletTx["channel"] {
  const c = raw.toLowerCase().replace(/\s+/g, "_");
  if (CHANNELS.has(c as WalletTx["channel"])) return c as WalletTx["channel"];
  if (c.includes("paystack")) return "paystack";
  if (c.includes("flutterwave")) return "flutterwave";
  if (c.includes("bank")) return "bank_transfer";
  if (c.includes("admin")) return "admin";
  return "system";
}

function mapTx(row: Record<string, unknown>): WalletTx {
  const kindRaw = str(row.kind, "adjustment") as WalletTxKind;
  const statusRaw = str(row.status, "completed") as WalletTxStatus;
  const atRaw = row.at ?? row.createdAt;
  return {
    id: str(row.id),
    customerId: str(row.customerId),
    customerName: str(row.customerName, "Customer"),
    kind: KINDS.has(kindRaw) ? kindRaw : "adjustment",
    status: STATUSES.has(statusRaw) ? statusRaw : "completed",
    amount: koboToNaira(num(row.amount)),
    balanceAfter: koboToNaira(num(row.balanceAfter)),
    reference: str(row.reference),
    note: row.note == null ? undefined : str(row.note) || undefined,
    channel: mapChannel(str(row.channel, "system")),
    at: typeof atRaw === "string" ? atRaw : new Date(ts(atRaw)).toISOString(),
  };
}

function ts(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" || v instanceof Date) {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : Date.now();
  }
  return Date.now();
}

type State = {
  txs: WalletTx[];
  freezes: Record<string, boolean>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  create: (input: Omit<WalletTx, "id" | "at" | "balanceAfter"> & { balanceAfter?: number }) => Promise<string>;
  updateStatus: (id: string, status: WalletTxStatus) => Promise<void>;
  reverse: (id: string) => Promise<void>;
  toggleFreeze: (customerId: string) => Promise<void>;
  reset: () => void;
};

export const useWallets = create<State>()((set, get) => ({
  txs: [],
  freezes: {},
  hydrated: false,
  hydrate: async () => {
    try {
      const { data, meta } = await walletsAdminApi.list({ page: 1, pageSize: 50 });
      void meta;
      const rows = (data as Record<string, unknown>[]) ?? [];
      const txs = rows.map(mapTx);
      const freezes: Record<string, boolean> = {};
      for (const row of rows) {
        const customerId = str(row.customerId);
        if (customerId) freezes[customerId] = Boolean(row.frozen);
      }
      set({ txs, freezes, hydrated: true });
    } catch (err) {
      console.warn("[wallets] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  create: async (input) => {
    try {
      const kind = input.kind === "credit" ? "credit" : "adjustment";
      const created = mapTx(
        (await walletsAdminApi.adjust({
          customerId: input.customerId,
          amount: nairaToKobo(input.amount),
          kind,
          note: input.note || (kind === "credit" ? "Goodwill credit" : "Balance adjustment"),
        })) as Record<string, unknown>,
      );
      // adjust returns raw prisma row — fill customer fields from input / rehydrate
      const tx: WalletTx = {
        ...created,
        customerId: input.customerId,
        customerName: input.customerName,
        kind: input.kind,
        channel: input.channel,
        note: input.note ?? created.note,
        reference: created.reference || input.reference,
      };
      set((s) => ({ txs: [tx, ...s.txs.filter((t) => t.id !== tx.id)] }));
      await get().hydrate();
      return tx.id;
    } catch (err) {
      console.warn("[wallets] create", err);
      await get().hydrate();
      return "";
    }
  },
  updateStatus: async (id, status) => {
    set((s) => ({
      txs: s.txs.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
    try {
      if (status === "completed") {
        await walletsAdminApi.approve(id);
      } else if (status === "failed") {
        await walletsAdminApi.markFailed(id, { reason: "Marked failed by admin" });
      }
      await get().hydrate();
    } catch (err) {
      console.warn("[wallets] updateStatus", err);
      await get().hydrate();
    }
  },
  reverse: async (id) => {
    try {
      await walletsAdminApi.reverse(id);
      await get().hydrate();
    } catch (err) {
      console.warn("[wallets] reverse", err);
      await get().hydrate();
    }
  },
  toggleFreeze: async (customerId) => {
    const next = !get().freezes[customerId];
    set((s) => ({ freezes: { ...s.freezes, [customerId]: next } }));
    try {
      if (next) await walletsAdminApi.freeze(customerId);
      else await walletsAdminApi.unfreeze(customerId);
      await get().hydrate();
    } catch (err) {
      console.warn("[wallets] toggleFreeze", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));
