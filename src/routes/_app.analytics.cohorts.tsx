import { createFileRoute } from "@tanstack/react-router";
import { AdminAnalyticsCohorts } from "@/components/admin/AdminAnalyticsCohorts";

export const Route = createFileRoute("/_app/analytics/cohorts")({
  head: () => ({
    meta: [
      { title: "Cohort analytics · ASL Admin" },
      { name: "description", content: "Customer retention, repeat behaviour, LTV and segment analytics." },
    ],
  }),
  component: AdminAnalyticsCohorts,
});
