import { createFileRoute } from "@tanstack/react-router";
import { AdminAnalyticsTraffic } from "@/components/admin/AdminAnalyticsTraffic";

export const Route = createFileRoute("/_app/analytics/traffic")({
  head: () => ({
    meta: [
      { title: "Traffic analytics · ASL Admin" },
      { name: "description", content: "Sessions, sources, devices and conversion funnels across ASL ORIGINALS." },
    ],
  }),
  component: AdminAnalyticsTraffic,
});
