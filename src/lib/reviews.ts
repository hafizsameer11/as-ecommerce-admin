import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getProductRating } from "@/lib/shop-data";

export type Review = {
  id: string;
  author: string;
  initials: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
  helpful: number;
  size?: string;
  fit?: "Runs small" | "True to size" | "Runs large";
};

const NAMES = [
  "Adaeze O.", "Tunde A.", "Kemi B.", "Ibrahim K.", "Chika E.", "Lola M.",
  "David N.", "Fatima S.", "Emeka U.", "Zainab Y.", "Bola R.", "Segun A.",
  "Nkechi P.", "Femi O.", "Halima D.",
];
const TITLES = [
  "Exactly what I hoped for", "Premium quality", "Feels luxurious", "Perfect fit",
  "Worth every naira", "Cop or drop? Definitely cop", "Genuine article",
  "Delivered fast, packed beautifully", "Repeat buyer", "Fire piece",
];
const BODIES = [
  "Materials feel premium and the finishing is clean. Sizing was accurate - order your usual.",
  "Second time ordering from ASL. Authenticity, packaging and delivery all on point.",
  "Nailed the color, nailed the fit. Wore it out the same evening.",
  "Slight wait but concierge kept me updated the whole way. Worth it.",
  "Fits true to size for me. Fabric drapes well and holds shape.",
  "Feels heavier / better made than I expected from the pictures.",
  "Boxed and sealed exactly like retail. Barcode & tags all intact.",
  "Colour is a touch deeper in person - even better than the photos.",
];
const FITS: Review["fit"][] = ["Runs small", "True to size", "True to size", "True to size", "Runs large"];

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}

function pick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length];
}

export function getProductReviews(productId: string): Review[] {
  const { rating, reviews: total } = getProductRating(productId);
  const seed = productId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const count = Math.min(6, Math.max(3, total % 6 + 3));
  const out: Review[] = [];
  for (let i = 0; i < count; i++) {
    const s = seed + i * 17;
    const name = pick(NAMES, s, i * 3);
    // Distribute ratings around the aggregate, weighted toward the top
    const delta = i === 0 ? 0 : ((s + i) % 5) - 2;
    const r = Math.max(3, Math.min(5, Math.round(rating + delta * 0.4)));
    const daysAgo = 3 + (s % 90);
    const date = new Date(Date.now() - daysAgo * 86400000);
    out.push({
      id: `${productId}-r${i}`,
      author: name,
      initials: initials(name),
      rating: r,
      title: pick(TITLES, s, i),
      body: pick(BODIES, s, i * 2),
      date: date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      verified: i % 4 !== 0,
      helpful: 3 + (s % 42),
      size: undefined,
      fit: FITS[(s + i) % FITS.length],
    });
  }
  return out;
}

/* ---------- User-submitted reviews ---------- */

export type UserReview = Omit<Review, "date" | "id" | "helpful" | "initials"> & {
  productId: string;
};

type UserReviewsState = {
  byProduct: Record<string, Review[]>;
  add: (r: UserReview) => void;
  clear: (productId: string) => void;
};

function initialsOf(name: string) {
  return name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}

export const useUserReviews = create<UserReviewsState>()(
  persist(
    (set) => ({
      byProduct: {},
      add: (r) =>
        set((s) => {
          const list = s.byProduct[r.productId] ?? [];
          const entry: Review = {
            id: `u-${r.productId}-${Date.now()}`,
            author: r.author,
            initials: initialsOf(r.author),
            rating: r.rating,
            title: r.title,
            body: r.body,
            date: new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
            verified: r.verified ?? false,
            helpful: 0,
            size: r.size,
            fit: r.fit,
          };
          return { byProduct: { ...s.byProduct, [r.productId]: [entry, ...list] } };
        }),
      clear: (productId) =>
        set((s) => {
          const { [productId]: _, ...rest } = s.byProduct;
          return { byProduct: rest };
        }),
    }),
    { name: "asl-user-reviews" }
  )
);

export function getAllReviews(productId: string): Review[] {
  const user = useUserReviews.getState().byProduct[productId] ?? [];
  return [...user, ...getProductReviews(productId)];
}

export function getRatingBreakdown(productId: string) {
  const revs = getAllReviews(productId);
  const buckets: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of revs) buckets[r.rating]++;
  const total = revs.length;
  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: buckets[star],
    pct: total ? Math.round((buckets[star] / total) * 100) : 0,
  }));
}


/* ---------- Notify me store (for out-of-stock items) ---------- */

type NotifyState = {
  items: Record<string, string>; // productId -> ISO date
  add: (productId: string) => void;
  remove: (productId: string) => void;
  has: (productId: string) => boolean;
};

export const useNotify = create<NotifyState>()(
  persist(
    (set, get) => ({
      items: {},
      add: (id) => set((s) => ({ items: { ...s.items, [id]: new Date().toISOString() } })),
      remove: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.items;
          return { items: rest };
        }),
      has: (id) => Boolean(get().items[id]),
    }),
    { name: "asl-notify" }
  )
);
