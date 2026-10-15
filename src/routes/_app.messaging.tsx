import { createFileRoute } from "@tanstack/react-router";
import { AdminMessaging } from "@/components/admin/AdminMessaging";

export const Route = createFileRoute("/_app/messaging")({
  head: () => ({
    meta: [
      { title: "Push & Email · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminMessaging,
});
