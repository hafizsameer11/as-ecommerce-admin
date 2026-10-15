import { createFileRoute } from "@tanstack/react-router";
import AdminReviews from "@/components/admin/AdminReviews";

export const Route = createFileRoute("/_app/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews · ASL Admin" },
      { name: "description", content: "Moderate customer reviews, respond to feedback and monitor flagged content." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminReviews,
});
