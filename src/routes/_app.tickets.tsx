import { createFileRoute } from "@tanstack/react-router";
import { AdminTickets } from "@/components/admin/AdminTickets";

export const Route = createFileRoute("/_app/tickets")({
  head: () => ({
    meta: [
      { title: "Support tickets · ASL Admin" },
      { name: "description", content: "Customer support tickets across email, chat and social channels." },
    ],
  }),
  component: AdminTickets,
});
