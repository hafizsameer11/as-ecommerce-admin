import { createFileRoute } from "@tanstack/react-router";
import { AdminSeo } from "@/components/admin/AdminSeo";

export const Route = createFileRoute("/_app/seo")({
  head: () => ({
    meta: [
      { title: "SEO · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminSeo,
});
