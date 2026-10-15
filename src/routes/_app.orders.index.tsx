import { createFileRoute } from "@tanstack/react-router";
import { OrdersTable } from "@/components/admin/OrdersTable";

export const Route = createFileRoute("/_app/orders/")({
  head: () => ({ meta: [{ title: "Orders · ASL Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: OrdersTable,
});
