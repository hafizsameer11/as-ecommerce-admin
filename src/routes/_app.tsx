import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/lib/admin-role-store";

export const Route = createFileRoute("/_app")({
  head: () => ({
    meta: [
      { title: "ASL Admin - Operational Cockpit" },
      { name: "description", content: "ASL ORIGINALS admin portal for orders, concierge, catalog and operations." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!useAdmin.getState().isSignedIn) {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}