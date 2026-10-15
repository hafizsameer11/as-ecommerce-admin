import { createFileRoute } from "@tanstack/react-router";
import { AdminCustomers } from "@/components/admin/AdminCustomers";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({
    meta: [
      { title: "Customers · ASL Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCustomers,
});
