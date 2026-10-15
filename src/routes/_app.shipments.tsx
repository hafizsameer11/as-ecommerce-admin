import { createFileRoute } from "@tanstack/react-router";
import { AdminShipments } from "@/components/admin/AdminShipments";

export const Route = createFileRoute("/_app/shipments")({
  head: () => ({
    meta: [
      { title: "Shipments · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminShipments,
});
