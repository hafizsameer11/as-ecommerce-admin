import { createFileRoute } from "@tanstack/react-router";
import { AdminProducts } from "@/components/admin/AdminProducts";

export const Route = createFileRoute("/_app/products")({
  head: () => ({
    meta: [
      { title: "Products · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminProducts,
});
