import { createFileRoute } from "@tanstack/react-router";
import { AdminPages } from "@/components/admin/AdminPages";

export const Route = createFileRoute("/_app/pages")({
  head: () => ({
    meta: [
      { title: "Pages · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPages,
});
