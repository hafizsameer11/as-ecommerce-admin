import { getAllProducts, type Product } from "./shop-data";

export type Drop = {
  id: string;
  product: Product;
  /** ISO date the piece becomes available */
  releaseAt: string;
  /** Total pairs/pieces allocated for this drop */
  allocation: number;
  /** How many are already reserved */
  reservedCount: number;
  teaser: string;
};

/** Deposit rate required to reserve an upcoming drop. */
export const DEPOSIT_RATE = 0.5;

export const depositFor = (price: number) => Math.round(price * DEPOSIT_RATE);
export const balanceFor = (price: number) => price - depositFor(price);

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const TEASERS = [
  "A restrained silhouette in a finish we've never released before.",
  "Limited allocation, sourced directly from the atelier.",
  "First delivery of the season - expect it to move fast.",
  "Reworked proportions, premium materials, single run only.",
  "Quietly the most requested piece on our concierge desk.",
];

/** Deterministic set of upcoming drops built from the catalogue. */
export function getDrops(): Drop[] {
  const pool = getAllProducts();
  const picks: Product[] = [];
  const seen = new Set<string>();
  for (const p of pool) {
    if (seen.has(p.brand)) continue;
    seen.add(p.brand);
    picks.push(p);
    if (picks.length >= 8) break;
  }
  const base = Date.UTC(2026, 7, 1); // stable anchor so SSR and client agree
  return picks.map((product, i) => {
    const h = hash(product.id);
    const allocation = 20 + (h % 60);
    return {
      id: `drop-${product.id}`,
      product,
      releaseAt: new Date(base + (i * 6 + 4 + (h % 5)) * 86400000).toISOString(),
      allocation,
      reservedCount: Math.min(allocation - 2, 4 + (h % allocation)),
      teaser: TEASERS[h % TEASERS.length],
    };
  });
}

export function getDropById(id: string) {
  return getDrops().find((d) => d.id === id);
}

export function countdownParts(releaseAt: string, now: number) {
  const diff = Math.max(0, new Date(releaseAt).getTime() - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    released: diff === 0,
  };
}

export function formatDropDate(releaseAt: string, short = false) {
  return new Date(releaseAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: short ? "short" : "long",
    year: "numeric",
  });
}
