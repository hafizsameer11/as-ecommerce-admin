import { createFileRoute } from "@tanstack/react-router";
import { SourcingBoard } from "@/components/admin/SourcingBoard";

export const Route = createFileRoute("/_app/concierge/board")({
  head: () => ({
    meta: [
      { title: "Sourcing Board · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SourcingBoard,
});
