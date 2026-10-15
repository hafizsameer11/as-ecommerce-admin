import { createFileRoute } from "@tanstack/react-router";
import { Suppliers } from "@/components/admin/Suppliers";

export const Route = createFileRoute("/_app/concierge/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Suppliers,
});
