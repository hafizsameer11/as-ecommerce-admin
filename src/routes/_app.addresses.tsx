import { createFileRoute } from "@tanstack/react-router";
import { AdminAddresses } from "@/components/admin/AdminAddresses";

export const Route = createFileRoute("/_app/addresses")({
  head: () => ({
    meta: [
      { title: "Addresses · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAddresses,
});
