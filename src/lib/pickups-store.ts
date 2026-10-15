import { create } from "zustand";
import { ordersAdminApi } from "@/lib/api/orders";

export type PickupLocation = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  hours: string;
  active: boolean;
  concierge: boolean;
  capacityPerDay: number;
  bookingsLast30: number;
  createdAt: number;
};

export type PickupStatus = "scheduled" | "ready" | "collected" | "no_show" | "cancelled";

export type PickupBooking = {
  id: string;
  apiId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  locationId: string;
  scheduledAt: number;
  status: PickupStatus;
  itemsCount: number;
  notes?: string;
  createdAt: number;
  collectedAt?: number;
  collectedBy?: string;
};

function mapBooking(b: Record<string, unknown>): PickupBooking {
  const statusRaw = String(b.status || "scheduled");
  const status = (
    ["scheduled", "ready", "collected", "no_show", "cancelled"].includes(statusRaw)
      ? statusRaw
      : "scheduled"
  ) as PickupStatus;
  return {
    id: String(b.number || b.id),
    apiId: String(b.id),
    orderId: String(b.orderNumber || b.orderId || ""),
    customerName: String(b.customerName || (b.customer as { name?: string })?.name || "Customer"),
    customerPhone: String(b.customerPhone || (b.customer as { phone?: string })?.phone || ""),
    locationId: String(b.locationId || (b.location as { id?: string })?.id || ""),
    scheduledAt: b.scheduledAt ? new Date(b.scheduledAt as string).getTime() : Date.now(),
    status,
    itemsCount: Number(b.itemsCount ?? 1),
    notes: b.notes ? String(b.notes) : undefined,
    createdAt: b.createdAt ? new Date(b.createdAt as string).getTime() : Date.now(),
    collectedAt: b.collectedAt ? new Date(b.collectedAt as string).getTime() : undefined,
    collectedBy: b.collectedBy ? String(b.collectedBy) : undefined,
  };
}

function mapLocation(l: Record<string, unknown>): PickupLocation {
  const country = String(l.country || "NG");
  return {
    id: String(l.id),
    name: String(l.name || ""),
    address: String(l.address || l.line1 || ""),
    city: String(l.city || ""),
    state: String(l.state || ""),
    country: country === "NG" ? "Nigeria" : country,
    phone: String(l.phone || ""),
    hours: String(l.hours || ""),
    active: l.active !== false,
    concierge: !!l.concierge,
    capacityPerDay: Number(l.capacityPerDay ?? 20),
    bookingsLast30: Number(
      l.bookingsLast30 ?? (l._count as { bookings?: number } | undefined)?.bookings ?? 0,
    ),
    createdAt: l.createdAt ? new Date(l.createdAt as string).getTime() : Date.now(),
  };
}

function locationBody(l: Partial<PickupLocation> & { name?: string }) {
  const country = l.country === "Nigeria" || !l.country ? "NG" : l.country.slice(0, 2).toUpperCase();
  return {
    name: l.name,
    address: l.address || "Address TBD",
    city: l.city || "Lagos",
    state: l.state || "Lagos",
    country,
    phone: l.phone || "+2340000000000",
    hours: l.hours || "Mon - Sat 10:00 - 19:00",
    active: l.active ?? false,
    concierge: l.concierge ?? false,
    capacityPerDay: l.capacityPerDay ?? 10,
  };
}

type State = {
  locations: PickupLocation[];
  bookings: PickupBooking[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  createLocation: (name: string) => Promise<string>;
  updateLocation: (id: string, patch: Partial<PickupLocation>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  toggleLocation: (id: string) => Promise<void>;
  advanceBooking: (id: string, status: PickupStatus, collectedBy?: string) => Promise<void>;
  addBookingNote: (id: string, note: string) => Promise<void>;
};

export const usePickups = create<State>()((set, get) => ({
  locations: [],
  bookings: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const [bookingsRes, locations] = await Promise.all([
        ordersAdminApi.listPickupBookings({ pageSize: 100 }),
        ordersAdminApi.listPickupLocations().catch((err) => {
          console.warn("[pickups] locations hydrate", err);
          return [] as Record<string, unknown>[];
        }),
      ]);
      set({
        bookings: (bookingsRes.data as Record<string, unknown>[]).map(mapBooking),
        locations: (locations ?? []).map(mapLocation),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[pickups] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  createLocation: async (name) => {
    try {
      const created = mapLocation(
        (await ordersAdminApi.createPickupLocation(locationBody({ name }))) as Record<string, unknown>,
      );
      set((s) => ({ locations: [created, ...s.locations] }));
      return created.id;
    } catch (err) {
      console.warn("[pickups] createLocation", err);
      await get().hydrate();
      return "";
    }
  },
  updateLocation: async (id, patch) => {
    set((s) => ({
      locations: s.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
    try {
      const cur = get().locations.find((l) => l.id === id);
      const updated = mapLocation(
        (await ordersAdminApi.updatePickupLocation(id, locationBody({ ...cur, ...patch }))) as Record<
          string,
          unknown
        >,
      );
      set((s) => ({ locations: s.locations.map((l) => (l.id === id ? updated : l)) }));
    } catch (err) {
      console.warn("[pickups] updateLocation", err);
      await get().hydrate();
    }
  },
  deleteLocation: async (id) => {
    set((s) => ({
      locations: s.locations.filter((l) => l.id !== id),
      bookings: s.bookings.filter((b) => b.locationId !== id),
    }));
    try {
      await ordersAdminApi.removePickupLocation(id);
    } catch (err) {
      console.warn("[pickups] deleteLocation", err);
      await get().hydrate();
    }
  },
  toggleLocation: async (id) => {
    const cur = get().locations.find((l) => l.id === id);
    if (!cur) return;
    const active = !cur.active;
    set((s) => ({
      locations: s.locations.map((l) => (l.id === id ? { ...l, active } : l)),
    }));
    try {
      await ordersAdminApi.updatePickupLocation(id, { active });
    } catch (err) {
      console.warn("[pickups] toggleLocation", err);
      await get().hydrate();
    }
  },
  advanceBooking: async (id, status, collectedBy) => {
    const row = get().bookings.find((b) => b.id === id || b.apiId === id);
    const apiId = row?.apiId ?? id;
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === id || b.apiId === id
          ? {
              ...b,
              status,
              collectedAt: status === "collected" ? Date.now() : b.collectedAt,
              collectedBy: collectedBy ?? b.collectedBy,
            }
          : b,
      ),
    }));
    try {
      await ordersAdminApi.advancePickup(apiId, status, collectedBy);
      await get().hydrate();
    } catch (err) {
      console.warn("[pickups] advanceBooking", err);
      await get().hydrate();
    }
  },
  addBookingNote: async (id, note) => {
    const row = get().bookings.find((b) => b.id === id || b.apiId === id);
    const apiId = row?.apiId ?? id;
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === id || b.apiId === id ? { ...b, notes: note } : b,
      ),
    }));
    try {
      await ordersAdminApi.setPickupNote(apiId, note);
    } catch (err) {
      console.warn("[pickups] addBookingNote", err);
      await get().hydrate();
    }
  },
}));
