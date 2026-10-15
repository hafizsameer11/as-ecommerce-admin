import { createFileRoute } from "@tanstack/react-router";
import { ConciergeInbox } from "@/components/admin/ConciergeInbox";

export const Route = createFileRoute("/_app/concierge/inbox")({
  head: () => ({
    meta: [
      { title: "Concierge Inbox · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConciergeInbox,
});
