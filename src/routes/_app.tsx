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
    const { sessionReady, isSignedIn } = useAdmin.getState();
    if (sessionReady && !isSignedIn) {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const sessionReady = useAdmin((s) => s.sessionReady);
  const isSignedIn = useAdmin((s) => s.isSignedIn);

  if (!sessionReady) {
    return <div className="min-h-screen bg-[#f7f5ef]" aria-busy="true" />;
  }
  if (!isSignedIn) {
    return null;
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}