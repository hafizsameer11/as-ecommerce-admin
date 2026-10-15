import { createFileRoute } from "@tanstack/react-router";
import { AdminBrands } from "@/components/admin/AdminBrands";

export const Route = createFileRoute("/_app/brands")({
  head: () => ({
    meta: [
      { title: "Brands · ASL Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminBrands,
});
