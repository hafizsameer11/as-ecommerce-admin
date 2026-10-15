import { ReactNode, useEffect, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { CommandPalette } from "./CommandPalette";

export function AdminShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen w-full flex bg-[#f7f5ef] text-ink">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopbar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="flex-1 min-w-0">{mounted ? children : null}</main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}


export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display font-bold text-[28px] leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
