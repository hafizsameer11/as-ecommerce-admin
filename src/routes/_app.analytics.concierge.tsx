import { createFileRoute } from "@tanstack/react-router";
import { AdminAnalyticsConcierge } from "@/components/admin/AdminAnalyticsConcierge";

export const Route = createFileRoute("/_app/analytics/concierge")({
  head: () => ({
    meta: [
      { title: "Concierge analytics · ASL Admin" },
      { name: "description", content: "Concierge request volume, SLA, conversion, agent and supplier performance." },
    ],
  }),
  component: AdminAnalyticsConcierge,
});
