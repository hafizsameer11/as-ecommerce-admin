import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus, Search, Route as RouteIcon, Globe, MapPin, Copy, Trash2, Power, X, ChevronRight,
  Package, Truck, Calculator, DollarSign,
} from "lucide-react";
import { Card, Chip, naira } from "./ui";
import { useShippingZones, type ShippingZone, type ZoneRate } from "@/lib/shipping-zones-store";

const COUNTRY_NAMES: Record<string, string> = {
  NG: "Nigeria", GB: "United Kingdom", US: "United States", CA: "Canada",
  AE: "UAE", SA: "Saudi Arabia", QA: "Qatar", FR: "France", DE: "Germany", ZA: "South Africa",
};

function ScopeChip({ scope }: { scope: ShippingZone["scope"] }) {
  const map: Record<ShippingZone["scope"], { icon: typeof Globe; label: string; tone: Parameters<typeof Chip>[0]["tone"] }> = {
    country: { icon: Globe, label: "Country", tone: "blue" },
    state: { icon: MapPin, label: "State", tone: "purple" },
    city: { icon: MapPin, label: "City", tone: "gold" },
    postcode: { icon: MapPin, label: "Postcode", tone: "slate" },
  };
  const cfg = map[scope];
  const Icon = cfg.icon;
  return <Chip tone={cfg.tone}><Icon className="w-3 h-3" /> {cfg.label}</Chip>;
}

export function AdminShippingZones() {
  const { zones, createZone, updateZone, duplicateZone, deleteZone, toggleActive, upsertRate, deleteRate, hydrate } = useShippingZones();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [rateEditor, setRateEditor] = useState<{ zoneId: string; rate: ZoneRate } | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return [...zones].sort((a, b) => a.priority - b.priority).filter((z) =>
      !q || z.name.toLowerCase().includes(q) || z.countries.some((c) => c.toLowerCase().includes(q) || (COUNTRY_NAMES[c] ?? "").toLowerCase().includes(q))
    );
  }, [zones, query]);

  const totals = useMemo(() => ({
    zones: zones.length,
    active: zones.filter((z) => z.active).length,
    rates: zones.reduce((a, z) => a + z.rates.length, 0),
    orders: zones.reduce((a, z) => a + z.ordersLast30, 0),
    revenue: zones.reduce((a, z) => a + z.revenueLast30, 0),
  }), [zones]);

  const openZone = openId ? zones.find((z) => z.id === openId) ?? null : null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink/50 mb-2">
            <Link to="/" className="hover:text-ink">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <span>Fulfilment</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-ink">Shipping Zones</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Shipping Zones</h1>
          <p className="text-sm text-ink/60 mt-1">Define where you ship and how much it costs. Lower priority number wins on overlaps.</p>
        </div>
        <button
          onClick={async () => { const id = await createZone("New zone"); if (id) setOpenId(id); }}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-ink text-white text-sm font-medium hover:bg-ink/90"
        >
          <Plus className="w-4 h-4" /> New zone
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Zones", value: totals.zones.toString(), icon: RouteIcon },
          { label: "Active", value: `${totals.active} / ${totals.zones}`, icon: Power },
          { label: "Rate cards", value: totals.rates.toString(), icon: Truck },
          { label: "Revenue · 30d", value: naira(totals.revenue), icon: DollarSign },
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

      <Card padded={false}>
        <div className="p-4 border-b border-black/[0.06] flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search zones or countries…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-black/10 text-sm focus:outline-none focus:border-ink/40"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-ink/50 bg-black/[0.02]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Zone</th>
                <th className="text-left px-4 py-2.5 font-medium">Scope</th>
                <th className="text-left px-4 py-2.5 font-medium">Coverage</th>
                <th className="text-left px-4 py-2.5 font-medium">Rates</th>
                <th className="text-right px-4 py-2.5 font-medium">Orders · 30d</th>
                <th className="text-right px-4 py-2.5 font-medium">Revenue · 30d</th>
                <th className="text-center px-4 py-2.5 font-medium">Priority</th>
                <th className="text-center px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {filtered.map((z) => (
                <tr key={z.id} className="hover:bg-black/[0.015] cursor-pointer" onClick={() => setOpenId(z.id)}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{z.name}</div>
                    <div className="text-[11px] text-ink/40 font-sans">{z.id}</div>
                  </td>
                  <td className="px-4 py-3"><ScopeChip scope={z.scope} /></td>
                  <td className="px-4 py-3 text-ink/70 max-w-[260px] truncate">
                    {z.countries.map((c) => COUNTRY_NAMES[c] ?? c).join(", ")}
                    {z.regions.length ? ` · ${z.regions.slice(0, 2).join(", ")}${z.regions.length > 2 ? "…" : ""}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {z.rates.slice(0, 3).map((r) => (
                        <Chip key={r.id} tone={r.active ? "neutral" : "slate"}>{r.name}</Chip>
                      ))}
                      {z.rates.length > 3 && <Chip tone="slate">+{z.rates.length - 3}</Chip>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{z.ordersLast30}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{naira(z.revenueLast30)}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{z.priority}</td>
                  <td className="px-4 py-3 text-center">
                    <Chip tone={z.active ? "green" : "slate"}>{z.active ? "Active" : "Inactive"}</Chip>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button title="Toggle" onClick={() => toggleActive(z.id)} className="p-1.5 rounded hover:bg-black/5"><Power className="w-4 h-4" /></button>
                      <button title="Duplicate" onClick={() => duplicateZone(z.id)} className="p-1.5 rounded hover:bg-black/5"><Copy className="w-4 h-4" /></button>
                      <button title="Delete" onClick={() => { if (confirm(`Delete ${z.name}?`)) deleteZone(z.id); }} className="p-1.5 rounded hover:bg-black/5 text-rose-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-ink/50 py-12">No zones match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {openZone && (
        <ZoneDrawer
          zone={openZone}
          onClose={() => setOpenId(null)}
          onSave={(patch) => updateZone(openZone.id, patch)}
          onAddRate={() => setRateEditor({
            zoneId: openZone.id,
            rate: { id: `R${Date.now()}`, name: "New rate", carrier: "Local", service: "Ground", baseNGN: 3000, perKgNGN: 500, minKg: 0, maxKg: 20, etaDays: "3-5", active: true },
          })}
          onEditRate={(rate) => setRateEditor({ zoneId: openZone.id, rate })}
          onDeleteRate={(rateId) => deleteRate(openZone.id, rateId)}
        />
      )}

      {rateEditor && (
        <RateEditor
          rate={rateEditor.rate}
          onClose={() => setRateEditor(null)}
          onSave={(rate) => { upsertRate(rateEditor.zoneId, rate); setRateEditor(null); }}
        />
      )}
    </div>
  );
}

function ZoneDrawer({
  zone, onClose, onSave, onAddRate, onEditRate, onDeleteRate,
}: {
  zone: ShippingZone;
  onClose: () => void;
  onSave: (patch: Partial<ShippingZone>) => void;
  onAddRate: () => void;
  onEditRate: (rate: ZoneRate) => void;
  onDeleteRate: (id: string) => void;
}) {
  const [name, setName] = useState(zone.name);
  const [scope, setScope] = useState(zone.scope);
  const [priority, setPriority] = useState(zone.priority);
  const [countries, setCountries] = useState(zone.countries.join(", "));
  const [regions, setRegions] = useState(zone.regions.join(", "));
  const [notes, setNotes] = useState(zone.notes ?? "");

  const save = () => {
    onSave({
      name,
      scope,
      priority: Number.isFinite(priority) ? priority : 20,
      countries: countries.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
      regions: regions.split(",").map((s) => s.trim()).filter(Boolean),
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl">
        <header className="sticky top-0 bg-white border-b border-black/[0.06] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="text-[11px] text-ink/40 font-sans">{zone.id}</div>
            <div className="text-lg font-semibold">{zone.name}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-black/5"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-6 space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Zone details</h3>
            <label className="block text-xs">
              <span className="text-ink/60">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} onBlur={save} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs">
                <span className="text-ink/60">Scope</span>
                <select value={scope} onChange={(e) => { const v = e.target.value as ShippingZone["scope"]; setScope(v); onSave({ scope: v }); }} className="mt-1 w-full h-10 px-2 rounded-lg border border-black/10 text-sm">
                  <option value="country">Country</option>
                  <option value="state">State / region</option>
                  <option value="city">City</option>
                  <option value="postcode">Postcode</option>
                </select>
              </label>
              <label className="block text-xs">
                <span className="text-ink/60">Priority (low wins)</span>
                <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} onBlur={save} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
              </label>
            </div>
            <label className="block text-xs">
              <span className="text-ink/60">Countries (ISO codes, comma-separated)</span>
              <input value={countries} onChange={(e) => setCountries(e.target.value)} onBlur={save} placeholder="NG, GB, US" className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm font-sans uppercase" />
            </label>
            {scope !== "country" && (
              <label className="block text-xs">
                <span className="text-ink/60">Regions ({scope === "postcode" ? "postcodes" : scope === "state" ? "states" : "cities"})</span>
                <input value={regions} onChange={(e) => setRegions(e.target.value)} onBlur={save} placeholder="Comma-separated" className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
              </label>
            )}
            <label className="block text-xs">
              <span className="text-ink/60">Internal notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={save} rows={2} className="mt-1 w-full px-3 py-2 rounded-lg border border-black/10 text-sm" />
            </label>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Rates <span className="text-ink/40 font-normal">({zone.rates.length})</span></h3>
              <button onClick={onAddRate} className="inline-flex items-center gap-1.5 text-xs px-3 h-8 rounded-lg border border-ink/20 hover:border-ink/40">
                <Plus className="w-3.5 h-3.5" /> Add rate
              </button>
            </div>
            <div className="space-y-2">
              {zone.rates.map((r) => (
                <div key={r.id} className="border border-black/[0.08] rounded-lg p-3 flex items-start justify-between gap-3 hover:border-ink/30 cursor-pointer" onClick={() => onEditRate(r)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {r.name}
                      <Chip tone="neutral">{r.carrier}</Chip>
                      {!r.active && <Chip tone="slate">Off</Chip>}
                    </div>
                    <div className="text-xs text-ink/60 mt-0.5">{r.service} · ETA {r.etaDays === "0" ? "same-day" : `${r.etaDays} days`}</div>
                    <div className="text-xs text-ink/60 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span><Calculator className="w-3 h-3 inline mr-1" />{naira(r.baseNGN)} + {naira(r.perKgNGN)}/kg</span>
                      <span><Package className="w-3 h-3 inline mr-1" />up to {r.maxKg}kg</span>
                      {r.freeAboveNGN && <span className="text-ink">Free above {naira(r.freeAboveNGN)}</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete rate?")) onDeleteRate(r.id); }} className="p-1.5 rounded hover:bg-black/5 text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {zone.rates.length === 0 && <div className="text-xs text-ink/50 border border-dashed border-black/10 rounded-lg py-6 text-center">No rates yet.</div>}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Card padded={false} className="p-3">
              <div className="text-[11px] text-ink/50 uppercase">Orders · 30d</div>
              <div className="text-lg font-semibold tabular-nums">{zone.ordersLast30}</div>
            </Card>
            <Card padded={false} className="p-3">
              <div className="text-[11px] text-ink/50 uppercase">Revenue · 30d</div>
              <div className="text-lg font-semibold tabular-nums">{naira(zone.revenueLast30)}</div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function RateEditor({ rate, onClose, onSave }: { rate: ZoneRate; onClose: () => void; onSave: (r: ZoneRate) => void }) {
  const [r, setR] = useState(rate);
  const set = <K extends keyof ZoneRate>(k: K, v: ZoneRate[K]) => setR((prev) => ({ ...prev, [k]: v }));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <header className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
          <div className="text-base font-semibold">Rate card</div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-black/5"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-5 space-y-3">
          <label className="block text-xs">
            <span className="text-ink/60">Rate name</span>
            <input value={r.name} onChange={(e) => set("name", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs">
              <span className="text-ink/60">Carrier</span>
              <select value={r.carrier} onChange={(e) => set("carrier", e.target.value as ZoneRate["carrier"])} className="mt-1 w-full h-10 px-2 rounded-lg border border-black/10 text-sm">
                {["DHL", "FedEx", "UPS", "GIG", "Aramex", "Local", "In-house"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-xs">
              <span className="text-ink/60">Service</span>
              <input value={r.service} onChange={(e) => set("service", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs">
              <span className="text-ink/60">Base fee (₦)</span>
              <input type="number" value={r.baseNGN} onChange={(e) => set("baseNGN", Number(e.target.value))} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm tabular-nums" />
            </label>
            <label className="block text-xs">
              <span className="text-ink/60">Per kg (₦)</span>
              <input type="number" value={r.perKgNGN} onChange={(e) => set("perKgNGN", Number(e.target.value))} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm tabular-nums" />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-xs">
              <span className="text-ink/60">Min kg</span>
              <input type="number" value={r.minKg} onChange={(e) => set("minKg", Number(e.target.value))} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm tabular-nums" />
            </label>
            <label className="block text-xs">
              <span className="text-ink/60">Max kg</span>
              <input type="number" value={r.maxKg} onChange={(e) => set("maxKg", Number(e.target.value))} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm tabular-nums" />
            </label>
            <label className="block text-xs">
              <span className="text-ink/60">ETA (days)</span>
              <input value={r.etaDays} onChange={(e) => set("etaDays", e.target.value)} placeholder="2-3" className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm" />
            </label>
          </div>
          <label className="block text-xs">
            <span className="text-ink/60">Free above (₦, optional)</span>
            <input type="number" value={r.freeAboveNGN ?? ""} onChange={(e) => set("freeAboveNGN", e.target.value === "" ? undefined : Number(e.target.value))} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/10 text-sm tabular-nums" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={r.active} onChange={(e) => set("active", e.target.checked)} className="w-4 h-4" />
            Rate is active
          </label>
        </div>
        <footer className="px-5 py-4 border-t border-black/[0.06] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg text-sm border border-black/10 hover:border-black/30">Cancel</button>
          <button onClick={() => onSave(r)} className="px-4 h-10 rounded-lg text-sm bg-ink text-white hover:bg-ink/90">Save rate</button>
        </footer>
      </div>
    </div>
  );
}
