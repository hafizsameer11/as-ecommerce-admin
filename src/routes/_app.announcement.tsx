import { createFileRoute } from "@tanstack/react-router";
import { AdminAnnouncement } from "@/components/admin/AdminAnnouncement";

export const Route = createFileRoute("/_app/announcement")({
  head: () => ({
    meta: [
      { title: "Announcement Bar · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAnnouncement,
});
