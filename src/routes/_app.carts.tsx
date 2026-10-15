import { createFileRoute } from "@tanstack/react-router";
import { AbandonedCarts } from "@/components/admin/AbandonedCarts";

export const Route = createFileRoute("/_app/carts")({
  head: () => ({ meta: [{ title: "Abandoned Carts · ASL Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AbandonedCarts,
});
