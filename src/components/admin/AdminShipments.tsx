import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, IconButton, TableWrap, Toolbar, naira } from "./ui";
import {
  useShipments, STATUS_META,
  type Shipment, type ShipmentStatus, type Carrier,
} from "@/lib/shipments-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Truck, Search, Download, X, Filter as FilterIcon, Package, Copy, ExternalLink,
  Clock, AlertTriangle, CheckCircle2, MapPin, Printer, Plus, ArrowRight, Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

type Tab = "all" | ShipmentStatus;

const CARRIERS: Carrier[] = ["DHL", "FedEx", "UPS", "GIG", "Aramex", "Local"];

const FLOW: ShipmentStatus[] = [
  "label_created", "picked_up", "in_transit", "out_for_delivery", "delivered",
];

function fmtDate(ts?: number) {
  if (!ts) return " - ";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtDateTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function relative(ts: number) {
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  const h = Math.round(abs / 3600000);
  if (h < 24) return `${diff < 0 ? "-" : "+"}${h}h`;
  const d = Math.round(h / 24);
  return `${diff < 0 ? "-" : "+"}${d}d`;
}

export function AdminShipments() {
  const { shipments, hydrate, advance, update, remove } = useShipments();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [carrier, setCarrier] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return shipments.filter((s) => {
      if (tab !== "all" && s.status !== tab) return false;
      if (carrier !== "all" && s.carrier !== carrier) return false;
      if (!query) return true;
      return [s.id, s.orderId, s.customerName, s.tracking, s.destination, s.origin, s.carrier]
        .some((v) => v.toLowerCase().includes(query));
    });
  }, [shipments, tab, q, carrier]);

  const kpis = useMemo(() => {
    const inTransit = shipments.filter((s) => ["picked_up", "in_transit", "out_for_delivery"].includes(s.status)).length;
    const exceptions = shipments.filter((s) => s.status === "exception" || s.status === "returned").length;
    const deliveredToday = shipments.filter((s) => s.deliveredAt && Date.now() - s.deliveredAt < 86400000).length;
    const overdue = shipments.filter((s) => s.status !== "delivered" && s.status !== "returned" && s.etaAt < Date.now()).length;
    return { inTransit, exceptions, deliveredToday, overdue };
  }, [shipments]);

  const openShipment = shipments.find((s) => s.id === openId) || null;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: shipments.length },
    { id: "label_created", label: "Labels", count: shipments.filter((s) => s.status === "label_created").length },
    { id: "in_transit", label: "In transit", count: shipments.filter((s) => s.status === "in_transit").length },
    { id: "out_for_delivery", label: "Out for delivery", count: shipments.filter((s) => s.status === "out_for_delivery").length },
    { id: "delivered", label: "Delivered", count: shipments.filter((s) => s.status === "delivered").length },
    { id: "exception", label: "Exceptions", count: shipments.filter((s) => s.status === "exception").length },
    { id: "returned", label: "Returned", count: shipments.filter((s) => s.status === "returned").length },
  ];

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((s) => s.id)));
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkPrint = () => { alert(`Sending ${selected.size} labels to printer…`); setSelected(new Set()); };
  const bulkExport = () => {
    downloadCSV("shipments.csv", filtered.filter((s) => selected.size === 0 || selected.has(s.id)).map((s) => ({
      Shipment: s.id, Order: s.orderId, Customer: s.customerName, Carrier: s.carrier, Service: s.service,
      Tracking: s.tracking, Status: STATUS_META[s.status].label, Origin: s.origin, Destination: s.destination,
      Weight: s.weightKg, Items: s.itemsCount, Value: s.declaredValue, Cost: s.costNGN,
      Created: fmtDate(s.createdAt), Shipped: fmtDate(s.shippedAt), ETA: fmtDate(s.etaAt), Delivered: fmtDate(s.deliveredAt),
    })));
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Shipments"
        subtitle="Every parcel leaving or arriving - carriers, tracking, exceptions."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={bulkExport} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button onClick={() => alert("Create shipment flow - coming soon")} className="h-9 px-3 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-ink/90 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New shipment
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KPI label="In transit" value={String(kpis.inTransit)} Icon={Truck} />
        <KPI label="Out for delivery today" value={String(shipments.filter((s) => s.status === "out_for_delivery").length)} Icon={MapPin} tone="text-violet-700" />
        <KPI label="Exceptions" value={String(kpis.exceptions)} Icon={AlertTriangle} tone="text-rose-700" />
        <KPI label="Delivered · 24h" value={String(kpis.deliveredToday)} Icon={CheckCircle2} tone="text-ink" />
      </div>

      {kpis.overdue > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
          <Clock className="h-4 w-4" />
          <span><span className="font-semibold">{kpis.overdue}</span> shipments are past their ETA.</span>
          <button onClick={() => setTab("in_transit")} className="ml-auto font-semibold hover:underline">Review →</button>
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-black/[0.08] mb-4 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
            }`}>
            {t.label} <span className="ml-1 text-[11px] text-muted-foreground">{t.count}</span>
          </button>
        ))}
      </div>

      <Toolbar>
        <div className="flex-1 min-w-[220px] max-w-md h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search tracking, order, customer, destination…"
            className="flex-1 bg-transparent outline-none text-[13px]" />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>
        <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
          <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="bg-transparent outline-none pr-1">
            <option value="all">All carriers</option>
            {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="ml-auto text-[12px] text-muted-foreground">{filtered.length} of {shipments.length}</div>
      </Toolbar>

      {selected.size > 0 && (
        <div className="sticky top-14 z-20 mb-3 flex items-center gap-2 bg-ink text-white rounded-md px-3 h-11 text-[12.5px]">
          <span className="font-semibold">{selected.size} selected</span>
          <button onClick={bulkPrint} className="ml-auto h-8 px-3 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Print labels
          </button>
          <button onClick={bulkExport} className="h-8 px-3 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => setSelected(new Set())} className="h-8 w-8 grid place-items-center rounded hover:bg-white/10">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card><Empty title="No shipments match" sub="Adjust filters or search another tracking number." /></Card>
      ) : (
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-[#faf8f3] text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2.5 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-left px-3 py-2.5">Shipment</th>
                <th className="text-left px-3 py-2.5">Carrier / Service</th>
                <th className="text-left px-3 py-2.5">Route</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-left px-3 py-2.5">ETA</th>
                <th className="text-right px-3 py-2.5">Cost</th>
                <th className="text-right px-3 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const meta = STATUS_META[s.status];
                const overdue = s.status !== "delivered" && s.status !== "returned" && s.etaAt < Date.now();
                return (
                  <tr key={s.id} className="border-t border-black/[0.06] hover:bg-black/[0.02]">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => setOpenId(s.id)} className="font-semibold hover:underline">{s.id}</button>
                      <div className="text-[11.5px] text-muted-foreground flex items-center gap-1">
                        <Link to="/orders" className="hover:underline">{s.orderId}</Link>
                        <span>·</span>
                        <span>{s.customerName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{s.carrier}</div>
                      <div className="text-[11.5px] text-muted-foreground">{s.service}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <span>{s.origin}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{s.destination}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{s.itemsCount} items · {s.weightKg}kg</div>
                    </td>
                    <td className="px-3 py-3">
                      <Chip tone={meta.tone}>{meta.label}</Chip>
                    </td>
                    <td className="px-3 py-3">
                      <div className={overdue ? "text-rose-700 font-semibold" : ""}>{fmtDate(s.etaAt)}</div>
                      <div className="text-[11px] text-muted-foreground">{relative(s.etaAt)}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{naira(s.costNGN)}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => setOpenId(s.id)} className="text-[12px] font-semibold text-ink hover:underline">Open</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      {openShipment && (
        <ShipmentDrawer
          key={openShipment.id}
          shipment={openShipment}
          onClose={() => setOpenId(null)}
          onAdvance={(status, location, note) => advance(openShipment.id, status, location, note)}
          onUpdate={(patch) => update(openShipment.id, patch)}
          onDelete={() => { if (confirm("Delete this shipment?")) { remove(openShipment.id); setOpenId(null); } }}
        />
      )}
    </div>
  );
}

function KPI({ label, value, Icon, tone = "text-ink" }: { label: string; value: string; Icon: typeof Truck; tone?: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className={`font-display text-[24px] leading-tight mt-1 ${tone}`}>{value}</div>
        </div>
        <div className="h-8 w-8 rounded-md bg-black/[0.04] grid place-items-center"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      </div>
    </Card>
  );
}

function ShipmentDrawer({
  shipment, onClose, onAdvance, onUpdate, onDelete,
}: {
  shipment: Shipment;
  onClose: () => void;
  onAdvance: (status: ShipmentStatus, location: string, note?: string) => void;
  onUpdate: (patch: Partial<Shipment>) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(shipment.notes ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  const currentIdx = FLOW.indexOf(shipment.status);
  const nextStatus = currentIdx >= 0 && currentIdx < FLOW.length - 1 ? FLOW[currentIdx + 1] : null;

  const copyTracking = () => {
    navigator.clipboard.writeText(shipment.tracking);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[560px] bg-white z-50 shadow-2xl flex flex-col">
        <div className="h-14 px-5 border-b border-black/[0.08] flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Shipment</div>
            <div className="font-display font-bold text-[15px] leading-tight">{shipment.id}</div>
          </div>
          <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="rounded-lg border border-black/[0.08] p-4 bg-[#faf8f3]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{shipment.carrier} · {shipment.service}</div>
                <div className="font-sans text-[13px] font-semibold mt-0.5 flex items-center gap-2">
                  {shipment.tracking}
                  <button onClick={copyTracking} title="Copy" className="text-muted-foreground hover:text-ink">
                    <Copy className="h-3 w-3" />
                  </button>
                  {savedFlash && <span className="text-[10px] text-ink">Copied</span>}
                </div>
              </div>
              <Chip tone={STATUS_META[shipment.status].tone}>{STATUS_META[shipment.status].label}</Chip>
            </div>
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="text-muted-foreground">{shipment.origin}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{shipment.destination}</span>
            </div>
            <a href={`https://www.google.com/search?q=${encodeURIComponent(shipment.carrier + " " + shipment.tracking)}`}
              target="_blank" rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-gold-deep hover:underline">
              Track on carrier site <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <Section title="Order">
            <div className="flex items-center justify-between">
              <div>
                <Link to="/orders" className="font-semibold hover:underline">{shipment.orderId}</Link>
                <div className="text-[11.5px] text-muted-foreground">{shipment.customerName}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Declared value</div>
                <div className="font-sans text-[13px]">{naira(shipment.declaredValue)}</div>
              </div>
            </div>
          </Section>

          <Section title="Parcel">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Items" value={String(shipment.itemsCount)} />
              <Stat label="Weight" value={`${shipment.weightKg} kg`} />
              <Stat label="Cost" value={naira(shipment.costNGN)} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {shipment.insured && <Chip tone="green">Insured</Chip>}
              {shipment.signatureRequired && <Chip tone="blue">Signature required</Chip>}
              <Chip tone="slate"><Package className="h-3 w-3" /> {shipment.warehouseId}</Chip>
            </div>
          </Section>

          <Section title="Timeline">
            <ol className="relative border-l border-black/[0.08] ml-2 pl-4 space-y-3">
              {[...shipment.events].reverse().map((e, i) => {
                const meta = STATUS_META[e.status];
                return (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-ink ring-4 ring-black/5" : "bg-black/20"}`} />
                    <div className="flex items-center justify-between">
                      <div className="text-[12.5px] font-semibold">{meta.label}</div>
                      <div className="text-[11px] text-muted-foreground">{fmtDateTime(e.at)}</div>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">{e.location}{e.note ? ` · ${e.note}` : ""}</div>
                  </li>
                );
              })}
            </ol>
          </Section>

          <Section title="Dates">
            <div className="grid grid-cols-2 gap-2 text-center">
              <Stat label="Created" value={fmtDate(shipment.createdAt)} />
              <Stat label="Shipped" value={fmtDate(shipment.shippedAt)} />
              <Stat label="ETA" value={fmtDate(shipment.etaAt)} />
              <Stat label="Delivered" value={fmtDate(shipment.deliveredAt)} />
            </div>
          </Section>

          <Section title="Internal notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3} placeholder="Add operational notes…"
              className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-none" />
            <button onClick={() => onUpdate({ notes: notes || undefined })}
              className="mt-2 h-8 px-3 rounded-md bg-ink text-white text-[12px] font-semibold hover:bg-ink/90">
              Save notes
            </button>
          </Section>
        </div>

        <div className="border-t border-black/[0.08] p-4 flex items-center gap-2 shrink-0">
          <button onClick={onDelete} className="h-9 px-3 rounded-md border border-rose-200 bg-white text-rose-600 text-[12.5px] font-semibold hover:bg-rose-50 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => alert("Label PDF sent to printer")} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Print label
          </button>
          <div className="ml-auto flex items-center gap-2">
            {shipment.status !== "exception" && shipment.status !== "delivered" && shipment.status !== "returned" && (
              <button onClick={() => { const loc = prompt("Where?", shipment.destination); if (loc) onAdvance("exception", loc, prompt("Reason?") ?? undefined); }}
                className="h-9 px-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-[12.5px] font-semibold hover:bg-amber-100 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Flag exception
              </button>
            )}
            {nextStatus && (
              <button onClick={() => { const loc = prompt("Location for update?", shipment.destination); if (loc) onAdvance(nextStatus, loc); }}
                className="h-9 px-3 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-ink/90 flex items-center gap-1.5">
                Advance to {STATUS_META[nextStatus].label} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2">{title}</div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/[0.08] bg-white py-2 px-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-[13px] font-semibold mt-0.5">{value}</div>
    </div>
  );
}
