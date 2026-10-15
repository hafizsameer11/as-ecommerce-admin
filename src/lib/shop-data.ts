import { getApiRating, getApiSizeAvailability, isApiOutOfStock } from "@/lib/api/product-mapper";

export type ColorOption = {
  name: string;
  hex: string;
};

export type Product = {
  id: string;
  brand: string;
  name: string;
  price: number;
  image: string;
  category: string;
  subcategory?: string;
  sizes: string[];
  colors: ColorOption[];
  availability: "In Stock" | "Pre Order" | "Limited Pieces" | "Restocked";
  isConcierge?: boolean;
  originalPrice?: number;
  description?: string;
  features?: string[];
  styleCode?: string;
  gallery?: string[];
  sizeLabels?: Record<string, string>;
  modelFit?: string;
};

const STANDARD_SIZE_NAMES: Record<string, string> = {
  XXS: "XXSmall",
  XS: "XSmall",
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "XLarge",
  XXL: "XXLarge",
  XXXL: "XXXLarge",
};

export const DESIGNER_CLOTHING_SIZE_LABELS: Record<string, string> = {
  XXS: "XXS (42)",
  XS: "XS (44)",
  S: "S (46)",
  M: "M (48)",
  L: "L (50)",
  XL: "XL (52)",
  XXL: "XXL (54)",
  XXXL: "XXXL (56)",
};

export function getProductSizeLabel(product: Product, size: string, customLabels?: Record<string, string>) {
  const custom = customLabels?.[size]?.trim();
  if (custom) return custom;
  const productLabel = product.sizeLabels?.[size]?.trim();
  if (productLabel) return productLabel;
  const standardName = STANDARD_SIZE_NAMES[size];
  return product.category === "clothing" && standardName ? standardName : size;
}

export function formatCartSize(size: string) {
  return STANDARD_SIZE_NAMES[size] ?? size;
}

export const formatNaira = (n: number) => "₦" + new Intl.NumberFormat("en-NG").format(n);

export function isConciergeProduct(product: Product) {
  return (
    product.isConcierge === true ||
    product.availability === "Pre Order" ||
    product.availability === "Limited Pieces"
  );
}

export function getProductRating(id: string) {
  const fromApi = getApiRating(id);
  if (fromApi) return fromApi;
  return { rating: 0, reviews: 0 };
}

export function getSizeAvailability(product: Product): Record<string, boolean> {
  const fromApi = getApiSizeAvailability(product.id);
  if (fromApi) return { ...fromApi };
  const out: Record<string, boolean> = {};
  for (const s of product.sizes) out[s] = !isApiOutOfStock(product.id);
  return out;
}

export function isOutOfStock(product: Product) {
  if (isApiOutOfStock(product.id)) return true;
  const avail = getSizeAvailability(product);
  return product.sizes.length > 0 && Object.values(avail).every((v) => v === false);
}
