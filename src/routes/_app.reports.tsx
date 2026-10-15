import { createFileRoute } from "@tanstack/react-router";
import { AdminReports } from "@/components/admin/AdminReports";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { title: "Reports · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminReports,
});
