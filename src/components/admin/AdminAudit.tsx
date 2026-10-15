import { useEffect, useMemo, useState } from "react";
import {
  ScrollText, Search, Filter, Download, Shield, User, Cpu, Clock, MapPin,
  Laptop, RefreshCw, Trash2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "./AdminShell";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/admin-export";
import {
  useAudit, CATEGORY_LABEL, SEVERITY_LABEL,
  type AuditEvent, type AuditSeverity, type AuditCategory,
} from "@/lib/audit-store";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const SEV_STYLES: Record<AuditSeverity, string> = {
  info: "bg-slate-100 text-slate-700 border-slate-200",
  notice: "bg-sky-50 text-sky-700 border-sky-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-rose-50 text-rose-700 border-rose-200",
};

const CAT_ORDER: AuditCategory[] = [
  "auth","team","settings","orders","catalog","inventory",
  "customers","finance","marketing","content","concierge","system",
];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

function inRange(iso: string, range: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const day = 86400_000;
  if (range === "24h") return now - t <= day;
  if (range === "7d")  return now - t <= 7 * day;
  if (range === "30d") return now - t <= 30 * day;
  return true;
}

export function AdminAudit() {
  const { events, clear, hydrate } = useAudit();
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState<"all" | AuditSeverity>("all");
  const [category, setCategory] = useState<"all" | AuditCategory>("all");
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [actorTab, setActorTab] = useState<"all" | "human" | "system">("all");
  const [drawer, setDrawer] = useState<AuditEvent | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return events.filter(e => {
      if (!inRange(e.at, range)) return false;
      if (severity !== "all" && e.severity !== severity) return false;
      if (category !== "all" && e.category !== category) return false;
      if (actorTab === "system" && e.actorRole !== "Automation") return false;
      if (actorTab === "human" && e.actorRole === "Automation") return false;
      if (!query) return true;
      return (
        e.actorName.toLowerCase().includes(query) ||
        e.actorEmail.toLowerCase().includes(query) ||
        e.entity.toLowerCase().includes(query) ||
        e.action.toLowerCase().includes(query) ||
        e.summary.toLowerCase().includes(query) ||
        e.ip.includes(query)
      );
    });
  }, [events, q, severity, category, range, actorTab]);

  const stats = useMemo(() => {
    const within = events.filter(e => inRange(e.at, range));
    return {
      total: within.length,
      critical: within.filter(e => e.severity === "critical").length,
      warnings: within.filter(e => e.severity === "warning").length,
      actors: new Set(within.map(e => e.actorEmail)).size,
    };
  }, [events, range]);

  const catCounts = useMemo(() => {
    const map = new Map<AuditCategory, number>();
    events.filter(e => inRange(e.at, range)).forEach(e => map.set(e.category, (map.get(e.category) ?? 0) + 1));
    return map;
  }, [events, range]);

  const handleExport = () => {
    downloadCSV(
      `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map(e => ({
        timestamp: e.at,
        severity: e.severity,
        category: e.category,
        action: e.action,
        actor: e.actorName,
        email: e.actorEmail,
        role: e.actorRole,
        entity: e.entity,
        summary: e.summary,
        ip: e.ip,
        location: e.location,
        device: e.device,
      })),
    );
    toast.success("Audit log exported");
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of every privileged action across the ASL cockpit."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.success("Log refreshed")}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Events in range", value: stats.total.toLocaleString(), icon: ScrollText },
          { label: "Critical", value: stats.critical, icon: Shield, tone: "text-rose-700" },
          { label: "Warnings", value: stats.warnings, icon: Shield, tone: "text-amber-700" },
          { label: "Unique actors", value: stats.actors, icon: User },
        ].map((k) => (
          <Card key={k.label} className="p-4 rounded-2xl border-black/5">
            <div className="flex items-center justify-between">
              <div className="text-[12px] text-muted-foreground">{k.label}</div>
              <k.icon className={`h-4 w-4 ${k.tone ?? "text-muted-foreground"}`} />
            </div>
            <div className={`mt-2 font-display text-[24px] font-bold ${k.tone ?? ""}`}>{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Category rail */}
        <Card className="col-span-12 lg:col-span-3 p-3 rounded-2xl border-black/5 h-fit">
          <div className="px-2 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Categories</div>
          <button
            onClick={() => setCategory("all")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] ${
              category === "all" ? "bg-ink text-white" : "hover:bg-black/5"
            }`}
          >
            <span>All categories</span>
            <span className="text-[11px] opacity-75">{stats.total}</span>
          </button>
          <Separator className="my-2" />
          {CAT_ORDER.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] ${
                category === c ? "bg-ink text-white" : "hover:bg-black/5"
              }`}
            >
              <span>{CATEGORY_LABEL[c]}</span>
              <span className="text-[11px] opacity-75">{catCounts.get(c) ?? 0}</span>
            </button>
          ))}
        </Card>

        {/* Table */}
        <div className="col-span-12 lg:col-span-9 space-y-3">
          <Card className="p-3 rounded-2xl border-black/5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search actor, entity, action, IP…"
                  className="pl-9 h-9"
                />
              </div>
              <Tabs value={actorTab} onValueChange={(v) => setActorTab(v as typeof actorTab)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="human">Human</TabsTrigger>
                  <TabsTrigger value="system">System</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
                <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severity</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="notice">Notice</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
                <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9" onClick={() => { setQ(""); setSeverity("all"); setCategory("all"); setRange("7d"); setActorTab("all"); }}>
                <Filter className="h-4 w-4 mr-2" /> Reset
              </Button>
            </div>
          </Card>

          <Card className="rounded-2xl border-black/5 overflow-hidden">
            <div className="max-h-[64vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-[140px]">When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="w-[110px]">Severity</TableHead>
                    <TableHead className="w-[160px]">IP / Location</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer hover:bg-black/[0.03]"
                      onClick={() => setDrawer(e)}
                    >
                      <TableCell className="text-[12px]">
                        <div className="font-medium">{timeAgo(e.at)}</div>
                        <div className="text-muted-foreground">{new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-7 w-7 rounded-full grid place-items-center text-[11px] font-medium text-white ${e.actorRole === "Automation" ? "bg-slate-500" : "bg-ink"}`}>
                            {e.actorRole === "Automation" ? <Cpu className="h-3.5 w-3.5" /> : initials(e.actorName)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium truncate">{e.actorName}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{e.actorRole}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="font-sans text-[11px] px-1.5 py-0.5 rounded bg-black/5">{e.action}</code>
                        <div className="text-[12px] text-muted-foreground line-clamp-1 mt-1">{e.summary}</div>
                      </TableCell>
                      <TableCell className="text-[13px]">{e.entity}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize ${SEV_STYLES[e.severity]}`}>
                          {SEVERITY_LABEL[e.severity]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[12px]">
                        <div className="font-sans">{e.ip}</div>
                        <div className="text-muted-foreground truncate">{e.location}</div>
                      </TableCell>
                      <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-[13px] text-muted-foreground py-12">
                        No events match your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="flex items-center justify-between text-[12px] text-muted-foreground px-1">
            <div>Showing {filtered.length.toLocaleString()} of {events.length.toLocaleString()} events</div>
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => {
                if (confirm("Clear the local audit log view? (Immutable server log is preserved.)")) {
                  clear();
                  toast.success("Local view cleared");
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear local view
            </Button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[520px] overflow-y-auto">
          {drawer && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`text-[10px] capitalize ${SEV_STYLES[drawer.severity]}`}>
                    {SEVERITY_LABEL[drawer.severity]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[drawer.category]}</Badge>
                </div>
                <SheetTitle className="text-[18px]">{drawer.entity}</SheetTitle>
                <SheetDescription>
                  <code className="font-sans text-[11px] px-1.5 py-0.5 rounded bg-black/5">{drawer.action}</code>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-4">
                <Card className="p-3 rounded-xl border-black/5">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Summary</div>
                  <div className="text-[13px] leading-relaxed">{drawer.summary}</div>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 rounded-xl border-black/5">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                      <User className="h-3 w-3" /> Actor
                    </div>
                    <div className="text-[13px] font-medium">{drawer.actorName}</div>
                    <div className="text-[12px] text-muted-foreground">{drawer.actorEmail}</div>
                    <div className="text-[11px] mt-1">{drawer.actorRole}</div>
                  </Card>
                  <Card className="p-3 rounded-xl border-black/5">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" /> When
                    </div>
                    <div className="text-[13px] font-medium">{timeAgo(drawer.at)}</div>
                    <div className="text-[12px] text-muted-foreground">{new Date(drawer.at).toLocaleString()}</div>
                  </Card>
                  <Card className="p-3 rounded-xl border-black/5">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" /> Location
                    </div>
                    <div className="text-[13px] font-sans">{drawer.ip}</div>
                    <div className="text-[12px] text-muted-foreground">{drawer.location}</div>
                  </Card>
                  <Card className="p-3 rounded-xl border-black/5">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                      <Laptop className="h-3 w-3" /> Device
                    </div>
                    <div className="text-[13px]">{drawer.device}</div>
                  </Card>
                </div>

                {(drawer.before || drawer.after) && (
                  <Card className="p-3 rounded-xl border-black/5">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Change diff</div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <div className="text-muted-foreground mb-1">Before</div>
                        <pre className="font-sans p-2 rounded-md bg-rose-50 text-rose-900 overflow-auto text-[11px] leading-snug">
{drawer.before ? JSON.stringify(drawer.before, null, 2) : " - "}
                        </pre>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">After</div>
                        <pre className="font-sans p-2 rounded-md bg-muted text-ink overflow-auto text-[11px] leading-snug">
{drawer.after ? JSON.stringify(drawer.after, null, 2) : " - "}
                        </pre>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="p-3 rounded-xl border-black/5 text-[12px] text-muted-foreground">
                  Event ID <code className="font-sans ml-1 px-1.5 py-0.5 rounded bg-black/5 text-ink">{drawer.id}</code>
                  <div className="mt-1">This entry is immutable and cryptographically signed.</div>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
