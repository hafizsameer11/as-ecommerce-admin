import { createFileRoute } from "@tanstack/react-router";
import { AdminFaqs } from "@/components/admin/AdminFaqs";

export const Route = createFileRoute("/_app/faqs")({
  head: () => ({
    meta: [
      { title: "FAQs · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminFaqs,
});
