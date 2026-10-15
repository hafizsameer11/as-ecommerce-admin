import { createFileRoute } from "@tanstack/react-router";
import { AdminReferrals } from "@/components/admin/AdminReferrals";

export const Route = createFileRoute("/_app/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminReferrals,
});
