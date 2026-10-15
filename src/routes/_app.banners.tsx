import { createFileRoute } from "@tanstack/react-router";
import { AdminBanners } from "@/components/admin/AdminBanners";

export const Route = createFileRoute("/_app/banners")({
  head: () => ({
    meta: [
      { title: "Banners · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBanners,
});
