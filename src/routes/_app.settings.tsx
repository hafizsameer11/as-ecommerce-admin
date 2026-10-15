import { createFileRoute } from "@tanstack/react-router";
import { AdminSettings } from "@/components/admin/AdminSettings";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Store Settings · ASL Admin" },
      { name: "description", content: "Configure store profile, branding, checkout, payments, currencies and legal policies." },
    ],
  }),
  component: AdminSettings,
});
