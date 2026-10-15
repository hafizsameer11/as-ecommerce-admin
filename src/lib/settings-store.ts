import { create } from "zustand";
import { settingsAdminApi } from "@/lib/api/platform";
import { koboToNaira, nairaToKobo } from "@/lib/api/client";

export type StoreProfile = {
  legalName: string;
  displayName: string;
  supportEmail: string;
  supportPhone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  currency: string;
  weightUnit: "kg" | "lb";
  logoUrl: string;
  faviconUrl: string;
};

export type Brand = {
  primary: string;
  accent: string;
  ink: string;
  bg: string;
  radius: number;
  fontDisplay: string;
  fontBody: string;
};

export type Checkout = {
  guestCheckout: boolean;
  requirePhone: boolean;
  askGiftMessage: boolean;
  autoApplyBestCoupon: boolean;
  minOrderValue: number;
  maxOrderValue: number;
  abandonMinutes: number;
  taxesIncluded: boolean;
};

export type PaymentMethod = {
  id: string;
  label: string;
  provider: "Paystack" | "Flutterwave" | "Stripe" | "Wallet" | "Bank Transfer" | "Cash on Delivery";
  enabled: boolean;
  testMode: boolean;
  fee: string;
};

export type Locale = { code: string; label: string; enabled: boolean; default?: boolean };
export type CurrencyRate = { code: string; label: string; rate: number; enabled: boolean; default?: boolean };

export type Legal = {
  terms: string;
  privacy: string;
  refund: string;
  shipping: string;
  cookies: string;
  vatNumber: string;
  rcNumber: string;
};

const PROVIDERS: PaymentMethod["provider"][] = [
  "Paystack", "Flutterwave", "Stripe", "Wallet", "Bank Transfer", "Cash on Delivery",
];

const emptyProfile: StoreProfile = {
  legalName: "", displayName: "", supportEmail: "", supportPhone: "", whatsapp: "",
  address: "", city: "", country: "", timezone: "Africa/Lagos", currency: "NGN",
  weightUnit: "kg", logoUrl: "", faviconUrl: "",
};

const emptyBrand: Brand = {
  primary: "#0f0f0f", accent: "#c9a24a", ink: "#0f0f0f", bg: "#f7f5ef",
  radius: 12, fontDisplay: "Inter Tight", fontBody: "Inter Tight",
};

const emptyCheckout: Checkout = {
  guestCheckout: true, requirePhone: true, askGiftMessage: true, autoApplyBestCoupon: false,
  minOrderValue: 0, maxOrderValue: 0, abandonMinutes: 45, taxesIncluded: false,
};

const emptyLegal: Legal = {
  terms: "", privacy: "", refund: "", shipping: "", cookies: "", vatNumber: "", rcNumber: "",
};

function mapProfile(p: Record<string, unknown> | undefined): StoreProfile {
  if (!p) return { ...emptyProfile };
  return {
    legalName: String(p.legalName ?? ""),
    displayName: String(p.displayName ?? ""),
    supportEmail: String(p.supportEmail ?? ""),
    supportPhone: String(p.supportPhone ?? ""),
    whatsapp: String(p.whatsapp ?? ""),
    address: String(p.address ?? ""),
    city: String(p.city ?? ""),
    country: String(p.country ?? ""),
    timezone: String(p.timezone ?? "Africa/Lagos"),
    currency: String(p.currency ?? "NGN"),
    weightUnit: p.weightUnit === "lb" ? "lb" : "kg",
    logoUrl: String(p.logoUrl ?? ""),
    faviconUrl: String(p.faviconUrl ?? ""),
  };
}

function mapBrand(b: Record<string, unknown> | undefined): Brand {
  if (!b) return { ...emptyBrand };
  return {
    primary: String(b.primary ?? emptyBrand.primary),
    accent: String(b.accent ?? emptyBrand.accent),
    ink: String(b.ink ?? emptyBrand.ink),
    bg: String(b.bg ?? emptyBrand.bg),
    radius: Number(b.radius ?? emptyBrand.radius),
    fontDisplay: String(b.fontDisplay ?? emptyBrand.fontDisplay),
    fontBody: String(b.fontBody ?? emptyBrand.fontBody),
  };
}

function mapCheckout(c: Record<string, unknown> | undefined): Checkout {
  if (!c) return { ...emptyCheckout };
  return {
    guestCheckout: !!c.guestCheckout,
    requirePhone: !!c.requirePhone,
    askGiftMessage: !!c.askGiftMessage,
    autoApplyBestCoupon: !!c.autoApplyBestCoupon,
    minOrderValue: koboToNaira(Number(c.minOrderValue ?? 0)),
    maxOrderValue: koboToNaira(Number(c.maxOrderValue ?? 0)),
    abandonMinutes: Number(c.abandonMinutes ?? 45),
    taxesIncluded: !!c.taxesIncluded,
  };
}

function mapPayment(m: Record<string, unknown>): PaymentMethod {
  const provider = PROVIDERS.includes(m.provider as PaymentMethod["provider"])
    ? (m.provider as PaymentMethod["provider"])
    : "Paystack";
  return {
    id: String(m.id),
    label: String(m.label ?? ""),
    provider,
    enabled: !!m.enabled,
    testMode: !!m.testMode,
    fee: String(m.fee ?? m.feeLabel ?? ""),
  };
}

function mapLocale(l: Record<string, unknown>): Locale {
  return {
    code: String(l.code),
    label: String(l.label ?? l.code),
    enabled: !!l.enabled,
    default: !!(l.default ?? l.isDefault),
  };
}

function mapCurrency(c: Record<string, unknown>): CurrencyRate {
  const rate = c.rate != null
    ? Number(c.rate)
    : c.rateX10000 != null
      ? Number(c.rateX10000) / 10000
      : 0;
  return {
    code: String(c.code),
    label: String(c.label ?? c.code),
    rate,
    enabled: !!c.enabled,
    default: !!(c.default ?? c.isDefault),
  };
}

function mapLegal(l: Record<string, unknown> | undefined, prev?: Legal): Legal {
  return {
    ...(prev ?? emptyLegal),
    vatNumber: String(l?.vatNumber ?? prev?.vatNumber ?? ""),
    rcNumber: String(l?.rcNumber ?? prev?.rcNumber ?? ""),
  };
}

type State = {
  profile: StoreProfile;
  brand: Brand;
  checkout: Checkout;
  paymentMethods: PaymentMethod[];
  locales: Locale[];
  currencies: CurrencyRate[];
  legal: Legal;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;

  updateProfile: (p: Partial<StoreProfile>) => void;
  updateBrand: (b: Partial<Brand>) => void;
  updateCheckout: (c: Partial<Checkout>) => void;
  togglePayment: (id: string, key: "enabled" | "testMode") => void;
  toggleLocale: (code: string) => void;
  setDefaultLocale: (code: string) => void;
  toggleCurrency: (code: string) => void;
  setDefaultCurrency: (code: string) => void;
  updateCurrencyRate: (code: string, rate: number) => void;
  updateLegal: (l: Partial<Legal>) => void;
  setMaintenance: (on: boolean, message?: string) => void;
};

function warn(op: string, err: unknown) {
  console.warn(`[settings] ${op} failed`, err);
}

export const useSettings = create<State>()((set, get) => ({
  profile: { ...emptyProfile },
  brand: { ...emptyBrand },
  checkout: { ...emptyCheckout },
  paymentMethods: [],
  locales: [],
  currencies: [],
  legal: { ...emptyLegal },
  maintenanceMode: false,
  maintenanceMessage: "We're refreshing the store. Back in a moment.",
  hydrated: false,

  hydrate: async () => {
    try {
      const all = (await settingsAdminApi.all()) as Record<string, unknown>;
      const maintenance = (all.maintenance ?? {}) as Record<string, unknown>;
      set({
        profile: mapProfile(all.profile as Record<string, unknown>),
        brand: mapBrand(all.brand as Record<string, unknown>),
        checkout: mapCheckout(all.checkout as Record<string, unknown>),
        paymentMethods: Array.isArray(all.paymentMethods)
          ? (all.paymentMethods as Record<string, unknown>[]).map(mapPayment)
          : [],
        locales: Array.isArray(all.locales)
          ? (all.locales as Record<string, unknown>[]).map(mapLocale)
          : [],
        currencies: Array.isArray(all.currencies)
          ? (all.currencies as Record<string, unknown>[]).map(mapCurrency)
          : [],
        legal: mapLegal(all.legal as Record<string, unknown>, get().legal),
        maintenanceMode: !!maintenance.enabled,
        maintenanceMessage: String(maintenance.message ?? get().maintenanceMessage),
        hydrated: true,
      });
    } catch (err) {
      warn("hydrate", err);
      set({ hydrated: true });
    }
  },

  updateProfile: (p) => {
    set({ profile: { ...get().profile, ...p } });
    void settingsAdminApi.updateGroup("profile", p as Record<string, unknown>).catch((e) => warn("updateProfile", e));
  },

  updateBrand: (b) => {
    set({ brand: { ...get().brand, ...b } });
    void settingsAdminApi.updateGroup("brand", b as Record<string, unknown>).catch((e) => warn("updateBrand", e));
  },

  updateCheckout: (c) => {
    set({ checkout: { ...get().checkout, ...c } });
    const body: Record<string, unknown> = { ...c };
    if (c.minOrderValue !== undefined) body.minOrderValue = nairaToKobo(c.minOrderValue);
    if (c.maxOrderValue !== undefined) body.maxOrderValue = nairaToKobo(c.maxOrderValue);
    void settingsAdminApi.updateGroup("checkout", body).catch((e) => warn("updateCheckout", e));
  },

  togglePayment: (id, key) => {
    set({
      paymentMethods: get().paymentMethods.map((m) =>
        m.id === id ? { ...m, [key]: !m[key] } : m,
      ),
    });
    void settingsAdminApi.togglePayment(id, { key }).then((updated) => {
      const mapped = mapPayment(updated as Record<string, unknown>);
      set({
        paymentMethods: get().paymentMethods.map((m) => (m.id === id ? mapped : m)),
      });
    }).catch((e) => {
      warn("togglePayment", e);
      void get().hydrate();
    });
  },

  toggleLocale: (code) => {
    set({ locales: get().locales.map((l) => (l.code === code ? { ...l, enabled: !l.enabled } : l)) });
    void settingsAdminApi.toggleLocale(code).then((row) => {
      const mapped = mapLocale(row as Record<string, unknown>);
      set({ locales: get().locales.map((l) => (l.code === code ? mapped : l)) });
    }).catch((e) => {
      warn("toggleLocale", e);
      void get().hydrate();
    });
  },

  setDefaultLocale: (code) => {
    set({
      locales: get().locales.map((l) => ({
        ...l, default: l.code === code, enabled: l.code === code ? true : l.enabled,
      })),
    });
    void settingsAdminApi.defaultLocale(code).then((rows) => {
      if (Array.isArray(rows)) {
        set({ locales: (rows as Record<string, unknown>[]).map(mapLocale) });
      }
    }).catch((e) => {
      warn("setDefaultLocale", e);
      void get().hydrate();
    });
  },

  toggleCurrency: (code) => {
    set({ currencies: get().currencies.map((c) => (c.code === code ? { ...c, enabled: !c.enabled } : c)) });
    void settingsAdminApi.toggleCurrency(code).then((row) => {
      const mapped = mapCurrency(row as Record<string, unknown>);
      set({ currencies: get().currencies.map((c) => (c.code === code ? { ...c, ...mapped } : c)) });
    }).catch((e) => {
      warn("toggleCurrency", e);
      void get().hydrate();
    });
  },

  setDefaultCurrency: (code) => {
    set({
      currencies: get().currencies.map((c) => ({
        ...c,
        default: c.code === code,
        enabled: c.code === code ? true : c.enabled,
        rate: c.code === code ? 1 : c.rate,
      })),
    });
    void settingsAdminApi.defaultCurrency(code).then((rows) => {
      if (Array.isArray(rows)) {
        set({ currencies: (rows as Record<string, unknown>[]).map(mapCurrency) });
      }
    }).catch((e) => {
      warn("setDefaultCurrency", e);
      void get().hydrate();
    });
  },

  updateCurrencyRate: (code, rate) => {
    set({ currencies: get().currencies.map((c) => (c.code === code ? { ...c, rate } : c)) });
    void settingsAdminApi.setRate(code, rate).catch((e) => {
      warn("updateCurrencyRate", e);
      void get().hydrate();
    });
  },

  updateLegal: (l) => {
    set({ legal: { ...get().legal, ...l } });
    const body: Record<string, unknown> = {};
    if (l.vatNumber !== undefined) body.vatNumber = l.vatNumber;
    if (l.rcNumber !== undefined) body.rcNumber = l.rcNumber;
    if (Object.keys(body).length) {
      void settingsAdminApi.updateGroup("legal", body).catch((e) => warn("updateLegal", e));
    }
  },

  setMaintenance: (on, message) => {
    const maintenanceMessage = message ?? get().maintenanceMessage;
    set({ maintenanceMode: on, maintenanceMessage });
    void settingsAdminApi
      .updateGroup("maintenance", { enabled: on, message: maintenanceMessage })
      .catch((e) => warn("setMaintenance", e));
  },
}));
