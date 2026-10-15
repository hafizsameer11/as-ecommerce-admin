import { createFileRoute } from "@tanstack/react-router";
import AdminMedia from "@/components/admin/AdminMedia";

export const Route = createFileRoute("/_app/media")({
  head: () => ({
    meta: [
      { title: "Media Library · ASL Admin" },
      { name: "description", content: "Central library for product photography, campaign assets, brand marks and documents." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminMedia,
});
