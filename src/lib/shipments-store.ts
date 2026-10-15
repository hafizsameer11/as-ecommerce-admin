import { create } from "zustand";
import { ordersAdminApi, koboToNaira, type AdminShipmentRow } from "@/lib/api/orders";

export type Carrier = "DHL" | "FedEx" | "UPS" | "GIG" | "Aramex" | "Local";
export type ShipmentStatus =
  | "label_created"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "returned";

export type ShipmentEvent = {
  at: number;
  status: ShipmentStatus;
  location: string;
  note?: string;
};

export type Shipment = {
  id: string;
  apiId: string;
  orderId: string;
  customerName: string;
  carrier: Carrier;
  service: string;
  tracking: string;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  weightKg: number;
  itemsCount: number;
  declaredValue: number;
  costNGN: number;
  createdAt: number;
  shippedAt?: number;
  etaAt: number;
  deliveredAt?: number;
  warehouseId: string;
  insured: boolean;
  signatureRequired: boolean;
  events: ShipmentEvent[];
  notes?: string;
};

const CARRIERS = new Set(["DHL", "FedEx", "UPS", "GIG", "Aramex", "Local"]);

function mapShipment(s: AdminShipmentRow): Shipment {
  const carrierRaw = s.carrierLabel || s.carrier || "Local";
  const carrier = (CARRIERS.has(carrierRaw) ? carrierRaw : "Local") as Carrier;
  const status = (s.status as ShipmentStatus) || "label_created";
  return {
    id: s.number || s.id,
    apiId: s.id,
    orderId: s.orderNumber || s.orderId,
    customerName: s.customerName || "Customer",
    carrier,
    service: s.service || "",
    tracking: s.tracking || "",
    status,
    origin: s.origin || "",
    destination: s.destination || "",
    weightKg: Number(s.weightKg ?? 0),
    itemsCount: Number(s.itemsCount ?? 0),
    declaredValue: koboToNaira(s.declaredValue ?? 0),
    costNGN: koboToNaira(s.cost ?? 0),
    createdAt: s.createdAt ? new Date(s.createdAt).getTime() : Date.now(),
    shippedAt: s.shippedAt ? new Date(s.shippedAt).getTime() : undefined,
    etaAt: s.etaAt ? new Date(s.etaAt).getTime() : Date.now() + 86400000,
    deliveredAt: s.deliveredAt ? new Date(s.deliveredAt).getTime() : undefined,
    warehouseId: s.warehouseId || "",
    insured: s.insured !== false,
    signatureRequired: s.signatureRequired !== false,
    events: (s.events ?? []).map((e) => ({
      at: new Date(e.at).getTime(),
      status: (e.status as ShipmentStatus) || status,
      location: e.location || "",
      note: e.note ?? undefined,
    })),
    notes: s.notes ?? undefined,
  };
}

type State = {
  shipments: Shipment[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (s: Shipment) => void;
  update: (id: string, patch: Partial<Shipment>) => Promise<void>;
  advance: (id: string, status: ShipmentStatus, location: string, note?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

function findApiId(shipments: Shipment[], id: string) {
  return shipments.find((s) => s.id === id || s.apiId === id)?.apiId ?? id;
}

export const useShipments = create<State>()((set, get) => ({
  shipments: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await ordersAdminApi.listShipments({ pageSize: 100 });
      set({ shipments: data.map(mapShipment), hydrated: true });
    } catch (err) {
      console.warn("[shipments] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  add: (s) => set((st) => ({ shipments: [s, ...st.shipments] })),
  update: async (id, patch) => {
    const apiId = findApiId(get().shipments, id);
    set((st) => ({
      shipments: st.shipments.map((s) => (s.id === id || s.apiId === id ? { ...s, ...patch } : s)),
    }));
    try {
      await ordersAdminApi.updateShipment(apiId, {
        trackingNumber: patch.tracking,
        service: patch.service,
        notes: patch.notes,
        etaAt: patch.etaAt ? new Date(patch.etaAt).toISOString() : undefined,
        insured: patch.insured,
        signatureRequired: patch.signatureRequired,
      });
    } catch (err) {
      console.warn("[shipments] update sync", err);
      await get().hydrate();
    }
  },
  advance: async (id, status, location, note) => {
    const apiId = findApiId(get().shipments, id);
    set((st) => ({
      shipments: st.shipments.map((s) => {
        if (s.id !== id && s.apiId !== id) return s;
        const evt: ShipmentEvent = { at: Date.now(), status, location, note };
        const extra: Partial<Shipment> = {};
        if (status === "picked_up" && !s.shippedAt) extra.shippedAt = evt.at;
        if (status === "delivered") extra.deliveredAt = evt.at;
        return { ...s, status, events: [...s.events, evt], ...extra };
      }),
    }));
    try {
      await ordersAdminApi.advanceShipment(apiId, { status, location, note });
      await get().hydrate();
    } catch (err) {
      console.warn("[shipments] advance sync", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    const apiId = findApiId(get().shipments, id);
    set((st) => ({ shipments: st.shipments.filter((s) => s.id !== id && s.apiId !== id) }));
    try {
      await ordersAdminApi.removeShipment(apiId);
    } catch (err) {
      console.warn("[shipments] remove sync", err);
      await get().hydrate();
    }
  },
}));

export const STATUS_META: Record<
  ShipmentStatus,
  { label: string; tone: "neutral" | "gold" | "green" | "red" | "blue" | "amber" | "purple" | "slate" }
> = {
  label_created: { label: "Label created", tone: "slate" },
  picked_up: { label: "Picked up", tone: "amber" },
  in_transit: { label: "In transit", tone: "blue" },
  out_for_delivery: { label: "Out for delivery", tone: "purple" },
  delivered: { label: "Delivered", tone: "green" },
  exception: { label: "Exception", tone: "red" },
  returned: { label: "Returned", tone: "red" },
};
