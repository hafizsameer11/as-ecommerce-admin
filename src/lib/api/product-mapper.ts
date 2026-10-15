import type { Product } from "@/lib/shop-data";
import { koboToNaira } from "./client";
import type { ApiProductCard, ApiProductDetail } from "./catalog";

const AVAILABILITIES = new Set(["In Stock", "Pre Order", "Limited Pieces", "Restocked"]);

function mapAvailability(raw: string): Product["availability"] {
  if (AVAILABILITIES.has(raw)) return raw as Product["availability"];
  return "In Stock";
}

/** Map API product card/detail → UI `Product` (prices in Naira). */
export function mapApiProduct(dto: ApiProductCard | ApiProductDetail): Product {
  const detail = dto as ApiProductDetail;
  const galleryUrls =
    detail.gallery?.map((g) => g.url).filter(Boolean) ??
    (dto.image ? [dto.image] : []);

  return {
    id: dto.id,
    brand: dto.brand,
    name: dto.name,
    price: dto.priceOnRequest ? 0 : koboToNaira(dto.price),
    image: dto.image || "/favicon.png",
    category: dto.category,
    subcategory: dto.subcategory ?? undefined,
    sizes: dto.sizes?.length ? dto.sizes : ["One Size"],
    colors: dto.colors?.length ? dto.colors : [{ name: "Default", hex: "#0a0a0a" }],
    availability: mapAvailability(dto.availability),
    isConcierge: dto.isConcierge,
    originalPrice: dto.originalPrice != null ? koboToNaira(dto.originalPrice) : undefined,
    description: detail.description ?? undefined,
    features: detail.features?.length ? detail.features : undefined,
    styleCode: detail.styleCode ?? undefined,
    gallery: galleryUrls.length ? galleryUrls : undefined,
    sizeLabels: detail.sizeLabels && Object.keys(detail.sizeLabels).length ? detail.sizeLabels : undefined,
    modelFit: detail.modelFit ?? undefined,
  };
}

/** Attach sizeAvailability / outOfStock on a WeakMap for helpers without changing Product type. */
const sizeAvail = new Map<string, Record<string, boolean>>();
const outOfStockIds = new Set<string>();
const ratingById = new Map<string, { rating: number; reviews: number }>();

export function rememberApiMeta(dto: ApiProductCard | ApiProductDetail) {
  if (dto.sizeAvailability) sizeAvail.set(dto.id, dto.sizeAvailability);
  if (dto.outOfStock) outOfStockIds.add(dto.id);
  else outOfStockIds.delete(dto.id);
  if (dto.rating && dto.rating.count > 0) {
    ratingById.set(dto.id, { rating: dto.rating.average, reviews: dto.rating.count });
  }
}

export function getApiSizeAvailability(id: string) {
  return sizeAvail.get(id);
}

export function isApiOutOfStock(id: string) {
  return outOfStockIds.has(id);
}

export function getApiRating(id: string) {
  return ratingById.get(id);
}
