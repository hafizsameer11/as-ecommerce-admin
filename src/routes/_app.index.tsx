import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/admin/Dashboard";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});
