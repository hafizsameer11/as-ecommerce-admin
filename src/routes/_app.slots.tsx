import { createFileRoute } from "@tanstack/react-router";
import { AdminSlots } from "@/components/admin/AdminSlots";

export const Route = createFileRoute("/_app/slots")({
  head: () => ({
    meta: [
      { title: "Homepage Slots · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminSlots,
});
