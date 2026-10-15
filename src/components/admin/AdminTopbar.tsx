import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, HelpCircle, Search, LogOut } from "lucide-react";
import { ADMIN_ROLES, useAdmin } from "@/lib/admin-role-store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActivity } from "@/lib/admin-activity-store";

type Props = { onOpenPalette: () => void };

export function AdminTopbar({ onOpenPalette }: Props) {
  const nav = useNavigate();
  const { name, email, role, signOut } = useAdmin();
  const hydrateActivity = useActivity((s) => s.hydrate);
  const unread = useActivity((s) => s.entries.length);
  const roleMeta = ADMIN_ROLES.find((r) => r.id === role) ?? ADMIN_ROLES[0];

  useEffect(() => {
    void hydrateActivity();
  }, [hydrateActivity]);

  return (
    <header className="h-14 border-b border-border bg-white sticky top-0 z-30 flex items-center px-4 gap-3">
      <button
        onClick={onOpenPalette}
        className="flex-1 max-w-xl h-9 flex items-center gap-2 rounded-md border border-border bg-[#faf8f3] hover:bg-white transition-colors px-3 text-[12.5px] text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span>Search orders, customers, products…</span>
        <span className="ml-auto flex items-center gap-1">
          <kbd className="px-1.5 h-5 rounded border border-border bg-white text-[10px] font-sans grid place-items-center">⌘</kbd>
          <kbd className="px-1.5 h-5 rounded border border-border bg-white text-[10px] font-sans grid place-items-center">K</kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => nav({ to: "/activity" })}
          className="relative h-9 w-9 grid place-items-center rounded-md hover:bg-black/5"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-sale text-white text-[9px] font-bold grid place-items-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>

        <button className="h-9 w-9 grid place-items-center rounded-md hover:bg-black/5" aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </button>

        <div className="h-9 px-2.5 flex items-center gap-2 text-[12px]" title="Your role">
          <span className="h-6 w-6 rounded-full bg-gold/15 text-gold grid place-items-center text-[10px] font-bold">
            {roleMeta.short}
          </span>
          <span className="font-semibold hidden sm:inline">{roleMeta.label}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 pl-1.5 pr-2.5 flex items-center gap-2 rounded-md hover:bg-black/5 text-[12px]">
              <span className="h-7 w-7 rounded-full bg-ink text-white grid place-items-center text-[11px] font-bold">
                {(name || "A")[0]}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-[13px] font-semibold">{name}</div>
              <div className="text-[11px] font-normal text-muted-foreground truncate">{email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => nav({ to: "/settings" })}>
              Store settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open("/", "_blank")}>
              View storefront
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                signOut();
                nav({ to: "/login" });
              }}
              className="text-rose-600"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
