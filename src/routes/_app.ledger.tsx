import { createFileRoute } from "@tanstack/react-router";
import { AdminLedger } from "@/components/admin/AdminLedger";

export const Route = createFileRoute("/_app/ledger")({
  head: () => ({
    meta: [
      { title: "Ledger · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLedger,
});
