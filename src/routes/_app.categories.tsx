import { createFileRoute } from "@tanstack/react-router";
import { AdminCategories } from "@/components/admin/AdminCategories";

export const Route = createFileRoute("/_app/categories")({
  head: () => ({
    meta: [
      { title: "Categories · ASL Admin" },
      { name: "description", content: "Manage catalog taxonomy, subcategories and storefront placement." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCategories,
});
