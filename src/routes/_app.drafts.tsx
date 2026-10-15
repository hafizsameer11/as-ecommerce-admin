import { createFileRoute } from "@tanstack/react-router";
import { DraftOrders } from "@/components/admin/DraftOrders";

export const Route = createFileRoute("/_app/drafts")({
  head: () => ({ meta: [{ title: "Draft Orders · ASL Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: DraftOrders,
});
