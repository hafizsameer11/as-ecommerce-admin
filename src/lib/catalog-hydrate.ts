import { catalogApi } from "@/lib/api/catalog";
import { mapApiProduct, rememberApiMeta } from "@/lib/api/product-mapper";
import {
  shopProducts,
  bestSellerProducts,
  trendingProducts,
} from "@/lib/shop-data";
import { bestSellers, newArrivals, heroSlides, categories as mockCategories } from "@/lib/mock-data";
import { useCatalogVersion } from "@/lib/catalog-version";

let hydrated = false;
let inflight: Promise<void> | null = null;

function replaceArray<T>(target: T[], next: T[]) {
  target.splice(0, target.length, ...next);
}

/**
 * Load seeded catalogue from the API into the existing in-memory arrays
 * that the UI already reads (no JSX changes).
 */
export async function hydrateShopCatalogFromApi() {
  if (hydrated) return;
  if (inflight) return inflight;

  inflight = (async () => {
    const [home, products] = await Promise.all([
      catalogApi.home(),
      catalogApi.listProducts({ pageSize: 100, sort: "featured" }),
    ]);

    const mappedAll = products.map((p) => {
      rememberApiMeta(p);
      return mapApiProduct(p);
    });

    const byId = new Map(mappedAll.map((p) => [p.id, p]));

    const mapList = (list?: typeof products) =>
      (list ?? [])
        .map((p) => {
          rememberApiMeta(p);
          const mapped = mapApiProduct(p);
          byId.set(mapped.id, mapped);
          return mapped;
        });

    const bs = mapList(home.bestSellers);
    const tr = mapList(home.trending);
    const na = mapList(home.newArrivals);

    // Ensure home lists are represented in the main corpus
    for (const p of [...bs, ...tr, ...na]) {
      if (!byId.has(p.id)) byId.set(p.id, p);
    }

    replaceArray(shopProducts, [...byId.values()]);
    replaceArray(bestSellerProducts, bs.length ? bs : mappedAll.slice(0, 8));
    replaceArray(trendingProducts, tr.length ? tr : mappedAll.slice(0, 8));

    // Home teaser arrays (mock-data) — same shape { id, brand, name, price, image }
    const toTeaser = (p: (typeof mappedAll)[number]) => ({
      id: p.id,
      brand: p.brand,
      name: p.name,
      price: p.price,
      image: p.image,
    });
    replaceArray(bestSellers as any[], (bs.length ? bs : mappedAll.slice(0, 8)).map(toTeaser));
    replaceArray(newArrivals as any[], (na.length ? na : mappedAll.slice(0, 8)).map(toTeaser));

    if (home.hero?.length) {
      replaceArray(
        heroSlides as any[],
        home.hero.map((h, i) => ({
          id: i + 1,
          tag: h.eyebrow ?? "NEW",
          title: h.headline ?? "",
          copy: h.subhead ?? "",
          image: h.imageUrl ?? "",
        }))
      );
    }

    if (home.categories?.length) {
      replaceArray(
        mockCategories as any[],
        home.categories.map((c) => ({
          id: c.handle ?? c.id ?? c.name.toLowerCase(),
          name: c.name,
          image: c.image ?? "",
        }))
      );
    }

    hydrated = true;
    useCatalogVersion.getState().bump();
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export function isCatalogHydrated() {
  return hydrated;
}
