import { createFileRoute } from "@tanstack/react-router";
import { AdminClub } from "@/components/admin/AdminClub";

export const Route = createFileRoute("/_app/club")({
  head: () => ({
    meta: [
      { title: "ASL Club · Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminClub,
});
