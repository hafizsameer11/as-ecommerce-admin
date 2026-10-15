import { createFileRoute } from "@tanstack/react-router";
import { AdminAudit } from "@/components/admin/AdminAudit";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log · ASL Admin" },
      { name: "description", content: "Immutable record of every privileged action across the ASL admin cockpit." },
    ],
  }),
  component: AdminAudit,
});
