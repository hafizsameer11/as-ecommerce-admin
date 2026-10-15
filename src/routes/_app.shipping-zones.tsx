import { createFileRoute } from "@tanstack/react-router";
import { AdminShippingZones } from "@/components/admin/AdminShippingZones";

export const Route = createFileRoute("/_app/shipping-zones")({
  head: () => ({
    meta: [
      { title: "Shipping Zones · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminShippingZones,
});
