import { create } from "zustand";
import type { Review } from "./reviews";
import { ordersAdminApi } from "@/lib/api/orders";

export type ReviewStatus = "pending" | "published" | "rejected" | "flagged";

export type AdminReview = Review & {
  productId: string;
  productName: string;
  productImage: string;
  productBrand: string;
  status: ReviewStatus;
  flaggedReason?: string;
  reply?: { body: string; at: number; author: string };
  reportedCount: number;
};

function mapFit(fit: unknown): Review["fit"] | undefined {
  const s = String(fit ?? "");
  if (s === "Runs small" || s === "runs_small") return "Runs small";
  if (s === "True to size" || s === "true_to_size") return "True to size";
  if (s === "Runs large" || s === "runs_large") return "Runs large";
  return undefined;
}

function mapReview(r: Record<string, unknown>): AdminReview {
  const replyRaw = r.reply as { body?: string; at?: string | number; author?: string } | null | undefined;
  const dateVal = r.date ?? r.createdAt;
  const dateStr = dateVal
    ? new Date(dateVal as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  return {
    id: String(r.id),
    author: String(r.author ?? r.authorName ?? "Anonymous"),
    initials: String(r.initials ?? "AN"),
    rating: Number(r.rating ?? 0),
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    date: dateStr,
    verified: !!r.verified,
    helpful: Number(r.helpful ?? r.helpfulCount ?? 0),
    size: r.size ? String(r.size) : undefined,
    fit: mapFit(r.fit),
    productId: String(r.productId ?? ""),
    productName: String(r.productName ?? ""),
    productImage: String(r.productImage ?? ""),
    productBrand: String(r.productBrand ?? ""),
    status: (r.status as ReviewStatus) || "pending",
    flaggedReason: r.flaggedReason ? String(r.flaggedReason) : undefined,
    reply: replyRaw?.body
      ? {
          body: String(replyRaw.body),
          author: String(replyRaw.author ?? "ASL Support"),
          at: replyRaw.at ? new Date(replyRaw.at).getTime() : Date.now(),
        }
      : undefined,
    reportedCount: Number(r.reportedCount ?? 0),
  };
}

const STATUS_TO_BULK: Record<ReviewStatus, "publish" | "reject" | "flag" | null> = {
  published: "publish",
  rejected: "reject",
  flagged: "flag",
  pending: null,
};

type State = {
  reviews: AdminReview[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setStatus: (id: string, status: ReviewStatus) => Promise<void>;
  setStatusMany: (ids: string[], status: ReviewStatus) => Promise<void>;
  reply: (id: string, body: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeMany: (ids: string[]) => Promise<void>;
  reset: () => void;
};

export const useAdminReviews = create<State>()((set, get) => ({
  reviews: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await ordersAdminApi.listReviews({ pageSize: 100 });
      set({ reviews: (data as Record<string, unknown>[]).map(mapReview), hydrated: true });
    } catch (err) {
      console.warn("[reviews] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  setStatus: async (id, status) => {
    set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, status } : r)) }));
    try {
      const updated = mapReview(
        (await ordersAdminApi.setReviewStatus(id, status)) as Record<string, unknown>,
      );
      set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? updated : r)) }));
    } catch (err) {
      console.warn("[reviews] status sync", err);
      await get().hydrate();
    }
  },
  setStatusMany: async (ids, status) => {
    const action = STATUS_TO_BULK[status];
    set((s) => ({
      reviews: s.reviews.map((r) => (ids.includes(r.id) ? { ...r, status } : r)),
    }));
    if (!action) return;
    try {
      await ordersAdminApi.bulkReviews(ids, action);
      await get().hydrate();
    } catch (err) {
      console.warn("[reviews] bulk status", err);
      await get().hydrate();
    }
  },
  reply: async (id, body) => {
    const optimistic = { body, at: Date.now(), author: "ASL Support" };
    set((s) => ({
      reviews: s.reviews.map((r) => (r.id === id ? { ...r, reply: optimistic } : r)),
    }));
    try {
      const res = (await ordersAdminApi.replyReview(id, body)) as Record<string, unknown>;
      const replyRaw = res.reply as { body?: string; at?: string | number; author?: string } | null | undefined;
      const reply = replyRaw?.body
        ? {
            body: String(replyRaw.body),
            author: String(replyRaw.author ?? "ASL Support"),
            at: replyRaw.at ? new Date(replyRaw.at).getTime() : Date.now(),
          }
        : optimistic;
      set((s) => ({
        reviews: s.reviews.map((r) => (r.id === id ? { ...r, reply } : r)),
      }));
    } catch (err) {
      console.warn("[reviews] reply sync", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    await ordersAdminApi.removeReview(id);
    set((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) }));
  },
  removeMany: async (ids) => {
    if (!ids.length) return;
    await ordersAdminApi.bulkReviews(ids, "delete");
    set((s) => ({ reviews: s.reviews.filter((r) => !ids.includes(r.id)) }));
  },
  reset: () => void get().hydrate(),
}));
