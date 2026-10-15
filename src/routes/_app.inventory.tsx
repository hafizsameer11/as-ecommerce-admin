import { createFileRoute } from "@tanstack/react-router";
import AdminInventory from "@/components/admin/AdminInventory";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory · ASL Admin" },
      { name: "description", content: "Stock levels, warehouses, adjustments and transfers across the ASL catalog." },
      { property: "og:title", content: "Inventory · ASL Admin" },
      { property: "og:description", content: "Stock levels, warehouses, adjustments and transfers across the ASL catalog." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminInventory,
});
