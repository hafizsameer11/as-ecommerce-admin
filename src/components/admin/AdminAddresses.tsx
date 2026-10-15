import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, IconButton, StatusPill, TableWrap, Toolbar } from "./ui";
import { useAddresses, type Address, type AddressType } from "@/lib/addresses-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  MapPin, Search, Download, Flag, ShieldCheck, Star, Trash2, Copy,
  Home, Building2, Warehouse, X, Filter as FilterIcon, Check,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

const TYPE_META: Record<AddressType, { label: string; Icon: typeof Home; tone: Parameters<typeof Chip>[0]["tone"] }> = {
  shipping: { label: "Shipping", Icon: Home, tone: "blue" },
  billing: { label: "Billing", Icon: Building2, tone: "purple" },
  pickup: { label: "Pickup", Icon: Warehouse, tone: "amber" },
};

type Tab = "all" | AddressType | "flagged" | "unverified";

export function AdminAddresses() {
  const { addresses, hydrate, toggleVerified, toggleFlag, setDefault, remove, update } = useAddresses();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [country, setCountry] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const countries = useMemo(() => Array.from(new Set(addresses.map((a) => a.country))).sort(), [addresses]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return addresses.filter((a) => {
      if (tab === "flagged" && !a.flagged) return false;
      if (tab === "unverified" && a.verified) return false;
      if (tab !== "all" && tab !== "flagged" && tab !== "unverified" && a.type !== tab) return false;
      if (country !== "all" && a.country !== country) return false;
      if (!query) return true;
      return [a.customerName, a.recipient, a.line1, a.line2, a.city, a.state, a.country, a.phone, a.postalCode]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
    });
  }, [addresses, tab, q, country]);

  const kpis = useMemo(() => ({
    total: addresses.length,
    verified: addresses.filter((a) => a.verified).length,
    flagged: addresses.filter((a) => a.flagged).length,
    countries: countries.length,
  }), [addresses, countries]);

  const openAddress = addresses.find((a) => a.id === openId) || null;

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkVerify = () => { selected.forEach((id) => { const a = addresses.find((x) => x.id === id); if (a && !a.verified) toggleVerified(id); }); setSelected(new Set()); };
  const bulkDelete = () => { if (!confirm(`Delete ${selected.size} addresses?`)) return; selected.forEach((id) => remove(id)); setSelected(new Set()); };

  const exportCSV = () => downloadCSV("addresses.csv", filtered.map((a) => ({
    Customer: a.customerName, Type: a.type, Label: a.label, Recipient: a.recipient, Phone: a.phone,
    Line1: a.line1, Line2: a.line2 ?? "", City: a.city, State: a.state, Country: a.country, Postal: a.postalCode,
    Default: a.isDefault ? "Yes" : "No", Verified: a.verified ? "Yes" : "No", Flagged: a.flagged ? "Yes" : "No",
    Orders: a.ordersShipped, LastUsed: new Date(a.lastUsedAt).toISOString().slice(0, 10),
  })));

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: addresses.length },
    { id: "shipping", label: "Shipping", count: addresses.filter((a) => a.type === "shipping").length },
    { id: "billing", label: "Billing", count: addresses.filter((a) => a.type === "billing").length },
    { id: "pickup", label: "Pickup", count: addresses.filter((a) => a.type === "pickup").length },
    { id: "unverified", label: "Unverified", count: addresses.filter((a) => !a.verified).length },
    { id: "flagged", label: "Flagged", count: kpis.flagged },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Addresses"
        subtitle="Customer shipping, billing and pickup addresses across all markets."
        actions={
          <button onClick={exportCSV} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KPI label="Total addresses" value={kpis.total.toLocaleString()} Icon={MapPin} />
        <KPI label="Verified" value={kpis.verified.toLocaleString()} Icon={ShieldCheck} tone="text-ink" />
        <KPI label="Flagged" value={kpis.flagged.toLocaleString()} Icon={Flag} tone="text-rose-700" />
        <KPI label="Countries" value={kpis.countries.toLocaleString()} Icon={Building2} />
      </div>

      <div className="flex items-center gap-1 border-b border-black/[0.08] mb-4 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            {t.label} <span className="ml-1 text-[11px] text-muted-foreground">{t.count}</span>
          </button>
        ))}
      </div>

      <Toolbar>
        <div className="flex-1 min-w-[220px] max-w-md h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer, street, city, phone…"
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>
        <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
          <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-transparent outline-none pr-1">
            <option value="all">All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="ml-auto text-[12px] text-muted-foreground">{filtered.length} of {addresses.length}</div>
      </Toolbar>

      {selected.size > 0 && (
        <div className="sticky top-14 z-20 mb-3 flex items-center gap-2 bg-ink text-white rounded-md px-3 h-11 text-[12.5px]">
          <span className="font-semibold">{selected.size} selected</span>
          <button onClick={bulkVerify} className="ml-auto h-8 px-3 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Mark verified
          </button>
          <button onClick={bulkDelete} className="h-8 px-3 rounded bg-rose-500 hover:bg-rose-600 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="h-8 w-8 grid place-items-center rounded hover:bg-white/10">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card><Empty title="No addresses match" sub="Try clearing filters or searching a different term." /></Card>
      ) : (
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-[#faf8f3] text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2.5 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-left px-3 py-2.5">Customer</th>
                <th className="text-left px-3 py-2.5">Type</th>
                <th className="text-left px-3 py-2.5">Address</th>
                <th className="text-left px-3 py-2.5">Location</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-right px-3 py-2.5">Orders</th>
                <th className="text-right px-3 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const meta = TYPE_META[a.type];
                return (
                  <tr key={a.id} className="border-t border-black/[0.06] hover:bg-black/[0.02]">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleOne(a.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-3">
                      <Link to="/customers" className="font-semibold hover:underline">{a.customerName}</Link>
                      <div className="text-[11.5px] text-muted-foreground">{a.phone}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Chip tone={meta.tone}><meta.Icon className="h-3 w-3" /> {meta.label}</Chip>
                      {a.isDefault && <div className="mt-1"><Chip tone="gold"><Star className="h-3 w-3" /> Default</Chip></div>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{a.line1}</div>
                      {a.line2 && <div className="text-[11.5px] text-muted-foreground">{a.line2}</div>}
                      <div className="text-[11px] text-muted-foreground">{a.label} · {a.postalCode}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div>{a.city}</div>
                      <div className="text-[11.5px] text-muted-foreground">{a.country}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusPill status={a.verified ? "Verified" : "Unverified"} />
                        {a.flagged && <Chip tone="red"><Flag className="h-3 w-3" /> Flagged</Chip>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{a.ordersShipped}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => setOpenId(a.id)} className="text-[12px] font-semibold text-ink hover:underline">
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      {openAddress && (
        <AddressDrawer
          key={openAddress.id}
          address={openAddress}
          onClose={() => setOpenId(null)}
          onToggleVerified={() => toggleVerified(openAddress.id)}
          onToggleFlag={() => toggleFlag(openAddress.id)}
          onSetDefault={() => setDefault(openAddress.customerId, openAddress.id)}
          onDelete={() => { if (confirm("Delete this address?")) { remove(openAddress.id); setOpenId(null); } }}
          onSave={(patch) => update(openAddress.id, patch)}
        />
      )}
    </div>
  );
}

function KPI({ label, value, Icon, tone = "text-ink" }: { label: string; value: string; Icon: typeof MapPin; tone?: string }) {
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

function AddressDrawer({
  address, onClose, onToggleVerified, onToggleFlag, onSetDefault, onDelete, onSave,
}: {
  address: Address;
  onClose: () => void;
  onToggleVerified: () => void;
  onToggleFlag: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  onSave: (patch: Partial<Address>) => void;
}) {
  const [form, setForm] = useState({
    label: address.label,
    recipient: address.recipient,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    state: address.state,
    country: address.country,
    postalCode: address.postalCode,
    notes: address.notes ?? "",
  });
  const [saved, setSaved] = useState(false);

  const copyFull = () => {
    const text = [form.recipient, form.line1, form.line2, `${form.city}, ${form.state} ${form.postalCode}`, form.country, form.phone]
      .filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const save = () => {
    onSave({ ...form, line2: form.line2 || undefined, notes: form.notes || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-white z-50 shadow-2xl flex flex-col">
        <div className="h-14 px-5 border-b border-black/[0.08] flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Manage address</div>
            <div className="font-display font-bold text-[15px] leading-tight">{address.customerName}</div>
          </div>
          <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <button onClick={onToggleVerified} className={`h-8 px-3 rounded-md border text-[12px] font-semibold flex items-center gap-1.5 ${address.verified ? "bg-muted border-border text-ink" : "bg-white border-black/10"}`}>
              <ShieldCheck className="h-3.5 w-3.5" /> {address.verified ? "Verified" : "Mark verified"}
            </button>
            <button onClick={onSetDefault} disabled={address.isDefault} className={`h-8 px-3 rounded-md border text-[12px] font-semibold flex items-center gap-1.5 ${address.isDefault ? "bg-gold/15 border-gold/30 text-gold-deep" : "bg-white border-black/10 hover:bg-black/[0.04]"}`}>
              <Star className="h-3.5 w-3.5" /> {address.isDefault ? "Default" : "Set default"}
            </button>
            <button onClick={onToggleFlag} className={`h-8 px-3 rounded-md border text-[12px] font-semibold flex items-center gap-1.5 ${address.flagged ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white border-black/10"}`}>
              <Flag className="h-3.5 w-3.5" /> {address.flagged ? "Flagged" : "Flag"}
            </button>
            <button onClick={copyFull} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-black/[0.04]">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>

          <Section title="Address">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Label" value={form.label} onChange={(v) => setForm({ ...form, label: v })} />
              <Field label="Recipient" value={form.recipient} onChange={(v) => setForm({ ...form, recipient: v })} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} span={2} />
              <Field label="Address line 1" value={form.line1} onChange={(v) => setForm({ ...form, line1: v })} span={2} />
              <Field label="Address line 2" value={form.line2} onChange={(v) => setForm({ ...form, line2: v })} span={2} />
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="State / Region" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
              <Field label="Postal code" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} />
              <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
            </div>
          </Section>

          <Section title="Internal notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Access instructions, gate codes, delivery preferences…"
              rows={3}
              className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-none"
            />
          </Section>

          <Section title="Usage">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Orders" value={String(address.ordersShipped)} />
              <Stat label="Last used" value={new Date(address.lastUsedAt).toLocaleDateString()} />
              <Stat label="Added" value={new Date(address.createdAt).toLocaleDateString()} />
            </div>
          </Section>
        </div>

        <div className="border-t border-black/[0.08] p-4 flex items-center gap-2 shrink-0">
          <button onClick={onDelete} className="h-9 px-3 rounded-md border border-rose-200 bg-white text-rose-600 text-[12.5px] font-semibold hover:bg-rose-50 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={onClose} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Cancel</button>
          <button onClick={save} className="h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
            {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : "Save changes"}
          </button>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, span = 1 }: { label: string; value: string; onChange: (v: string) => void; span?: 1 | 2 }) {
  return (
    <label className={`block ${span === 2 ? "col-span-2" : ""}`}>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink"
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#faf8f3] py-2.5">
      <div className="font-display text-[15px] leading-tight">{value}</div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">{label}</div>
    </div>
  );
}
