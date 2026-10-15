import { createFileRoute } from "@tanstack/react-router";
import { AdminNotificationSettings } from "@/components/admin/AdminNotificationSettings";

export const Route = createFileRoute("/_app/notification-settings")({
  head: () => ({
    meta: [
      { title: "Notifications · ASL Admin" },
      { name: "description", content: "Route the right event to the right person on the right channel - events, channels, quiet hours and digests." },
    ],
  }),
  component: AdminNotificationSettings,
});
