import { useEffect, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip } from "./ui";
import { useSettings } from "@/lib/settings-store";
import {
  Store, Palette, CreditCard, Globe, Languages, ShoppingCart, ScrollText,
  Wrench, Check, Star, TestTube, RefreshCw, Save,
} from "lucide-react";
import { toast } from "sonner";

type TabId = "profile" | "brand" | "checkout" | "payments" | "locales" | "currencies" | "legal" | "maintenance";

const TABS: { id: TabId; label: string; icon: typeof Store }[] = [
  { id: "profile", label: "Store profile", icon: Store },
  { id: "brand", label: "Brand & theme", icon: Palette },
  { id: "checkout", label: "Checkout", icon: ShoppingCart },
  { id: "payments", label: "Payment methods", icon: CreditCard },
  { id: "locales", label: "Languages", icon: Languages },
  { id: "currencies", label: "Currencies", icon: Globe },
  { id: "legal", label: "Legal & policies", icon: ScrollText },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
];

export function AdminSettings() {
  const [tab, setTab] = useState<TabId>("profile");
  const s = useSettings();
  const hydrate = useSettings((st) => st.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Store settings"
        subtitle="Global configuration for ASL ORIGINALS - profile, branding, checkout, payments, locales and legal."
        actions={
          <button
            onClick={() => toast.success("All settings saved")}
            className="h-9 px-4 rounded-md bg-ink text-white text-[13px] font-medium inline-flex items-center gap-2"
          >
            <Save className="h-4 w-4" /> Save changes
          </button>
        }
      />

      <div className="grid grid-cols-[240px_1fr] gap-6">
        <Card padded={false} className="h-fit sticky top-4">
          <nav className="p-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-left transition-colors ${
                    active ? "bg-ink text-white" : "text-ink hover:bg-black/[0.04]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </Card>

        <div className="min-w-0">
          {tab === "profile" && <ProfileTab />}
          {tab === "brand" && <BrandTab />}
          {tab === "checkout" && <CheckoutTab />}
          {tab === "payments" && <PaymentsTab />}
          {tab === "locales" && <LocalesTab />}
          {tab === "currencies" && <CurrenciesTab />}
          {tab === "legal" && <LegalTab />}
          {tab === "maintenance" && <MaintenanceTab />}
        </div>
      </div>
    </div>
  );

  function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
      <label className="block">
        <div className="text-[12px] font-medium text-ink mb-1.5">{label}</div>
        {children}
        {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
      </label>
    );
  }

  function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
      <input
        {...props}
        className={`w-full h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] focus:outline-none focus:border-ink ${props.className ?? ""}`}
      />
    );
  }

  function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
      <textarea
        {...props}
        className={`w-full px-3 py-2 rounded-md border border-black/10 bg-white text-[13px] focus:outline-none focus:border-ink ${props.className ?? ""}`}
      />
    );
  }

  function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: () => void; label: string; hint?: string }) {
    return (
      <div className="flex items-start justify-between gap-4 py-3 border-b border-black/[0.06] last:border-0">
        <div>
          <div className="text-[13px] font-medium text-ink">{label}</div>
          {hint && <div className="text-[12px] text-muted-foreground mt-0.5">{hint}</div>}
        </div>
        <button
          onClick={onChange}
          className={`shrink-0 w-10 h-6 rounded-full transition-colors relative ${on ? "bg-ink" : "bg-black/15"}`}
        >
          <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-4" : ""}`} />
        </button>
      </div>
    );
  }

  function ProfileTab() {
    const p = s.profile;
    return (
      <Card>
        <SectionTitle title="Store profile" sub="Public-facing store information and contact channels." />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Legal name"><Input value={p.legalName} onChange={(e) => s.updateProfile({ legalName: e.target.value })} /></Field>
          <Field label="Display name"><Input value={p.displayName} onChange={(e) => s.updateProfile({ displayName: e.target.value })} /></Field>
          <Field label="Support email"><Input type="email" value={p.supportEmail} onChange={(e) => s.updateProfile({ supportEmail: e.target.value })} /></Field>
          <Field label="Support phone"><Input value={p.supportPhone} onChange={(e) => s.updateProfile({ supportPhone: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input value={p.whatsapp} onChange={(e) => s.updateProfile({ whatsapp: e.target.value })} /></Field>
          <Field label="Address"><Input value={p.address} onChange={(e) => s.updateProfile({ address: e.target.value })} /></Field>
          <Field label="City"><Input value={p.city} onChange={(e) => s.updateProfile({ city: e.target.value })} /></Field>
          <Field label="Country"><Input value={p.country} onChange={(e) => s.updateProfile({ country: e.target.value })} /></Field>
          <Field label="Timezone"><Input value={p.timezone} onChange={(e) => s.updateProfile({ timezone: e.target.value })} /></Field>
          <Field label="Weight unit">
            <select
              value={p.weightUnit}
              onChange={(e) => s.updateProfile({ weightUnit: e.target.value as "kg" | "lb" })}
              className="w-full h-9 px-3 rounded-md border border-black/10 bg-white text-[13px]"
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="lb">Pounds (lb)</option>
            </select>
          </Field>
        </div>
      </Card>
    );
  }

  function BrandTab() {
    const b = s.brand;
    return (
      <div className="space-y-4">
        <Card>
          <SectionTitle title="Brand & theme" sub="Colors, typography and radius applied across the storefront." />
          <div className="grid grid-cols-2 gap-4">
            {(["primary", "accent", "ink", "bg"] as const).map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={b[k]}
                    onChange={(e) => s.updateBrand({ [k]: e.target.value } as never)}
                    className="h-9 w-12 rounded-md border border-black/10 cursor-pointer"
                  />
                  <Input value={b[k]} onChange={(e) => s.updateBrand({ [k]: e.target.value } as never)} />
                </div>
              </Field>
            ))}
            <Field label="Corner radius">
              <input
                type="range" min={0} max={24} value={b.radius}
                onChange={(e) => s.updateBrand({ radius: Number(e.target.value) })}
                className="w-full"
              />
              <div className="text-[11px] text-muted-foreground mt-1">{b.radius}px</div>
            </Field>
            <Field label="Display font"><Input value={b.fontDisplay} onChange={(e) => s.updateBrand({ fontDisplay: e.target.value })} /></Field>
            <Field label="Body font"><Input value={b.fontBody} onChange={(e) => s.updateBrand({ fontBody: e.target.value })} /></Field>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Preview" />
          <div className="rounded-xl p-6 border border-black/[0.06]" style={{ background: b.bg }}>
            <div className="font-display text-2xl" style={{ color: b.ink, fontFamily: b.fontDisplay }}>ASL ORIGINALS</div>
            <div className="text-[13px] mt-1" style={{ color: b.ink, opacity: 0.7 }}>Luxury, sourced with care.</div>
            <div className="flex gap-2 mt-4">
              <button className="h-9 px-4 text-[13px] text-white" style={{ background: b.primary, borderRadius: b.radius }}>Shop now</button>
              <button className="h-9 px-4 text-[13px]" style={{ background: b.accent, color: b.ink, borderRadius: b.radius }}>Concierge</button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  function CheckoutTab() {
    const c = s.checkout;
    return (
      <div className="space-y-4">
        <Card>
          <SectionTitle title="Checkout behaviour" />
          <Toggle on={c.guestCheckout} onChange={() => s.updateCheckout({ guestCheckout: !c.guestCheckout })}
            label="Allow guest checkout" hint="Customers can pay without creating an account." />
          <Toggle on={c.requirePhone} onChange={() => s.updateCheckout({ requirePhone: !c.requirePhone })}
            label="Require phone number" hint="Enforce phone capture for delivery coordination." />
          <Toggle on={c.askGiftMessage} onChange={() => s.updateCheckout({ askGiftMessage: !c.askGiftMessage })}
            label="Ask for gift message" hint="Optional gift note during checkout." />
          <Toggle on={c.autoApplyBestCoupon} onChange={() => s.updateCheckout({ autoApplyBestCoupon: !c.autoApplyBestCoupon })}
            label="Auto-apply best coupon" hint="Pick the highest-value valid coupon for the cart." />
          <Toggle on={c.taxesIncluded} onChange={() => s.updateCheckout({ taxesIncluded: !c.taxesIncluded })}
            label="Prices include tax" hint="Tax is shown as included in product prices." />
        </Card>
        <Card>
          <SectionTitle title="Limits" />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Minimum order (₦)"><Input type="number" value={c.minOrderValue} onChange={(e) => s.updateCheckout({ minOrderValue: Number(e.target.value) })} /></Field>
            <Field label="Maximum order (₦)"><Input type="number" value={c.maxOrderValue} onChange={(e) => s.updateCheckout({ maxOrderValue: Number(e.target.value) })} /></Field>
            <Field label="Abandonment timeout (min)" hint="Time before an unpaid cart is flagged abandoned.">
              <Input type="number" value={c.abandonMinutes} onChange={(e) => s.updateCheckout({ abandonMinutes: Number(e.target.value) })} />
            </Field>
          </div>
        </Card>
      </div>
    );
  }

  function PaymentsTab() {
    return (
      <Card padded={false}>
        <div className="p-5 border-b border-black/[0.06]">
          <SectionTitle title="Payment methods" sub="Enable providers and switch between live and test mode." />
        </div>
        <div className="divide-y divide-black/[0.06]">
          {s.paymentMethods.map((m) => (
            <div key={m.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-black/[0.04] grid place-items-center">
                  <CreditCard className="h-5 w-5 text-ink" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink flex items-center gap-2">
                    {m.label}
                    {m.testMode && m.enabled && <Chip tone="amber"><TestTube className="h-3 w-3" /> Test</Chip>}
                    {m.enabled ? <Chip tone="green">Enabled</Chip> : <Chip tone="slate">Disabled</Chip>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{m.provider} · Fee {m.fee}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => s.togglePayment(m.id, "testMode")}
                  className="h-8 px-3 text-[12px] rounded-md border border-black/10 hover:bg-black/[0.04]"
                >
                  {m.testMode ? "Go live" : "Test mode"}
                </button>
                <button
                  onClick={() => s.togglePayment(m.id, "enabled")}
                  className={`h-8 px-3 text-[12px] rounded-md ${m.enabled ? "bg-black/[0.04] text-ink" : "bg-ink text-white"}`}
                >
                  {m.enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  function LocalesTab() {
    return (
      <Card padded={false}>
        <div className="p-5 border-b border-black/[0.06]">
          <SectionTitle title="Languages" sub="Enable locales and choose the default storefront language." />
        </div>
        <div className="divide-y divide-black/[0.06]">
          {s.locales.map((l) => (
            <div key={l.code} className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-ink flex items-center gap-2">
                  {l.label}
                  {l.default && <Chip tone="gold"><Star className="h-3 w-3" /> Default</Chip>}
                </div>
                <div className="text-[11px] text-muted-foreground">{l.code}</div>
              </div>
              <div className="flex items-center gap-2">
                {!l.default && (
                  <button
                    onClick={() => s.setDefaultLocale(l.code)}
                    className="h-8 px-3 text-[12px] rounded-md border border-black/10 hover:bg-black/[0.04]"
                  >
                    Make default
                  </button>
                )}
                <button
                  onClick={() => !l.default && s.toggleLocale(l.code)}
                  disabled={l.default}
                  className={`h-8 px-3 text-[12px] rounded-md disabled:opacity-40 ${l.enabled ? "bg-black/[0.04] text-ink" : "bg-ink text-white"}`}
                >
                  {l.enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  function CurrenciesTab() {
    return (
      <Card padded={false}>
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between">
          <SectionTitle title="Currencies" sub="Manage accepted currencies and FX conversion rates from the base." />
          <button
            onClick={() => toast.success("FX rates refreshed")}
            className="h-8 px-3 text-[12px] rounded-md border border-black/10 hover:bg-black/[0.04] inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh rates
          </button>
        </div>
        <table className="w-full text-[13px]">
          <thead className="bg-black/[0.02] text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-2 font-medium">Currency</th>
              <th className="text-left px-5 py-2 font-medium">Code</th>
              <th className="text-left px-5 py-2 font-medium">Rate (from base)</th>
              <th className="text-left px-5 py-2 font-medium">Status</th>
              <th className="text-right px-5 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {s.currencies.map((c) => (
              <tr key={c.code}>
                <td className="px-5 py-3 font-medium text-ink">{c.label}</td>
                <td className="px-5 py-3 text-muted-foreground">{c.code}</td>
                <td className="px-5 py-3">
                  {c.default ? (
                    <Chip tone="gold"><Star className="h-3 w-3" /> Base</Chip>
                  ) : (
                    <input
                      type="number" step="0.0001" value={c.rate}
                      onChange={(e) => s.updateCurrencyRate(c.code, Number(e.target.value))}
                      className="w-28 h-8 px-2 rounded-md border border-black/10 text-[12px]"
                    />
                  )}
                </td>
                <td className="px-5 py-3">
                  {c.enabled ? <Chip tone="green"><Check className="h-3 w-3" /> Enabled</Chip> : <Chip tone="slate">Disabled</Chip>}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex gap-2">
                    {!c.default && (
                      <button
                        onClick={() => s.setDefaultCurrency(c.code)}
                        className="h-7 px-2 text-[11px] rounded-md border border-black/10 hover:bg-black/[0.04]"
                      >
                        Set base
                      </button>
                    )}
                    <button
                      onClick={() => !c.default && s.toggleCurrency(c.code)}
                      disabled={c.default}
                      className="h-7 px-2 text-[11px] rounded-md border border-black/10 hover:bg-black/[0.04] disabled:opacity-40"
                    >
                      {c.enabled ? "Disable" : "Enable"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  function LegalTab() {
    const l = s.legal;
    return (
      <div className="space-y-4">
        <Card>
          <SectionTitle title="Registrations" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="VAT number"><Input value={l.vatNumber} onChange={(e) => s.updateLegal({ vatNumber: e.target.value })} /></Field>
            <Field label="Company registration"><Input value={l.rcNumber} onChange={(e) => s.updateLegal({ rcNumber: e.target.value })} /></Field>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Policies" sub="Shown on storefront and included with order confirmations." />
          <div className="space-y-4">
            <Field label="Terms of service"><Textarea rows={3} value={l.terms} onChange={(e) => s.updateLegal({ terms: e.target.value })} /></Field>
            <Field label="Privacy policy"><Textarea rows={3} value={l.privacy} onChange={(e) => s.updateLegal({ privacy: e.target.value })} /></Field>
            <Field label="Refund policy"><Textarea rows={3} value={l.refund} onChange={(e) => s.updateLegal({ refund: e.target.value })} /></Field>
            <Field label="Shipping policy"><Textarea rows={3} value={l.shipping} onChange={(e) => s.updateLegal({ shipping: e.target.value })} /></Field>
            <Field label="Cookie policy"><Textarea rows={3} value={l.cookies} onChange={(e) => s.updateLegal({ cookies: e.target.value })} /></Field>
          </div>
        </Card>
      </div>
    );
  }

  function MaintenanceTab() {
    return (
      <Card>
        <SectionTitle title="Maintenance mode" sub="Take the storefront offline while keeping the admin available." />
        <Toggle
          on={s.maintenanceMode}
          onChange={() => s.setMaintenance(!s.maintenanceMode)}
          label="Enable maintenance mode"
          hint="Customers see the message below on every storefront route. Admin remains accessible."
        />
        <Field label="Message shown to customers">
          <Textarea
            rows={4} value={s.maintenanceMessage}
            onChange={(e) => s.setMaintenance(s.maintenanceMode, e.target.value)}
          />
        </Field>
        {s.maintenanceMode && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-800">
            Storefront is currently offline for customers.
          </div>
        )}
      </Card>
    );
  }
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="font-display text-[16px] text-ink">{title}</div>
      {sub && <div className="text-[12px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
