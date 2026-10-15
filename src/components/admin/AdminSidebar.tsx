import { Link, useRouterState } from "@tanstack/react-router";
import { useAdmin } from "@/lib/admin-role-store";
import { filterNavForRole } from "./nav-config";
import { ChevronLeft } from "lucide-react";

export function AdminSidebar() {
  const role = useAdmin((s) => s.role);
  const collapsed = useAdmin((s) => s.sidebarCollapsed);
  const toggle = useAdmin((s) => s.toggleSidebar);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const groups = filterNavForRole(role);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <aside
      className={`shrink-0 border-r border-white/10 bg-black h-screen sticky top-0 flex flex-col transition-[width] duration-200 ${
        collapsed ? "w-[64px]" : "w-[248px]"
      }`}
    >
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
        <Link to="/" className="flex items-center gap-2">
          <div className="font-display font-bold text-[13px] tracking-[0.18em] text-gold whitespace-nowrap">ASL ORIGINALS</div>
          {!collapsed && (
            <div className="text-[9px] tracking-[0.3em] text-white/50 -mt-0.5">ADMIN</div>
          )}
        </Link>
        <button
          onClick={toggle}
          className="h-6 w-6 grid place-items-center rounded hover:bg-white/10 text-white/60 transition-colors"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar py-2 px-2">
        {groups.map((g) => (
          <div key={g.id} className="mb-3">
            {!collapsed && (
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
                {g.label}
              </div>
            )}
            <div className="space-y-0.5">
              {g.items.map((n) => {
                const active = isActive(n.to);
                return (
                  <Link
                    key={n.id}
                    to={n.to}
                    title={collapsed ? n.label : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                      active
                        ? "bg-white text-black font-semibold"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <n.icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                    {!collapsed && <span className="flex-1 truncate">{n.label}</span>}
                    {!collapsed && n.badge != null && (
                      <span
                        className={`text-[10px] font-bold px-1.5 h-4 grid place-items-center rounded-full ${
                          active ? "bg-black/10 text-black" : "bg-gold/20 text-gold"
                        }`}
                      >
                        {n.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/10 p-3 text-[10px] text-white/40">
          v1.0 · prototype
        </div>
      )}
    </aside>
  );
}
