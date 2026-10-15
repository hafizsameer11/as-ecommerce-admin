import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useAdmin } from "@/lib/admin-role-store";
import { filterNavForAccess } from "./nav-config";
import { searchAdminApi } from "@/lib/api/platform";

type SearchHit = { id: string; title: string; subtitle: string; link: string; amount?: number; status?: string };
type SearchGroup = { key: string; label: string; items: SearchHit[] };

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function CommandPalette({ open, onOpenChange }: Props) {
  const nav = useNavigate();
  const role = useAdmin((s) => s.role);
  const permissions = useAdmin((s) => s.permissions);
  const groups = filterNavForAccess(role, permissions);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchGroup[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setHits([]);
      setSearching(false);
      return;
    }
    const query = q.trim();
    if (!query) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(() => {
      void searchAdminApi
        .global(query)
        .then((res) => {
          const data = res as { groups?: SearchGroup[] };
          setHits(Array.isArray(data.groups) ? data.groups.filter((g) => g.items?.length) : []);
        })
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 200);
    return () => window.clearTimeout(t);
  }, [q, open]);

  const go = (to: string) => {
    onOpenChange(false);
    nav({ to });
  };

  const hasQuery = q.trim().length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search or jump to…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        <CommandEmpty>{searching ? "Searching…" : "No results."}</CommandEmpty>

        {!hasQuery && (
          <>
            <CommandGroup heading="Quick actions">
              <CommandItem onSelect={() => go("/orders")}>Go to Orders</CommandItem>
              <CommandItem onSelect={() => go("/concierge/inbox")}>Concierge Inbox</CommandItem>
              <CommandItem onSelect={() => go("/products")}>Products</CommandItem>
              <CommandItem onSelect={() => go("/activity")}>Live Activity</CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {groups.map((g) => (
              <CommandGroup key={g.id} heading={g.label}>
                {g.items.map((n) => (
                  <CommandItem key={n.id} onSelect={() => go(n.to)}>
                    <n.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                    {n.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </>
        )}

        {hasQuery && hits.map((g) => (
          <CommandGroup key={g.key} heading={g.label}>
            {g.items.map((item) => (
              <CommandItem key={`${g.key}-${item.id}`} onSelect={() => go(item.link)}>
                <span className="flex-1 truncate">{item.title}</span>
                {item.subtitle && (
                  <span className="text-muted-foreground text-[11px] ml-2 truncate max-w-[40%]">
                    {item.subtitle}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
