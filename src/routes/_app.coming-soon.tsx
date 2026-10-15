import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AdminDrops } from "@/components/admin/AdminDrops";
import { AdminReservations } from "@/components/admin/AdminReservations";

export const Route = createFileRoute("/_app/coming-soon")({
  head: () => ({
    meta: [
      { title: "Drops & Reservations · ASL Admin" },
      { name: "description", content: "Manage drops, release allocation, and deposit reservations." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ComingSoonPage,
});

function ComingSoonPage() {
  const [tab, setTab] = useState<"drops" | "reservations">("drops");

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-2 text-xs text-ink/50 mb-2">
          <Link to="/" className="hover:text-ink">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span>Catalog</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-ink">Drops & Reservations</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Drops & Reservations</h1>
        <p className="text-sm text-ink/60 mt-1">
          Schedule drops, control allocation and deposit %, then manage reservation holds.
        </p>
        <div className="mt-4 flex items-center gap-1 rounded-lg border border-black/10 p-1 bg-white w-fit">
          {(
            [
              { id: "drops" as const, label: "Drops" },
              { id: "reservations" as const, label: "Reservations" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`h-8 px-4 rounded-md text-[12px] font-medium ${
                tab === t.id ? "bg-ink text-white" : "text-ink/70 hover:bg-black/[0.04]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {tab === "drops" ? <AdminDrops embedded /> : <AdminReservations embedded />}
    </div>
  );
}
