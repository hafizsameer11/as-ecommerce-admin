import { createFileRoute } from "@tanstack/react-router";
import { AdminTeam } from "@/components/admin/AdminTeam";

export const Route = createFileRoute("/_app/team")({
  head: () => ({
    meta: [
      { title: "Team & Roles · ASL Admin" },
      { name: "description", content: "Manage admin members, invitations, and role-based permissions." },
    ],
  }),
  component: AdminTeam,
});
