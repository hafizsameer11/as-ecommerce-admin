import { createFileRoute } from "@tanstack/react-router";
import { AdminPickups } from "@/components/admin/AdminPickups";

export const Route = createFileRoute("/_app/pickups")({
  head: () => ({
    meta: [
      { title: "Pickups · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPickups,
});
