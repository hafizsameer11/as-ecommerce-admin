import { apiRequest } from "./client";

export type ApiProductCard = {
  id: string;
  productId?: string;
  brand: string;
  brandHandle?: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  discountPct?: number | null;
  priceOnRequest?: boolean;
  image: string | null;
  category: string;
  categoryName?: string;
  subcategory?: string | null;
  subcategoryHandle?: string | null;
  sizes: string[];
  sizeAvailability?: Record<string, boolean>;
  colors: { name: string; hex: string }[];
  availability: string;
  isConcierge?: boolean;
  outOfStock?: boolean;
  rating?: { average: number; count: number };
  drop?: { id: string; releaseAt: string } | null;
};

export type ApiProductDetail = ApiProductCard & {
  description?: string | null;
  features?: string[];
  styleCode?: string | null;
  gallery?: { url: string; alt?: string | null; color?: string | null }[];
  sizeLabels?: Record<string, string>;
  modelFit?: string | null;
};

export type HomePayload = {
  hero?: Array<{
    id: string;
    eyebrow?: string;
    headline?: string;
    subhead?: string;
    cta?: string;
    linkTo?: string;
    imageUrl?: string;
    imageColor?: string;
  }>;
  categories?: Array<{ id?: string; handle?: string; name: string; image?: string | null }>;
  bestSellers?: ApiProductCard[];
  trending?: ApiProductCard[];
  newArrivals?: ApiProductCard[];
};

export type ProductListQuery = {
  q?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  size?: string;
  color?: string;
  availability?: string;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  concierge?: boolean;
  inStock?: boolean;
  collection?: string;
  ids?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

function qs(params: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const catalogApi = {
  home: () => apiRequest<HomePayload>("/store/home"),

  listProducts: (query: ProductListQuery = {}) =>
    apiRequest<ApiProductCard[]>(`/store/products${qs(query as Record<string, string | number | boolean | undefined>)}`),

  getProduct: (id: string) => apiRequest<ApiProductDetail>(`/store/products/${encodeURIComponent(id)}`),

  search: (q: string, limit = 48) =>
    apiRequest<{ query: string; total: number; products: ApiProductCard[] }>(
      `/store/search${qs({ q, limit })}`
    ),

  categories: () =>
    apiRequest<Array<{ id: string; handle: string; name: string; image?: string | null; itemCount?: number }>>(
      "/store/categories"
    ),

  brands: () =>
    apiRequest<Array<{ id: string; handle: string; name: string; itemCount?: number; image?: string | null }>>(
      "/store/brands"
    ),
};
