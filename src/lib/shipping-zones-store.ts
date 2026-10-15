import { create } from "zustand";
import { shippingZonesAdminApi } from "@/lib/api/fulfilment";
import { koboToNaira, nairaToKobo } from "@/lib/api/client";

export type ZoneRate = {
  id: string;
  name: string;
  carrier: "DHL" | "FedEx" | "UPS" | "GIG" | "Aramex" | "Local" | "In-house";
  service: string;
  baseNGN: number;
  perKgNGN: number;
  minKg: number;
  maxKg: number;
  etaDays: string;
  freeAboveNGN?: number;
  active: boolean;
};

export type ShippingZone = {
  id: string;
  name: string;
  scope: "country" | "state" | "city" | "postcode";
  countries: string[];
  regions: string[];
  priority: number;
  active: boolean;
  rates: ZoneRate[];
  notes?: string;
  createdAt: number;
  ordersLast30: number;
  revenueLast30: number;
};

function mapCarrier(c: unknown): ZoneRate["carrier"] {
  const raw = String(c ?? "Local");
  if (raw === "InHouse" || raw === "In-house") return "In-house";
  const allowed: ZoneRate["carrier"][] = ["DHL", "FedEx", "UPS", "GIG", "Aramex", "Local", "In-house"];
  return (allowed.includes(raw as ZoneRate["carrier"]) ? raw : "Local") as ZoneRate["carrier"];
}

function mapRate(r: Record<string, unknown>): ZoneRate {
  const base = Number(r.baseFee ?? r.baseNGN ?? 0);
  const perKg = Number(r.perKgFee ?? r.perKgNGN ?? 0);
  const free = r.freeAbove != null ? Number(r.freeAbove) : r.freeAboveNGN != null ? Number(r.freeAboveNGN) : undefined;
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    carrier: mapCarrier(r.carrierLabel ?? r.carrier),
    service: String(r.service ?? ""),
    baseNGN: koboToNaira(base),
    perKgNGN: koboToNaira(perKg),
    minKg: Number(r.minKg ?? 0),
    maxKg: Number(r.maxKg ?? 20),
    etaDays: String(r.etaDays ?? ""),
    freeAboveNGN: free != null && free > 0 ? koboToNaira(free) : undefined,
    active: r.active !== false,
  };
}

function mapZone(z: Record<string, unknown>): ShippingZone {
  const rates = Array.isArray(z.rates) ? (z.rates as Record<string, unknown>[]).map(mapRate) : [];
  const revenue = Number(z.revenueLast30 ?? 0);
  return {
    id: String(z.id),
    name: String(z.name ?? ""),
    scope: (z.scope as ShippingZone["scope"]) || "country",
    countries: Array.isArray(z.countries) ? (z.countries as string[]) : ["NG"],
    regions: Array.isArray(z.regions) ? (z.regions as string[]) : [],
    priority: Number(z.priority ?? 10),
    active: z.active !== false,
    rates,
    notes: z.notes ? String(z.notes) : undefined,
    createdAt: z.createdAt ? new Date(z.createdAt as string).getTime() : Date.now(),
    ordersLast30: Number(z.ordersLast30 ?? 0),
    revenueLast30: koboToNaira(revenue),
  };
}

function rateBody(r: Partial<ZoneRate>) {
  return {
    name: r.name,
    carrier: r.carrier === "In-house" ? "InHouse" : r.carrier,
    service: r.service ?? "",
    baseFee: nairaToKobo(r.baseNGN ?? 0),
    perKgFee: nairaToKobo(r.perKgNGN ?? 0),
    minKg: r.minKg ?? 0,
    maxKg: r.maxKg ?? 20,
    etaDays: r.etaDays ?? "3-5",
    freeAbove: r.freeAboveNGN != null ? nairaToKobo(r.freeAboveNGN) : null,
    active: r.active ?? true,
  };
}

function zoneBody(z: Partial<ShippingZone>) {
  return {
    name: z.name,
    scope: z.scope,
    countries: z.countries,
    regions: z.regions,
    priority: z.priority,
    active: z.active,
    notes: z.notes ?? null,
  };
}

type State = {
  zones: ShippingZone[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  createZone: (name: string) => Promise<string>;
  updateZone: (id: string, patch: Partial<ShippingZone>) => Promise<void>;
  duplicateZone: (id: string) => Promise<void>;
  deleteZone: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  upsertRate: (zoneId: string, rate: ZoneRate) => Promise<void>;
  deleteRate: (zoneId: string, rateId: string) => Promise<void>;
};

export const useShippingZones = create<State>()((set, get) => ({
  zones: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const rows = (await shippingZonesAdminApi.list()) as Record<string, unknown>[];
      set({ zones: (rows ?? []).map(mapZone), hydrated: true });
    } catch (err) {
      console.warn("[shipping-zones] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  createZone: async (name) => {
    try {
      const created = mapZone(
        (await shippingZonesAdminApi.create({
          name,
          scope: "country",
          countries: ["NG"],
          regions: [],
          priority: 20,
          active: false,
          rates: [
            {
              name: "Standard",
              carrier: "Local",
              service: "Ground",
              baseFee: nairaToKobo(3000),
              perKgFee: nairaToKobo(500),
              minKg: 0,
              maxKg: 20,
              etaDays: "3-5",
              active: true,
            },
          ],
        })) as Record<string, unknown>,
      );
      set((s) => ({ zones: [created, ...s.zones] }));
      return created.id;
    } catch (err) {
      console.warn("[shipping-zones] createZone", err);
      await get().hydrate();
      return "";
    }
  },
  updateZone: async (id, patch) => {
    set((s) => ({ zones: s.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) }));
    try {
      const cur = get().zones.find((z) => z.id === id);
      const updated = mapZone(
        (await shippingZonesAdminApi.update(id, zoneBody({ ...cur, ...patch }))) as Record<
          string,
          unknown
        >,
      );
      set((s) => ({
        zones: s.zones.map((z) =>
          z.id === id ? { ...updated, ordersLast30: z.ordersLast30, revenueLast30: z.revenueLast30 } : z,
        ),
      }));
    } catch (err) {
      console.warn("[shipping-zones] updateZone", err);
      await get().hydrate();
    }
  },
  duplicateZone: async (id) => {
    try {
      const copy = mapZone((await shippingZonesAdminApi.duplicate(id)) as Record<string, unknown>);
      set((s) => ({ zones: [copy, ...s.zones] }));
    } catch (err) {
      console.warn("[shipping-zones] duplicateZone", err);
      await get().hydrate();
    }
  },
  deleteZone: async (id) => {
    set((s) => ({ zones: s.zones.filter((z) => z.id !== id) }));
    try {
      await shippingZonesAdminApi.remove(id);
    } catch (err) {
      console.warn("[shipping-zones] deleteZone", err);
      await get().hydrate();
    }
  },
  toggleActive: async (id) => {
    set((s) => ({
      zones: s.zones.map((z) => (z.id === id ? { ...z, active: !z.active } : z)),
    }));
    try {
      const updated = mapZone((await shippingZonesAdminApi.toggle(id)) as Record<string, unknown>);
      set((s) => ({ zones: s.zones.map((z) => (z.id === id ? updated : z)) }));
    } catch (err) {
      console.warn("[shipping-zones] toggleActive", err);
      await get().hydrate();
    }
  },
  upsertRate: async (zoneId, rate) => {
    const zone = get().zones.find((z) => z.id === zoneId);
    const exists = zone?.rates.some((r) => r.id === rate.id);
    set((s) => ({
      zones: s.zones.map((z) => {
        if (z.id !== zoneId) return z;
        return {
          ...z,
          rates: exists ? z.rates.map((r) => (r.id === rate.id ? rate : r)) : [...z.rates, rate],
        };
      }),
    }));
    try {
      const body = rateBody(rate);
      const updated = exists
        ? ((await shippingZonesAdminApi.updateRate(zoneId, rate.id, body)) as Record<string, unknown>)
        : ((await shippingZonesAdminApi.addRate(zoneId, body)) as Record<string, unknown>);
      const mapped = mapZone(updated);
      set((s) => ({ zones: s.zones.map((z) => (z.id === zoneId ? mapped : z)) }));
    } catch (err) {
      console.warn("[shipping-zones] upsertRate", err);
      await get().hydrate();
    }
  },
  deleteRate: async (zoneId, rateId) => {
    set((s) => ({
      zones: s.zones.map((z) =>
        z.id === zoneId ? { ...z, rates: z.rates.filter((r) => r.id !== rateId) } : z,
      ),
    }));
    try {
      const updated = mapZone(
        (await shippingZonesAdminApi.removeRate(zoneId, rateId)) as Record<string, unknown>,
      );
      set((s) => ({ zones: s.zones.map((z) => (z.id === zoneId ? updated : z)) }));
    } catch (err) {
      console.warn("[shipping-zones] deleteRate", err);
      await get().hydrate();
    }
  },
}));
