import { shopProducts, type Product } from "./shop-data";

// Tokenized substring search over brand / name / category / subcategory.
export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  return shopProducts
    .map((p) => {
      const hay = `${p.brand} ${p.name} ${p.category} ${p.subcategory ?? ""}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 1;
        if (p.brand.toLowerCase().includes(t)) score += 2;
        if (p.name.toLowerCase().startsWith(t)) score += 3;
      }
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
