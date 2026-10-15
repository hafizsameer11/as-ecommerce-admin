import { createFileRoute } from "@tanstack/react-router";
import { Transactions } from "@/components/admin/Transactions";

export const Route = createFileRoute("/_app/transactions")({
  head: () => ({ meta: [{ title: "Transactions · ASL Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Transactions,
});
