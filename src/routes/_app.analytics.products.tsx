import { createFileRoute } from "@tanstack/react-router";
import { AdminAnalyticsProducts } from "@/components/admin/AdminAnalyticsProducts";

export const Route = createFileRoute("/_app/analytics/products")({
  head: () => ({
    meta: [
      { title: "Product analytics · ASL Admin" },
      { name: "description", content: "Bestsellers, conversion, margin and inventory velocity across the ASL catalog." },
    ],
  }),
  component: AdminAnalyticsProducts,
});
