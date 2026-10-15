import { create } from "zustand";
import { activityAdminApi } from "@/lib/api/platform";
import { koboToNaira } from "@/lib/api/client";

export type ActivityType =
  | "order.placed"
  | "order.paid"
  | "order.shipped"
  | "order.cancelled"
  | "order.refunded"
  | "return.requested"
  | "concierge.requested"
  | "concierge.quoted"
  | "concierge.approved"
  | "catalog.updated"
  | "review.submitted"
  | "coupon.minted"
  | "customer.tier_upgraded"
  | "customer.vip"
  | "payout.pending"
  | "payout.paid"
  | "ticket.created"
  | "stock.low"
  | "system"
  | string;

export type ActivityEntry = {
  id: string;
  type: ActivityType;
  title: string;
  meta?: string;
  amount?: number;
  link?: string;
  at: number;
};

type State = {
  entries: ActivityEntry[];
  hydrated: boolean;
  tabs: Record<string, number>;
  hydrate: (query?: { type?: string; q?: string; since?: string }) => Promise<void>;
  push: (e: Omit<ActivityEntry, "id" | "at"> & { at?: number; id?: string }) => void;
  clear: () => void;
};

function mapEntry(row: Record<string, unknown>): ActivityEntry {
  return {
    id: String(row.id),
    type: String(row.type || "system"),
    title: String(row.title ?? ""),
    meta: row.meta ? String(row.meta) : undefined,
    amount:
      row.amount === null || row.amount === undefined
        ? undefined
        : koboToNaira(Number(row.amount)),
    link: row.link ? String(row.link) : undefined,
    at: row.createdAt
      ? new Date(row.createdAt as string).getTime()
      : row.at
        ? Number(row.at)
        : Date.now(),
  };
}

export const useActivity = create<State>()((set, get) => ({
  entries: [],
  hydrated: false,
  tabs: {},
  hydrate: async (query = {}) => {
    try {
      const { data, meta } = await activityAdminApi.list({ pageSize: 50, ...query });
      const rows = Array.isArray(data)
        ? (data as Record<string, unknown>[])
        : (((data as { items?: Record<string, unknown>[] })?.items ?? []) as Record<string, unknown>[]);
      set({
        entries: rows.map(mapEntry),
        tabs: ((meta?.tabs as Record<string, number>) ?? {}),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[activity] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  push: (e) =>
    set((s) => ({
      entries: [
        {
          id: e.id ?? `act_${Math.random().toString(36).slice(2, 10)}`,
          at: e.at ?? Date.now(),
          type: e.type,
          title: e.title,
          meta: e.meta,
          amount: e.amount,
          link: e.link,
        },
        ...s.entries,
      ].slice(0, 200),
    })),
  clear: () => {
    set({ entries: [] });
    void get().hydrate();
  },
}));
