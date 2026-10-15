import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, IconButton, TableWrap, Toolbar, naira } from "./ui";
import {
  useTax, SCOPE_LABEL, collectedThisMonth,
  type TaxRate, type TaxScope, type TaxBasis, type TaxExemption,
} from "@/lib/tax-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Percent, Plus, Search, Download, X, Trash2, ToggleLeft, ToggleRight,
  Globe, MapPin, Building2, ShieldCheck, FileText, ReceiptText, AlertCircle,
  Package, Truck, Sparkles, Settings2, Save, Calculator,
} from "lucide-react";

type Tab = "rates" | "categories" | "exemptions" | "settings";

const APPLIES_META = [
  { id: "products", label: "Products", icon: Package },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "concierge_fee", label: "Concierge fee", icon: Sparkles },
] as const;

const SCOPE_ICON: Record<TaxScope, typeof Globe> = {
  country: Globe,
  state: MapPin,
  postcode: Building2,
};

export function AdminTax() {
  const {
    rates, categories, exemptions, settings,
    addRate, updateRate, removeRate, toggleRate,
    addExemption, removeExemption, updateSettings, updateCategory, hydrate,
  } = useTax();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [tab, setTab] = useState<Tab>("rates");
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newExOpen, setNewExOpen] = useState(false);

  const collected = useMemo(() => collectedThisMonth(rates), [rates]);
  const activeCount = rates.filter((r) => r.active).length;
  const inactiveCount = rates.length - activeCount;

  const filteredRates = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rates;
    return rates.filter((r) =>
      [r.name, r.region, r.code].some((v) => v.toLowerCase().includes(query))
    );
  }, [rates, q]);

  const editing = rates.find((r) => r.id === editingId) || null;

  const startNewRate = async () => {
    const code = `TX-${String(Math.floor(Math.random() * 900) + 100)}`;
    const created = await addRate({
      id: code, name: "New tax rule", scope: "country", region: "NG",
      rate: 7.5, basis: "exclusive", appliesTo: ["products"],
      code, active: false, createdAt: Date.now(),
    });
    setEditingId(created.id);
  };

  const exportRates = () => {
    downloadCSV(`tax-rates-${Date.now()}.csv`, rates.map((r) => ({
      id: r.id, name: r.name, code: r.code, scope: r.scope, region: r.region,
      rate: `${r.rate}%`, basis: r.basis, appliesTo: r.appliesTo.join("|"), active: r.active,
    })));
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "rates", label: "Rates", count: rates.length },
    { id: "categories", label: "Categories", count: categories.length },
    { id: "exemptions", label: "Exemptions", count: exemptions.length },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Tax"
        subtitle="Rate matrix, product categories, exemptions and invoicing rules."
        actions={
          <>
            <button
              onClick={exportRates}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-black/[0.03]"
            >
              <Download className="h-4 w-4" /> Export rates
            </button>
            {tab === "rates" && (
              <button
                onClick={startNewRate}
                className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-ink/90"
              >
                <Plus className="h-4 w-4" /> New rate
              </button>
            )}
            {tab === "exemptions" && (
              <button
                onClick={() => setNewExOpen(true)}
                className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-ink/90"
              >
                <Plus className="h-4 w-4" /> New exemption
              </button>
            )}
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">Collected · this month</div>
              <div className="font-display text-2xl mt-1">{naira(collected)}</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-muted text-ink">
              <Calculator className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">Est. based on active rules</div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">Active rules</div>
              <div className="font-display text-2xl mt-1">{activeCount}</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-sky-50 text-sky-700">
              <Percent className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">{inactiveCount} inactive</div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">Registered TIN</div>
              <div className="font-sans text-[13.5px] mt-1 truncate">{settings.registeredTIN}</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-gold/15 text-gold-deep">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">{settings.companyLegalName}</div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">Exemptions</div>
              <div className="font-display text-2xl mt-1">{exemptions.length}</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-amber-50 text-amber-700">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">Certificates on file</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-black/[0.06] mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 h-9 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="text-muted-foreground/70"> ({t.count})</span>}
          </button>
        ))}
      </div>

      {tab === "rates" && (
        <>
          <Toolbar>
            <div className="relative flex-1 min-w-[220px] max-w-[380px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, region, code…"
                className="w-full h-9 pl-8 pr-3 rounded-md border border-black/10 bg-white text-[13px] outline-none focus:border-ink/40"
              />
            </div>
          </Toolbar>

          {filteredRates.length === 0 ? (
            <Card><Empty title="No tax rules match" sub="Try clearing the search." /></Card>
          ) : (
            <TableWrap>
              <table className="w-full text-[13px]">
                <thead className="bg-black/[0.02] text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-3 py-2.5 font-medium">Rule</th>
                    <th className="px-3 py-2.5 font-medium">Scope</th>
                    <th className="px-3 py-2.5 font-medium">Region</th>
                    <th className="px-3 py-2.5 font-medium text-right">Rate</th>
                    <th className="px-3 py-2.5 font-medium">Basis</th>
                    <th className="px-3 py-2.5 font-medium">Applies to</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRates.map((r) => {
                    const ScopeIcon = SCOPE_ICON[r.scope];
                    return (
                      <tr
                        key={r.id}
                        className="border-t border-black/[0.05] hover:bg-black/[0.02] cursor-pointer"
                        onClick={() => setEditingId(r.id)}
                      >
                        <td className="px-3 py-3">
                          <div className="font-medium text-ink">{r.name}</div>
                          <div className="text-[11px] text-muted-foreground font-sans">{r.code}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[12.5px]">
                            <ScopeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            {SCOPE_LABEL[r.scope]}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-sans text-[12.5px]">{r.region}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium">{r.rate}%</td>
                        <td className="px-3 py-3 capitalize text-muted-foreground">{r.basis}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {r.appliesTo.map((a) => {
                              const meta = APPLIES_META.find((m) => m.id === a)!;
                              const Icon = meta.icon;
                              return (
                                <span key={a} className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-black/10 bg-white">
                                  <Icon className="h-3 w-3" /> {meta.label}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleRate(r.id); }}
                            className="inline-flex items-center gap-1.5"
                            title={r.active ? "Disable" : "Enable"}
                          >
                            {r.active
                              ? <ToggleRight className="h-5 w-5 text-ink" />
                              : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                            <Chip tone={r.active ? "green" : "slate"}>{r.active ? "Active" : "Off"}</Chip>
                          </button>
                        </td>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <IconButton title="Delete" onClick={() => removeRate(r.id)}>
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </IconButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </>
      )}

      {tab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-display text-[16px]">{c.name}</div>
                  <div className="text-[12.5px] text-muted-foreground mt-0.5">{c.description}</div>
                </div>
                <Chip tone="slate">{c.id}</Chip>
              </div>
              <div className="mt-3">
                <div className="text-[11.5px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Region overrides
                </div>
                {c.overrides.length === 0 ? (
                  <div className="text-[12.5px] text-muted-foreground italic">Uses default rate</div>
                ) : (
                  <div className="space-y-1.5">
                    {c.overrides.map((o, i) => (
                      <div key={i} className="flex items-center justify-between text-[12.5px] px-2 py-1 rounded border border-black/[0.06] bg-black/[0.015]">
                        <span className="font-sans">{o.region}</span>
                        <input
                          type="number"
                          value={o.rate}
                          onChange={(e) => {
                            const next = [...c.overrides];
                            next[i] = { ...o, rate: Number(e.target.value) };
                            updateCategory(c.id, { overrides: next });
                          }}
                          className="w-20 h-7 px-2 rounded border border-black/10 bg-white text-right tabular-nums outline-none focus:border-ink/40"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "exemptions" && (
        <>
          {exemptions.length === 0 ? (
            <Card><Empty title="No exemptions on file" sub="Add certificates or one-off order exemptions here." /></Card>
          ) : (
            <TableWrap>
              <table className="w-full text-[13px]">
                <thead className="bg-black/[0.02] text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-3 py-2.5 font-medium">Entity</th>
                    <th className="px-3 py-2.5 font-medium">Reference</th>
                    <th className="px-3 py-2.5 font-medium">Reason</th>
                    <th className="px-3 py-2.5 font-medium">Certificate</th>
                    <th className="px-3 py-2.5 font-medium">Valid until</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {exemptions.map((e) => (
                    <tr key={e.id} className="border-t border-black/[0.05]">
                      <td className="px-3 py-3"><Chip tone={e.entity === "customer" ? "blue" : "purple"}>{e.entity}</Chip></td>
                      <td className="px-3 py-3 font-sans text-[12.5px]">{e.reference}</td>
                      <td className="px-3 py-3">{e.reason}</td>
                      <td className="px-3 py-3 font-sans text-[12px] text-muted-foreground">{e.certificateRef ?? " - "}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {e.validUntil ? new Date(e.validUntil).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No expiry"}
                      </td>
                      <td className="px-3 py-3">
                        <IconButton title="Delete" onClick={() => removeExemption(e.id)}>
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </>
      )}

      {tab === "settings" && (
        <SettingsPane
          settings={settings}
          onChange={(patch) => updateSettings(patch)}
        />
      )}

      {editing && (
        <RateEditor
          rate={editing}
          onClose={() => setEditingId(null)}
          onChange={(patch) => updateRate(editing.id, patch)}
          onDelete={() => { removeRate(editing.id); setEditingId(null); }}
        />
      )}

      {newExOpen && (
        <NewExemption
          onClose={() => setNewExOpen(false)}
          onSave={(ex) => { addExemption(ex); setNewExOpen(false); }}
        />
      )}
    </div>
  );
}

function RateEditor({
  rate, onClose, onChange, onDelete,
}: {
  rate: TaxRate;
  onClose: () => void;
  onChange: (patch: Partial<TaxRate>) => void;
  onDelete: () => void;
}) {
  const toggleApplies = (id: TaxRate["appliesTo"][number]) => {
    const has = rate.appliesTo.includes(id);
    onChange({ appliesTo: has ? rate.appliesTo.filter((x) => x !== id) : [...rate.appliesTo, id] });
  };

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-[560px] bg-[#f7f5ef] h-full overflow-y-auto border-l border-black/10">
        <div className="sticky top-0 z-10 bg-white border-b border-black/[0.06] px-5 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg">Edit tax rate</div>
            <div className="text-[12px] text-muted-foreground font-sans">{rate.id}</div>
          </div>
          <IconButton title="Close" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </div>

        <div className="p-5 space-y-4">
          <Card>
            <Field label="Name">
              <input
                value={rate.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] outline-none focus:border-ink/40"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Internal code">
                <input
                  value={rate.code}
                  onChange={(e) => onChange({ code: e.target.value })}
                  className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] font-sans outline-none focus:border-ink/40"
                />
              </Field>
              <Field label="Rate (%)">
                <input
                  type="number"
                  step={0.1}
                  value={rate.rate}
                  onChange={(e) => onChange({ rate: Number(e.target.value) })}
                  className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] tabular-nums outline-none focus:border-ink/40"
                />
              </Field>
            </div>
          </Card>

          <Card>
            <div className="text-[12px] text-muted-foreground mb-2">Geography</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Scope">
                <select
                  value={rate.scope}
                  onChange={(e) => onChange({ scope: e.target.value as TaxScope })}
                  className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px]"
                >
                  {(["country", "state", "postcode"] as TaxScope[]).map((s) => (
                    <option key={s} value={s}>{SCOPE_LABEL[s]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Region code">
                <input
                  value={rate.region}
                  onChange={(e) => onChange({ region: e.target.value })}
                  placeholder="NG · NG-LA · 100001"
                  className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] font-sans outline-none focus:border-ink/40"
                />
              </Field>
            </div>
          </Card>

          <Card>
            <div className="text-[12px] text-muted-foreground mb-2">Behaviour</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price basis">
                <select
                  value={rate.basis}
                  onChange={(e) => onChange({ basis: e.target.value as TaxBasis })}
                  className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px]"
                >
                  <option value="inclusive">Inclusive (tax in price)</option>
                  <option value="exclusive">Exclusive (added at checkout)</option>
                </select>
              </Field>
              <Field label="Status">
                <button
                  onClick={() => onChange({ active: !rate.active })}
                  className={`h-9 w-full rounded border text-[13px] font-medium ${
                    rate.active ? "bg-ink text-white border-ink" : "bg-black/[0.03] text-muted-foreground border-black/10"
                  }`}
                >
                  {rate.active ? "Active" : "Inactive"}
                </button>
              </Field>
            </div>

            <div className="mt-4">
              <div className="text-[12px] text-muted-foreground mb-1.5">Applies to</div>
              <div className="flex flex-wrap gap-2">
                {APPLIES_META.map((m) => {
                  const active = rate.appliesTo.includes(m.id);
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleApplies(m.id)}
                      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-[12.5px] ${
                        active ? "bg-ink text-white border-ink" : "bg-white border-black/10 text-ink hover:bg-black/[0.03]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <button
              onClick={onDelete}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] text-rose-700 inline-flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Delete rule
            </button>
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-md bg-ink text-white text-[13px] font-medium inline-flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewExemption({ onClose, onSave }: { onClose: () => void; onSave: (e: TaxExemption) => void }) {
  const [entity, setEntity] = useState<"customer" | "order">("customer");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [cert, setCert] = useState("");

  const submit = () => {
    if (!reference.trim() || !reason.trim()) return;
    onSave({
      id: `EX-${String(Math.floor(Math.random() * 900) + 100)}`,
      entity, reference: reference.trim(), reason: reason.trim(),
      certificateRef: cert.trim() || undefined,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-lg mb-1">New tax exemption</div>
        <p className="text-[13px] text-muted-foreground mb-3">Record a customer certificate or a one-off order exemption.</p>

        <div className="space-y-3">
          <Field label="Applies to">
            <div className="flex gap-2">
              {(["customer", "order"] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => setEntity(e)}
                  className={`flex-1 h-9 rounded border text-[13px] font-medium capitalize ${
                    entity === e ? "bg-ink text-white border-ink" : "bg-white border-black/10 text-ink"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>
          <Field label={entity === "customer" ? "Customer email" : "Order ID"}>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={entity === "customer" ? "name@example.com" : "ORD-XXXXX"}
              className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] outline-none focus:border-ink/40"
            />
          </Field>
          <Field label="Reason">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Diplomatic, re-export, non-profit…"
              className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] outline-none focus:border-ink/40"
            />
          </Field>
          <Field label="Certificate reference (optional)">
            <input
              value={cert}
              onChange={(e) => setCert(e.target.value)}
              className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] font-sans outline-none focus:border-ink/40"
            />
          </Field>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-black/10 text-[13px]">Cancel</button>
          <button onClick={submit} className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium">Save exemption</button>
        </div>
      </div>
    </div>
  );
}

function SettingsPane({
  settings, onChange,
}: {
  settings: ReturnType<typeof useTax.getState>["settings"];
  onChange: (patch: Partial<ReturnType<typeof useTax.getState>["settings"]>) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <div className="font-display text-[15px]">Display & calculation</div>
        </div>
        <Toggle
          label="Show prices tax-inclusive on storefront"
          value={settings.displayPricesIncTax}
          onChange={(v) => onChange({ displayPricesIncTax: v })}
        />
        <Toggle
          label="Charge tax on shipping"
          value={settings.chargeTaxOnShipping}
          onChange={(v) => onChange({ chargeTaxOnShipping: v })}
        />
        <Toggle
          label="Charge tax on concierge fee"
          value={settings.chargeTaxOnConcierge}
          onChange={(v) => onChange({ chargeTaxOnConcierge: v })}
        />
        <div className="mt-3">
          <Field label="Rounding">
            <div className="flex gap-2">
              {(["line", "subtotal"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => onChange({ autoRounding: r })}
                  className={`flex-1 h-9 rounded border text-[13px] capitalize ${
                    settings.autoRounding === r ? "bg-ink text-white border-ink" : "bg-white border-black/10 text-ink"
                  }`}
                >
                  {r === "line" ? "Per line item" : "On subtotal"}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
          <div className="font-display text-[15px]">Invoicing & registration</div>
        </div>
        <Field label="Legal name">
          <input
            value={settings.companyLegalName}
            onChange={(e) => onChange({ companyLegalName: e.target.value })}
            className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] outline-none focus:border-ink/40"
          />
        </Field>
        <div className="mt-3">
          <Field label="Tax ID / TIN">
            <input
              value={settings.registeredTIN}
              onChange={(e) => onChange({ registeredTIN: e.target.value })}
              className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] font-sans outline-none focus:border-ink/40"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Invoice prefix">
            <input
              value={settings.invoicePrefix}
              onChange={(e) => onChange({ invoicePrefix: e.target.value })}
              className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] font-sans outline-none focus:border-ink/40"
            />
          </Field>
          <Field label="Fiscal year starts">
            <select
              value={settings.fiscalYearStartMonth}
              onChange={(e) => onChange({ fiscalYearStartMonth: Number(e.target.value) })}
              className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px]"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2026, m - 1, 1).toLocaleString(undefined, { month: "long" })}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 p-3 rounded-md border border-amber-200 bg-amber-50 text-[12.5px] text-amber-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          Changes here regenerate all future invoices; historical PDFs are preserved.
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11.5px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between py-2 border-b border-black/[0.05] last:border-b-0"
    >
      <span className="text-[13px] text-ink text-left">{label}</span>
      {value
        ? <ToggleRight className="h-6 w-6 text-ink" />
        : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
    </button>
  );
}
