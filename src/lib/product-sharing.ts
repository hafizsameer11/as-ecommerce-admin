import type { Product } from "./shop-data";

export async function shareProduct(product: Product) {
  const url = typeof window === "undefined"
    ? `https://www.asloriginals.online/product/${product.id}`
    : new URL(`/product/${product.id}`, window.location.origin).toString();
  const title = `${product.brand} ${product.name}`;
  const text = `Shop ${title} at ASL ORIGINALS.`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled" as const;
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    return "copied" as const;
  }

  return "unavailable" as const;
}