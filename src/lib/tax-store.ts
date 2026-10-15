import { create } from "zustand";
import { taxAdminApi } from "@/lib/api/fulfilment";
import { settingsAdminApi } from "@/lib/api/platform";

export type TaxScope = "country" | "state" | "postcode";
export type TaxBasis = "inclusive" | "exclusive";

export type TaxRate = {
  id: string;
  name: string;
  scope: TaxScope;
  region: string;
  rate: number;
  basis: TaxBasis;
  appliesTo: ("products" | "shipping" | "concierge_fee")[];
  code: string;
  active: boolean;
  createdAt: number;
};

export type TaxCategory = {
  id: string;
  name: string;
  description: string;
  overrides: { region: string; rate: number }[];
};

export type TaxExemption = {
  id: string;
  entity: "customer" | "order";
  reference: string;
  reason: string;
  certificateRef?: string;
  validUntil?: number;
  createdAt: number;
};

export type TaxSettings = {
  displayPricesIncTax: boolean;
  chargeTaxOnShipping: boolean;
  chargeTaxOnConcierge: boolean;
  registeredTIN: string;
  companyLegalName: string;
  invoicePrefix: string;
  fiscalYearStartMonth: number;
  autoRounding: "line" | "subtotal";
};

const DEFAULT_SETTINGS: TaxSettings = {
  displayPricesIncTax: true,
  chargeTaxOnShipping: true,
  chargeTaxOnConcierge: true,
  registeredTIN: "",
  companyLegalName: "ASL ORIGINALS Ltd",
  invoicePrefix: "ASL-INV-",
  fiscalYearStartMonth: 1,
  autoRounding: "line",
};

function mapRate(r: Record<string, unknown>): TaxRate {
  const applies = Array.isArray(r.appliesTo)
    ? (r.appliesTo as TaxRate["appliesTo"])
    : (["products"] as TaxRate["appliesTo"]);
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    scope: (r.scope as TaxScope) || "country",
    region: String(r.region ?? ""),
    rate: Number(r.rate ?? 0),
    basis: (r.basis as TaxBasis) || "inclusive",
    appliesTo: applies,
    code: String(r.code ?? ""),
    active: r.active !== false,
    createdAt: r.createdAt ? new Date(r.createdAt as string).getTime() : Date.now(),
  };
}

function mapCategory(c: Record<string, unknown>): TaxCategory {
  const overrides = Array.isArray(c.overrides)
    ? (c.overrides as { region: string; rate: number }[]).map((o) => ({
        region: String(o.region),
        rate: Number(o.rate),
      }))
    : [];
  return {
    id: String(c.id),
    name: String(c.name ?? ""),
    description: String(c.description ?? ""),
    overrides,
  };
}

function mapExemption(e: Record<string, unknown>): TaxExemption {
  return {
    id: String(e.id),
    entity: (e.entity as TaxExemption["entity"]) || "customer",
    reference: String(e.reference ?? ""),
    reason: String(e.reason ?? ""),
    certificateRef: e.certificateRef ? String(e.certificateRef) : undefined,
    validUntil: e.validUntil ? new Date(e.validUntil as string).getTime() : undefined,
    createdAt: e.createdAt ? new Date(e.createdAt as string).getTime() : Date.now(),
  };
}

function mapSettings(s: Record<string, unknown> | null | undefined): TaxSettings {
  if (!s) return { ...DEFAULT_SETTINGS };
  return {
    displayPricesIncTax: s.displayPricesIncTax !== false,
    chargeTaxOnShipping: s.chargeTaxOnShipping !== false,
    chargeTaxOnConcierge: !!s.chargeTaxOnConcierge,
    registeredTIN: String(s.registeredTIN ?? ""),
    companyLegalName: String(s.companyLegalName ?? DEFAULT_SETTINGS.companyLegalName),
    invoicePrefix: String(s.invoicePrefix ?? DEFAULT_SETTINGS.invoicePrefix),
    fiscalYearStartMonth: Number(s.fiscalYearStartMonth ?? 1),
    autoRounding: s.autoRounding === "subtotal" ? "subtotal" : "line",
  };
}

function rateBody(r: Partial<TaxRate>) {
  return {
    name: r.name,
    scope: r.scope,
    region: r.region,
    rate: r.rate,
    basis: r.basis,
    appliesTo: r.appliesTo,
    code: r.code,
    active: r.active,
  };
}

type State = {
  rates: TaxRate[];
  categories: TaxCategory[];
  exemptions: TaxExemption[];
  settings: TaxSettings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addRate: (r: TaxRate) => Promise<TaxRate>;
  updateRate: (id: string, patch: Partial<TaxRate>) => Promise<void>;
  removeRate: (id: string) => Promise<void>;
  toggleRate: (id: string) => Promise<void>;
  addExemption: (e: TaxExemption) => Promise<void>;
  removeExemption: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<TaxSettings>) => Promise<void>;
  updateCategory: (id: string, patch: Partial<TaxCategory>) => Promise<void>;
};

export const useTax = create<State>()((set, get) => ({
  rates: [],
  categories: [],
  exemptions: [],
  settings: { ...DEFAULT_SETTINGS },
  hydrated: false,
  hydrate: async () => {
    try {
      const overview = (await taxAdminApi.overview()) as Record<string, unknown>;
      set({
        rates: Array.isArray(overview.rates)
          ? (overview.rates as Record<string, unknown>[]).map(mapRate)
          : [],
        categories: Array.isArray(overview.categories)
          ? (overview.categories as Record<string, unknown>[]).map(mapCategory)
          : [],
        exemptions: Array.isArray(overview.exemptions)
          ? (overview.exemptions as Record<string, unknown>[]).map(mapExemption)
          : [],
        settings: mapSettings(overview.settings as Record<string, unknown> | undefined),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[tax] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  addRate: async (r) => {
    try {
      const created = mapRate(
        (await taxAdminApi.createRate(rateBody({ ...r, active: r.active ?? false }))) as Record<
          string,
          unknown
        >,
      );
      set((st) => ({ rates: [created, ...st.rates] }));
      return created;
    } catch (err) {
      console.warn("[tax] addRate", err);
      await get().hydrate();
      return r;
    }
  },
  updateRate: async (id, patch) => {
    set((st) => ({ rates: st.rates.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    try {
      const updated = mapRate(
        (await taxAdminApi.updateRate(id, rateBody(patch))) as Record<string, unknown>,
      );
      set((st) => ({ rates: st.rates.map((r) => (r.id === id ? updated : r)) }));
    } catch (err) {
      console.warn("[tax] updateRate", err);
      await get().hydrate();
    }
  },
  removeRate: async (id) => {
    set((st) => ({ rates: st.rates.filter((r) => r.id !== id) }));
    try {
      await taxAdminApi.removeRate(id);
    } catch (err) {
      console.warn("[tax] removeRate", err);
      await get().hydrate();
    }
  },
  toggleRate: async (id) => {
    set((st) => ({
      rates: st.rates.map((r) => (r.id === id ? { ...r, active: !r.active } : r)),
    }));
    try {
      const updated = mapRate((await taxAdminApi.toggleRate(id)) as Record<string, unknown>);
      set((st) => ({ rates: st.rates.map((r) => (r.id === id ? updated : r)) }));
    } catch (err) {
      console.warn("[tax] toggleRate", err);
      await get().hydrate();
    }
  },
  addExemption: async (e) => {
    try {
      const created = mapExemption(
        (await taxAdminApi.addExemption({
          entity: e.entity,
          reference: e.reference,
          reason: e.reason,
          certificateRef: e.certificateRef ?? null,
          validUntil: e.validUntil ? new Date(e.validUntil).toISOString() : null,
        })) as Record<string, unknown>,
      );
      set((st) => ({ exemptions: [created, ...st.exemptions] }));
    } catch (err) {
      console.warn("[tax] addExemption", err);
      await get().hydrate();
    }
  },
  removeExemption: async (id) => {
    set((st) => ({ exemptions: st.exemptions.filter((e) => e.id !== id) }));
    try {
      await taxAdminApi.removeExemption(id);
    } catch (err) {
      console.warn("[tax] removeExemption", err);
      await get().hydrate();
    }
  },
  updateSettings: async (patch) => {
    set((st) => ({ settings: { ...st.settings, ...patch } }));
    try {
      await settingsAdminApi.updateGroup("tax", patch as Record<string, unknown>);
    } catch (err) {
      console.warn("[tax] updateSettings", err);
      await get().hydrate();
    }
  },
  updateCategory: async (id, patch) => {
    set((st) => ({
      categories: st.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    try {
      const body: Record<string, unknown> = {};
      if (patch.name !== undefined) body.name = patch.name;
      if (patch.description !== undefined) body.description = patch.description;
      if (patch.overrides !== undefined) body.overrides = patch.overrides;
      const updated = mapCategory(
        (await taxAdminApi.updateCategory(id, body)) as Record<string, unknown>,
      );
      set((st) => ({ categories: st.categories.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[tax] updateCategory", err);
      await get().hydrate();
    }
  },
}));

export const SCOPE_LABEL: Record<TaxScope, string> = {
  country: "Country",
  state: "State / region",
  postcode: "Postcode",
};

export function collectedThisMonth(rates: TaxRate[]): number {
  const active = rates.filter((r) => r.active);
  const base = 42_500_000;
  return Math.round(
    active.reduce(
      (sum, r) => sum + base * (r.rate / 100) * (r.scope === "country" ? 0.9 : 0.1),
      0,
    ),
  );
}
