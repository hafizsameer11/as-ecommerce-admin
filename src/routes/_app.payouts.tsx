import { createFileRoute } from "@tanstack/react-router";
import { AdminPayouts } from "@/components/admin/AdminPayouts";

export const Route = createFileRoute("/_app/payouts")({
  head: () => ({
    meta: [
      { title: "Payouts · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPayouts,
});
