import { apiRequest, apiRequestWithMeta, koboToNaira, nairaToKobo } from "./client";

function qs(params: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type AdminProductStatus = "active" | "draft" | "archived";
export type AdminStockFilter = "in" | "low" | "out" | "preorder";

export type AdminProductDto = {
  id: string;
  productId: string;
  brand: string;
  brandHandle?: string;
  brandId: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  compareAtPrice?: number | null;
  discountPct?: number | null;
  cost?: number | null;
  priceOnRequest?: boolean;
  image: string | null;
  category: string;
  categoryName?: string;
  categoryId: string;
  subcategory?: string | null;
  subcategoryHandle?: string | null;
  subcategoryId?: string | null;
  sizes: string[];
  colors: { name: string; hex: string }[];
  availability: string;
  availabilityKey?: string;
  status: AdminProductStatus;
  featured?: boolean;
  isConcierge?: boolean;
  outOfStock?: boolean;
  rating?: { average: number; count: number };
  stock?: { onHand: number; reserved: number; available: number };
  stockState?: string;
  sizeLabels?: Record<string, string>;
  modelFit?: string | null;
  description?: string | null;
  features?: string[];
  styleCode?: string | null;
  gallery?: { url: string; alt?: string | null; color?: string | null }[];
  useDesignerSizes?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductInputBody = {
  name: string;
  handle?: string;
  brandId: string;
  categoryId: string;
  subcategoryId?: string | null;
  price: number;
  compareAtPrice?: number | null;
  cost?: number | null;
  description?: string | null;
  features?: string[];
  styleCode?: string | null;
  availability?: "in_stock" | "pre_order" | "limited" | "restocked";
  status?: AdminProductStatus;
  isConcierge?: boolean;
  priceOnRequest?: boolean;
  featured?: boolean;
  modelFit?: string | null;
  useDesignerSizes?: boolean;
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  images?: { url: string; alt?: string; color?: string }[];
  sizeLabels?: Record<string, string>;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type ProductPatchBody = Partial<ProductInputBody>;

export type BulkProductBody = {
  ids: string[];
  action: "publish" | "draft" | "archive" | "delete" | "setCategory" | "feature" | "unfeature";
  categoryId?: string;
  subcategoryId?: string | null;
};

export type AdminProductsListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: AdminProductStatus;
  brand?: string;
  category?: string;
  stock?: AdminStockFilter;
  sort?: string;
};

export type AdminProductsListMeta = {
  page?: number;
  pageSize?: number;
  total?: number;
  pageCount?: number;
  counts?: { all: number; active: number; draft: number; archived: number };
};

/** Convert UI naira fields → API kobo on write bodies. */
export function productBodyToKobo<T extends { price?: number; compareAtPrice?: number | null; cost?: number | null }>(
  body: T,
): T {
  const out = { ...body };
  if (typeof out.price === "number") out.price = nairaToKobo(out.price);
  if (typeof out.compareAtPrice === "number") out.compareAtPrice = nairaToKobo(out.compareAtPrice);
  if (typeof out.cost === "number") out.cost = nairaToKobo(out.cost);
  return out;
}

/** Map admin DTO → UI (prices in naira). */
export function mapAdminProduct(dto: AdminProductDto) {
  const price = dto.priceOnRequest ? 0 : koboToNaira(Number(dto.price) || 0);
  const original =
    dto.originalPrice != null
      ? koboToNaira(Number(dto.originalPrice))
      : dto.compareAtPrice != null
        ? koboToNaira(Number(dto.compareAtPrice))
        : undefined;
  const stockAvailable = dto.stock?.available ?? 0;
  return {
    id: dto.id,
    productId: dto.productId,
    brand: dto.brand,
    brandId: dto.brandId,
    name: dto.name,
    price,
    originalPrice: original,
    discountPct: dto.discountPct ?? null,
    cost: dto.cost != null ? koboToNaira(Number(dto.cost)) : null,
    priceOnRequest: !!dto.priceOnRequest,
    image: dto.image || "/favicon.png",
    category: dto.category,
    categoryName: dto.categoryName,
    categoryId: dto.categoryId,
    subcategory: dto.subcategory ?? null,
    subcategoryId: dto.subcategoryId ?? null,
    sizes: dto.sizes?.length ? dto.sizes : ["One Size"],
    colors: dto.colors?.length ? dto.colors : [{ name: "Default", hex: "#0a0a0a" }],
    availability: dto.availability,
    availabilityKey: dto.availabilityKey,
    status: dto.status,
    featured: !!dto.featured,
    isConcierge: !!dto.isConcierge,
    stock: stockAvailable,
    stockOnHand: dto.stock?.onHand ?? 0,
    stockReserved: dto.stock?.reserved ?? 0,
    stockState: (dto.stockState ?? "In stock") as "In stock" | "Low stock" | "Out of stock" | "Pre-order",
    rating: dto.rating?.average ?? 0,
    ratingCount: dto.rating?.count ?? 0,
    sizeLabels: dto.sizeLabels && Object.keys(dto.sizeLabels).length ? dto.sizeLabels : undefined,
    modelFit: dto.modelFit ?? undefined,
    description: dto.description ?? undefined,
    features: dto.features,
    styleCode: dto.styleCode ?? undefined,
    gallery: dto.gallery,
    useDesignerSizes: !!dto.useDesignerSizes,
    seoTitle: dto.seoTitle ?? undefined,
    seoDescription: dto.seoDescription ?? undefined,
    publishedAt: dto.publishedAt ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export type MappedAdminProduct = ReturnType<typeof mapAdminProduct>;

export const productsAdminApi = {
  list: (query: AdminProductsListQuery = {}) =>
    apiRequestWithMeta<AdminProductDto[]>(`/admin/products${qs({ pageSize: 200, ...query })}`),

  get: (id: string) =>
    apiRequest<AdminProductDto>(`/admin/products/${encodeURIComponent(id)}`),

  create: (body: ProductInputBody) =>
    apiRequest<AdminProductDto>("/admin/products", {
      method: "POST",
      body: productBodyToKobo(body),
    }),

  update: (id: string, body: ProductPatchBody) =>
    apiRequest<AdminProductDto>(`/admin/products/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: productBodyToKobo(body),
    }),

  setStatus: (id: string, status: AdminProductStatus) =>
    apiRequest<AdminProductDto>(`/admin/products/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status },
    }),

  duplicate: (id: string) =>
    apiRequest<AdminProductDto>(`/admin/products/${encodeURIComponent(id)}/duplicate`, {
      method: "POST",
    }),

  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/admin/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  bulk: (body: BulkProductBody) =>
    apiRequest<{ updated: number }>("/admin/products/bulk", { method: "POST", body }),
};

export { koboToNaira, nairaToKobo };
