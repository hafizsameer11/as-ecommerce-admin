import { createFileRoute } from "@tanstack/react-router";
import { AdminTax } from "@/components/admin/AdminTax";

export const Route = createFileRoute("/_app/tax")({
  head: () => ({
    meta: [
      { title: "Tax · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminTax,
});
