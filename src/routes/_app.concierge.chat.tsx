import { createFileRoute } from "@tanstack/react-router";
import { ConciergeChat } from "@/components/admin/ConciergeChat";

export const Route = createFileRoute("/_app/concierge/chat")({
  head: () => ({
    meta: [
      { title: "Concierge Chat · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConciergeChat,
});
