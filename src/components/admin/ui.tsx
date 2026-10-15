import { ReactNode } from "react";

export const naira = (n: number) => `₦${n.toLocaleString()}`;

export function Card({ children, className = "", padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <div className={`bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] ${padded ? "p-5" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function Chip({
  children, tone = "neutral", className = "",
}: { children: ReactNode; tone?: "neutral" | "gold" | "green" | "red" | "blue" | "amber" | "purple" | "slate"; className?: string }) {
  const tones: Record<string, string> = {
    neutral: "bg-black/[0.04] text-ink border-black/10",
    gold: "bg-gold/15 text-gold-deep border-gold/30",
    green: "bg-ink text-white border-ink",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-violet-50 text-violet-700 border-violet-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function statusTone(status: string): Parameters<typeof Chip>[0]["tone"] {
  const s = status.toLowerCase();
  if (s.includes("deliver") || s.includes("paid") || s.includes("approve") || s === "completed" || s === "success") return "green";
  if (s.includes("cancel") || s.includes("failed") || s.includes("refund")) return "red";
  if (s.includes("ship") || s.includes("transit")) return "blue";
  if (s.includes("process") || s.includes("pending") || s.includes("review")) return "amber";
  if (s.includes("draft")) return "slate";
  if (s.includes("hold")) return "purple";
  return "neutral";
}

export function StatusPill({ status }: { status: string }) {
  return <Chip tone={statusTone(status)}>{status}</Chip>;
}

export function IconButton({
  children, onClick, title, active = false,
}: { children: ReactNode; onClick?: () => void; title?: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 w-8 grid place-items-center rounded-md border transition-colors ${
        active ? "bg-ink text-white border-ink" : "bg-white border-black/10 text-ink hover:bg-black/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 mb-4">{children}</div>;
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="font-display text-lg text-ink mb-1">{title}</div>
      {sub && <div className="text-[13px]">{sub}</div>}
    </div>
  );
}
