import { createFileRoute } from "@tanstack/react-router";
import { AdminCampaigns } from "@/components/admin/AdminCampaigns";

export const Route = createFileRoute("/_app/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCampaigns,
});
