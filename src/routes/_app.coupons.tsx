import { createFileRoute } from "@tanstack/react-router";
import { AdminCoupons } from "@/components/admin/AdminCoupons";

export const Route = createFileRoute("/_app/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCoupons,
});
