import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus, Search, MapPin, Phone, Clock, Power, Trash2, X, ChevronRight, Store,
  CalendarClock, CheckCircle2, XCircle, PackageCheck, Sparkles,
} from "lucide-react";
import { Card, Chip } from "./ui";
import { usePickups, type PickupLocation, type PickupBooking, type PickupStatus } from "@/lib/pickups-store";

const STATUS_TONE: Record<PickupStatus, Parameters<typeof Chip>[0]["tone"]> = {
  scheduled: "amber",
  ready: "blue",
  collected: "green",
  no_show: "red",
  cancelled: "slate",
};
const STATUS_LABEL: Record<PickupStatus, string> = {
  scheduled: "Scheduled",
  ready: "Ready for pickup",
  collected: "Collected",
  no_show: "No show",
  cancelled: "Cancelled",
};

export function AdminPickups() {
  const { locations, bookings, hydrate, createLocation, updateLocation, deleteLocation, toggleLocation, advanceBooking } = usePickups();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  const [tab, setTab] = useState<"locations" | "bookings">("locations");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PickupStatus>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [openLocationId, setOpenLocationId] = useState<string | null>(null);
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);

  const filteredLocations = useMemo(() => {
    const q = query.toLowerCase().trim();
    return locations.filter((l) =>
      !q || l.name.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || l.state.toLowerCase().includes(q)
    );
  }, [locations, query]);

  const filteredBookings = useMemo(() => {
    const q = query.toLowerCase().trim();
    return [...bookings]
      .sort((a, b) => a.scheduledAt - b.scheduledAt)
      .filter((b) => statusFilter === "all" || b.status === statusFilter)
      .filter((b) => locationFilter === "all" || b.locationId === locationFilter)
      .filter((b) => !q || b.customerName.toLowerCase().includes(q) || b.orderId.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
  }, [bookings, query, statusFilter, locationFilter]);

  const totals = useMemo(() => {
    const activeLocs = locations.filter((l) => l.active).length;
    const today = bookings.filter((b) => Math.abs(b.scheduledAt - Date.now()) < 86400000).length;
    const ready = bookings.filter((b) => b.status === "ready").length;
    const collected = bookings.filter((b) => b.status === "collected").length;
    return { activeLocs, total: locations.length, today, ready, collected };
  }, [locations, bookings]);

  const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? " - ";
  const openLocation = openLocationId ? locations.find((l) => l.id === openLocationId) ?? null : null;
  const openBooking = openBookingId ? bookings.find((b) => b.id === openBookingId) ?? null : null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink/50 mb-2">
            <Link to="/" className="hover:text-ink">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <span>Fulfilment</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-ink">Pickups</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Pickups</h1>
          <p className="text-sm text-ink/60 mt-1">Boutique locations where clients collect orders and concierge deliveries.</p>
        </div>
        {tab === "locations" && (
          <button
            onClick={() => { void createLocation("New pickup location").then((id) => { if (id) setOpenLocationId(id); }); }}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-ink text-white text-sm font-medium hover:bg-ink/90"
          >
            <Plus className="w-4 h-4" /> New location
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Locations", value: `${totals.activeLocs} / ${totals.total}`, icon: Store },
          { label: "Today's pickups", value: totals.today.toString(), icon: CalendarClock },
          { label: "Ready to collect", value: totals.ready.toString(), icon: PackageCheck },
          { label: "Collected · all", value: totals.collected.toString(), icon: CheckCircle2 },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} padded={false} className="p-4">
              <div className="flex items-center gap-2 text-[11px] text-ink/50 uppercase tracking-wide">
                <Icon className="w-3.5 h-3.5" /> {k.label}
              </div>
              <div className="text-xl font-semibold mt-1">{k.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-1 border-b border-black/[0.08]">
        {(["locations", "bookings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 h-10 text-sm font-medium capitalize border-b-2 -mb-px ${tab === t ? "border-ink text-ink" : "border-transparent text-ink/50 hover:text-ink"}`}
          >
            {t} <span className="text-ink/40 ml-1">({t === "locations" ? locations.length : bookings.length})</span>
          </button>
        ))}
      </div>

      {tab === "locations" ? (
        <>
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search locations…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-black/10 text-sm focus:outline-none focus:border-ink/40 bg-white"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map((l) => (
              <Card key={l.id} padded={false} className="p-5 hover:border-ink/30 cursor-pointer transition-colors" >
                <div onClick={() => setOpenLocationId(l.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-ink/40 font-sans">{l.id}</div>
                      <div className="text-base font-semibold mt-0.5">{l.name}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Chip tone={l.active ? "green" : "slate"}>{l.active ? "Active" : "Inactive"}</Chip>
                      {l.concierge && <Chip tone="gold"><Sparkles className="w-3 h-3" /> Concierge</Chip>}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-ink/70">
                    <div className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {l.address}, {l.city}, {l.state}, {l.country}</div>
                    <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {l.phone || " - "}</div>
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {l.hours}</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center justify-between text-xs">
                    <div><span className="text-ink/50">Capacity</span> <span className="font-medium">{l.capacityPerDay}/day</span></div>
                    <div><span className="text-ink/50">30-day</span> <span className="font-medium">{l.bookingsLast30} pickups</span></div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-black/[0.05] flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => toggleLocation(l.id)} className="text-xs px-2.5 h-8 rounded border border-black/10 hover:border-black/30 inline-flex items-center gap-1"><Power className="w-3.5 h-3.5" /> {l.active ? "Disable" : "Enable"}</button>
                  <button onClick={() => setOpenLocationId(l.id)} className="text-xs px-2.5 h-8 rounded border border-black/10 hover:border-black/30">Edit</button>
                  <button onClick={() => { if (confirm(`Delete ${l.name}?`)) deleteLocation(l.id); }} className="ml-auto text-xs px-2.5 h-8 rounded text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </Card>
            ))}
            {filteredLocations.length === 0 && (
              <div className="col-span-full text-center text-ink/50 py-16">No locations match.</div>
            )}
          </div>
        </>
      ) : (
        <>
          <Card padded={false}>
            <div className="p-4 border-b border-black/[0.06] flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customer, order, or PU id…"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-black/10 text-sm focus:outline-none focus:border-ink/40"
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-10 px-3 rounded-lg border border-black/10 text-sm">
                <option value="all">All statuses</option>
                {(Object.keys(STATUS_LABEL) as PickupStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-black/10 text-sm">
                <option value="all">All locations</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-ink/50 bg-black/[0.02]">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Booking</th>
                    <th className="text-left px-4 py-2.5 font-medium">Customer</th>
                    <th className="text-left px-4 py-2.5 font-medium">Location</th>
                    <th className="text-left px-4 py-2.5 font-medium">Scheduled</th>
                    <th className="text-center px-4 py-2.5 font-medium">Items</th>
                    <th className="text-center px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-black/[0.015] cursor-pointer" onClick={() => setOpenBookingId(b.id)}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{b.id}</div>
                        <div className="text-[11px] text-ink/50 font-sans">{b.orderId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{b.customerName}</div>
                        <div className="text-[11px] text-ink/50">{b.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3 text-ink/70">{locName(b.locationId)}</td>
                      <td className="px-4 py-3 text-ink/70">{new Date(b.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{b.itemsCount}</td>
                      <td className="px-4 py-3 text-center"><Chip tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Chip></td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {b.status !== "collected" && b.status !== "cancelled" && (
                            <button onClick={() => advanceBooking(b.id, b.status === "scheduled" ? "ready" : "collected")} className="text-xs px-2.5 h-8 rounded border border-black/10 hover:border-black/30">
                              {b.status === "scheduled" ? "Mark ready" : "Mark collected"}
                            </button>
                          )}
                          {b.status === "scheduled" && (
                            <button title="No show" onClick={() => advanceBooking(b.id, "no_show")} className="p-1.5 rounded hover:bg-black/5 text-rose-600"><XCircle className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBookings.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-ink/50 py-12">No pickup bookings match.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {openLocation && (
        <LocationDrawer
          location={openLocation}
          onClose={() => setOpenLocationId(null)}
          onSave={(patch) => updateLocation(openLocation.id, patch)}
        />
      )}
      {openBooking && (
        <BookingDrawer
          booking={openBooking}
          locationName={locName(openBooking.locationId)}
          onClose={() => setOpenBookingId(null)}
          onAdvance={(s, by) => advanceBooking(openBooking.id, s, by)}
        />
      )}
    </div>
  );
}

function LocationDrawer({ location, onClose, onSave }: { location: PickupLocation; onClose: () => void; onSave: (p: Partial<PickupLocation>) => void }) {
  const [l, setL] = useState(location);
  const set = <K extends keyof PickupLocation>(k: K, v: PickupLocation[K]) => setL((prev) => ({ ...prev, [k]: v }));
  const save = () => onSave(l);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl">
        <header className="sticky top-0 bg-white border-b border-black/[0.06] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="text-[11px] text-ink/40 font-sans">{l.id}</div>
            <div className="text-lg font-semibold">{l.name}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-black/5"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-6 space-y-4">
          <label className="block text-xs">
            <span className="text-ink/60">Name</span>
            <input value={l.name} onChange={(e) => set("name", e.target.value)} onBlur={save} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
          </label>
          <label className="block text-xs">
            <span className="text-ink/60">Address</span>
            <input value={l.address} onChange={(e) => set("address", e.target.value)} onBlur={save} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs">
              <span className="text-ink/60">City</span>
              <input value={l.city} onChange={(e) => set("city", e.target.value)} onBlur={save} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
            </label>
            <label className="block text-xs">
              <span className="text-ink/60">State / region</span>
              <input value={l.state} onChange={(e) => set("state", e.target.value)} onBlur={save} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs">
              <span className="text-ink/60">Country</span>
              <input value={l.country} onChange={(e) => set("country", e.target.value)} onBlur={save} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
            </label>
            <label className="block text-xs">
              <span className="text-ink/60">Phone</span>
              <input value={l.phone} onChange={(e) => set("phone", e.target.value)} onBlur={save} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
            </label>
          </div>
          <label className="block text-xs">
            <span className="text-ink/60">Opening hours</span>
            <input value={l.hours} onChange={(e) => set("hours", e.target.value)} onBlur={save} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
          </label>
          <label className="block text-xs">
            <span className="text-ink/60">Capacity per day (pickup slots)</span>
            <input type="number" value={l.capacityPerDay} onChange={(e) => set("capacityPerDay", Number(e.target.value))} onBlur={save} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm tabular-nums" />
          </label>
          <div className="flex flex-col gap-2 pt-2 border-t border-black/[0.06]">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={l.active} onChange={(e) => { set("active", e.target.checked); onSave({ active: e.target.checked }); }} className="w-4 h-4" />
              Location is active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={l.concierge} onChange={(e) => { set("concierge", e.target.checked); onSave({ concierge: e.target.checked }); }} className="w-4 h-4" />
              Supports concierge handoff
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingDrawer({
  booking, locationName, onClose, onAdvance,
}: { booking: PickupBooking; locationName: string; onClose: () => void; onAdvance: (s: PickupStatus, collectedBy?: string) => void }) {
  const [collectedBy, setCollectedBy] = useState(booking.collectedBy ?? booking.customerName);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
        <header className="sticky top-0 bg-white border-b border-black/[0.06] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="text-[11px] text-ink/40 font-sans">{booking.id}</div>
            <div className="text-lg font-semibold">{booking.customerName}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-black/5"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-6 space-y-4 text-sm">
          <Card padded={false} className="p-4 space-y-2">
            <div className="flex items-center justify-between"><span className="text-ink/60">Order</span><span className="font-medium font-sans">{booking.orderId}</span></div>
            <div className="flex items-center justify-between"><span className="text-ink/60">Location</span><span className="font-medium">{locationName}</span></div>
            <div className="flex items-center justify-between"><span className="text-ink/60">Scheduled</span><span className="font-medium">{new Date(booking.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span></div>
            <div className="flex items-center justify-between"><span className="text-ink/60">Items</span><span className="font-medium tabular-nums">{booking.itemsCount}</span></div>
            <div className="flex items-center justify-between"><span className="text-ink/60">Status</span><Chip tone={STATUS_TONE[booking.status]}>{STATUS_LABEL[booking.status]}</Chip></div>
            {booking.collectedAt && (
              <div className="flex items-center justify-between text-xs text-ink/60"><span>Collected</span><span>{new Date(booking.collectedAt).toLocaleString()}</span></div>
            )}
            {booking.collectedBy && (
              <div className="flex items-center justify-between text-xs text-ink/60"><span>Received by</span><span>{booking.collectedBy}</span></div>
            )}
          </Card>
          {booking.notes && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">Note: {booking.notes}</div>
          )}
          {booking.status !== "collected" && booking.status !== "cancelled" && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-ink/70">Advance status</div>
              <div className="flex flex-wrap gap-2">
                {booking.status === "scheduled" && (
                  <button onClick={() => onAdvance("ready")} className="px-3 h-9 rounded-lg text-xs bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center gap-1"><PackageCheck className="w-4 h-4" /> Mark ready</button>
                )}
                <label className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <input value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} placeholder="Received by…" className="flex-1 h-9 px-3 rounded-lg border border-black/10 text-xs" />
                  <button onClick={() => onAdvance("collected", collectedBy)} className="px-3 h-9 rounded-lg text-xs bg-ink text-white hover:bg-ink inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Collected</button>
                </label>
                <button onClick={() => onAdvance("no_show")} className="px-3 h-9 rounded-lg text-xs border border-rose-200 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1"><XCircle className="w-4 h-4" /> No show</button>
                <button onClick={() => onAdvance("cancelled")} className="px-3 h-9 rounded-lg text-xs border border-black/10 hover:border-black/30">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
