import { createFileRoute } from "@tanstack/react-router";
import { AdminAnalyticsSales } from "@/components/admin/AdminAnalyticsSales";

export const Route = createFileRoute("/_app/analytics/sales")({
  head: () => ({
    meta: [
      { title: "Sales analytics · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAnalyticsSales,
});
