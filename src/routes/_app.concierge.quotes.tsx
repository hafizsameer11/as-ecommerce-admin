import { createFileRoute } from "@tanstack/react-router";
import { Quotes } from "@/components/admin/Quotes";

export const Route = createFileRoute("/_app/concierge/quotes")({
  head: () => ({
    meta: [
      { title: "Quotes · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Quotes,
});
