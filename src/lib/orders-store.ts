/**
 * Thin orders cache for OrderDetail and any leftover create/checkout helpers.
 * Live admin list/mutations live in OrdersTable via ordersAdminApi directly.
 */
import { create } from "zustand";
import type { Order, OrderStatus, OrderItem } from "@/components/account/ordersData";
import type { CartItem } from "@/lib/cart-store";
import type { CheckoutAddress, CheckoutContact, DeliveryMethod, PaymentMethod } from "@/lib/checkout-store";
import { formatCartSize } from "@/lib/shop-data";
import { ordersAdminApi, koboToNaira, type AdminOrderRow } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";

export type OrderReservation = {
  dropId: string;
  productId: string;
  productName: string;
  image: string;
  size?: string;
  retail: number;
  deposit: number;
  balance: number;
  releaseAt: string;
  balancePaid: boolean;
  balancePaidAt?: number;
};

export type OrderNote = { id: string; author: string; at: string; body: string };

export type OrderPaymentRow = {
  id?: string;
  method?: string;
  status?: string;
  amount: number;
  ref?: string;
  capturedAt?: string;
};

export type OrderTimelineEntry = {
  at: string;
  label: string;
  done?: boolean;
};

export type PlacedOrder = Order & {
  apiId?: string;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shipping: number;
  tax: number;
  address: CheckoutAddress | null;
  contact: CheckoutContact | null;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  placedAt: number;
  reservation?: OrderReservation;
  rawStatus?: string;
  paymentStatus?: string;
  amountPaid?: number;
  amountRefunded?: number;
  due?: number;
  notes: OrderNote[];
  payments: OrderPaymentRow[];
  timeline: OrderTimelineEntry[];
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    tier?: string;
    orders?: number;
  };
};

type CreateArgs = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shipping: number;
  address: CheckoutAddress;
  contact: CheckoutContact;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
};

type State = {
  orders: PlacedOrder[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Load a single order by API id or order number (for OrderDetail). */
  ensureOrder: (idOrNumber: string) => Promise<PlacedOrder | undefined>;
  createOrder: (args: CreateArgs) => PlacedOrder;
  getById: (id: string) => PlacedOrder | undefined;
  updateStatus: (ids: string[], status: OrderStatus) => Promise<void>;
  removeOrders: (ids: string[]) => void;
  payBalance: (id: string) => void;
};

function reservationFrom(_items: CartItem[]): OrderReservation | undefined {
  return undefined;
}

function normalizeStatus(s: string): OrderStatus {
  const key = (s || "").toLowerCase();
  if (key.includes("ship") || key.includes("out_for")) return "Shipped";
  if (key.includes("deliver")) return "Delivered";
  if (key.includes("cancel")) return "Cancelled";
  if (key.includes("return") || key.includes("refund")) return "Returned";
  return "Processing";
}

function mapListRow(o: AdminOrderRow): PlacedOrder {
  const placed = o.placedAt ? new Date(o.placedAt) : new Date();
  return {
    id: o.number || o.id,
    apiId: o.id,
    date: placed.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    status: normalizeStatus(o.statusLabel || o.status),
    total: koboToNaira(o.total),
    itemsCount: o.itemsCount ?? 0,
    items: [],
    subtotal: koboToNaira(o.total),
    discount: 0,
    couponCode: null,
    shipping: 0,
    address: null,
    contact: {
      email: o.customer?.email ?? o.customerEmail ?? "",
      phone: "",
      subscribe: false,
    },
    delivery: "ship",
    payment: (o.paymentMethod as PaymentMethod) || "paystack",
    placedAt: placed.getTime(),
    tax: 0,
    notes: [],
    payments: [],
    timeline: [],
  };
}

function mapNotes(raw: unknown): OrderNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((n) => {
    const row = n as Record<string, unknown>;
    return {
      id: String(row.id ?? `n_${Math.random().toString(36).slice(2)}`),
      author: String(row.author ?? row.by ?? "Staff"),
      at: String(row.at ?? row.createdAt ?? new Date().toISOString()),
      body: String(row.body ?? row.text ?? ""),
    };
  });
}

function mapPayments(raw: unknown): OrderPaymentRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => {
    const row = p as Record<string, unknown>;
    return {
      id: row.id ? String(row.id) : undefined,
      method: row.method ? String(row.method) : row.channel ? String(row.channel) : undefined,
      status: row.status ? String(row.status) : undefined,
      amount: koboToNaira(Number(row.amount ?? row.total ?? 0)),
      ref: row.ref ? String(row.ref) : row.reference ? String(row.reference) : undefined,
      capturedAt: row.capturedAt
        ? String(row.capturedAt)
        : row.paidAt
          ? String(row.paidAt)
          : undefined,
    };
  });
}

function mapTimeline(raw: Record<string, unknown>): OrderTimelineEntry[] {
  const events = raw.events ?? raw.timeline;
  if (Array.isArray(events) && events.length > 0) {
    return events.map((e) => {
      const row = e as Record<string, unknown>;
      const at = String(row.at ?? row.time ?? row.createdAt ?? "");
      const label = String(row.label ?? row.title ?? row.kind ?? row.status ?? row.text ?? "Event");
      return { at, label, done: row.done !== false };
    });
  }
  const shipments = raw.shipments;
  if (Array.isArray(shipments)) {
    return shipments.flatMap((s) => {
      const ship = s as Record<string, unknown>;
      const evs = ship.events;
      if (!Array.isArray(evs)) return [];
      return evs.map((e) => {
        const row = e as Record<string, unknown>;
        return {
          at: String(row.at ?? ""),
          label: String(row.label ?? row.status ?? "Shipment update"),
          done: true,
        };
      });
    });
  }
  return [];
}

function formatWhen(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function mapDetail(raw: Record<string, unknown>): PlacedOrder {
  const number = String(raw.number ?? raw.id ?? "");
  const placed = raw.date ?? raw.placedAt;
  const placedDate = placed ? new Date(placed as string) : new Date();
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items: OrderItem[] = itemsRaw.map((it) => {
    const row = it as Record<string, unknown>;
    return {
      name: String(row.name ?? ""),
      brand: row.brand ? String(row.brand) : undefined,
      variant: String(row.variant ?? row.size ?? ""),
      qty: Number(row.qty ?? 1),
      price: koboToNaira(Number(row.price ?? row.unitPrice ?? 0)),
      image: row.image ? String(row.image) : "",
      sku: row.sku ? String(row.sku) : row.variantSku ? String(row.variantSku) : undefined,
    };
  });
  const addr = raw.address as Record<string, unknown> | null | undefined;
  const contact = raw.contact as Record<string, unknown> | null | undefined;
  const cust = raw.customer as Record<string, unknown> | null | undefined;
  const paymentStatus = String(raw.paymentStatus ?? "");
  const rawStatus = String(raw.status ?? "");
  return {
    id: number,
    apiId: String(raw.id ?? number),
    date: placedDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    status: normalizeStatus(String(raw.statusLabel ?? raw.status ?? "")),
    total: koboToNaira(Number(raw.total ?? 0)),
    itemsCount: Number(raw.itemsCount ?? items.reduce((n, i) => n + i.qty, 0)),
    eta: raw.eta
      ? new Date(raw.eta as string).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      : undefined,
    tracking: raw.tracking ? String(raw.tracking) : undefined,
    items,
    subtotal: koboToNaira(Number(raw.subtotal ?? raw.total ?? 0)),
    discount: koboToNaira(Number(raw.discount ?? 0)),
    couponCode: raw.couponCode ? String(raw.couponCode) : null,
    shipping: koboToNaira(Number(raw.shipping ?? 0)),
    address: addr
      ? {
          fullName: String(addr.recipient ?? addr.fullName ?? ""),
          address: String(addr.line1 ?? addr.address ?? ""),
          apartment: String(addr.line2 ?? addr.apartment ?? ""),
          city: String(addr.city ?? ""),
          state: String(addr.state ?? ""),
          postal: String(addr.postalCode ?? addr.postal ?? ""),
          country: String(addr.country ?? ""),
        }
      : null,
    contact: contact
      ? {
          email: String(contact.email ?? ""),
          phone: String(contact.phone ?? ""),
          subscribe: !!contact.subscribe,
        }
      : null,
    delivery: (String(raw.delivery ?? raw.deliveryMethod ?? "ship") === "pickup" ? "pickup" : "ship") as DeliveryMethod,
    payment: (String(raw.payment ?? raw.paymentMethod ?? "paystack") as PaymentMethod) || "paystack",
    placedAt: placedDate.getTime(),
    rawStatus,
    paymentStatus,
    tax: koboToNaira(Number(raw.tax ?? 0)),
    amountPaid: raw.amountPaid != null ? koboToNaira(Number(raw.amountPaid)) : undefined,
    amountRefunded: raw.amountRefunded != null ? koboToNaira(Number(raw.amountRefunded)) : undefined,
    due: raw.due != null ? koboToNaira(Number(raw.due)) : undefined,
    notes: mapNotes(raw.notes),
    payments: mapPayments(raw.payments),
    timeline: mapTimeline(raw).map((t) => ({ ...t, at: formatWhen(t.at) })),
    customer: cust
      ? {
          name: String(
            cust.name ??
              (`${cust.firstName ?? ""} ${cust.lastName ?? ""}`.trim() || "Customer"),
          ),
          email: cust.email ? String(cust.email) : undefined,
          phone: cust.phone ? String(cust.phone) : undefined,
          tier: cust.tier ? String(cust.tier) : undefined,
          orders: cust.orders != null ? Number(cust.orders) : cust.orderCount != null ? Number(cust.orderCount) : undefined,
        }
      : undefined,
  };
}

function pad(n: number, size = 6) {
  return String(n).padStart(size, "0");
}

function makeId(existing: number) {
  return `ASL-ORD-${pad(20250 + existing)}`;
}

function makeTracking() {
  const n = Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000;
  return `DHL-${n}`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export const useOrders = create<State>()((set, get) => ({
  orders: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await ordersAdminApi.list({ pageSize: 50 });
      set({ orders: data.map(mapListRow), hydrated: true });
    } catch (err) {
      console.warn("[orders-store] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  ensureOrder: async (idOrNumber) => {
    const existing = get().orders.find(
      (o) => o.id === idOrNumber || o.apiId === idOrNumber,
    );
    if (existing && existing.items.length > 0) return existing;
    try {
      const raw = (await ordersAdminApi.get(idOrNumber)) as Record<string, unknown>;
      const mapped = mapDetail(raw);
      set((s) => {
        const others = s.orders.filter((o) => o.id !== mapped.id && o.apiId !== mapped.apiId);
        return { orders: [mapped, ...others], hydrated: true };
      });
      return mapped;
    } catch (err) {
      console.warn("[orders-store] ensureOrder", err);
      throw err instanceof ApiError ? err : new Error(err instanceof Error ? err.message : "Failed to load order");
    }
  },
  createOrder: ({ items, subtotal, discount, couponCode, shipping, address, contact, delivery, payment }) => {
    const now = new Date();
    const status: OrderStatus = "Processing";
    const orderItems: OrderItem[] = items.map((i) => {
      const sizeLabel = i.size ? formatCartSize(i.size) : null;
      return {
        name: i.name,
        brand: undefined,
        variant: `${i.variant}${sizeLabel ? ` · ${sizeLabel}` : ""}${i.color ? ` · ${i.color}` : ""}`,
        qty: i.qty,
        price: i.price,
        image: i.image,
      };
    });

    const total = subtotal - discount + shipping;
    const order: PlacedOrder = {
      id: makeId(get().orders.length + 1),
      date: fmtDate(now),
      status,
      total,
      itemsCount: items.reduce((n, i) => n + i.qty, 0),
      eta: fmtDate(addDays(now, 5)),
      tracking: delivery === "ship" ? makeTracking() : undefined,
      items: orderItems,
      subtotal,
      discount,
      couponCode,
      shipping,
      address,
      contact,
      delivery,
      payment,
      placedAt: now.getTime(),
      reservation: reservationFrom(items),
      tax: 0,
      notes: [],
      payments: [],
      timeline: [],
    };
    set((s) => ({ orders: [order, ...s.orders] }));
    return order;
  },
  getById: (id) => get().orders.find((o) => o.id === id || o.apiId === id),
  updateStatus: async (ids, status) => {
    const statusMap: Record<OrderStatus, string> = {
      Processing: "processing",
      Shipped: "shipped",
      Delivered: "delivered",
      Cancelled: "cancelled",
      Returned: "returned",
    };
    const set2 = new Set(ids);
    set((s) => ({
      orders: s.orders.map((o) => (set2.has(o.id) || set2.has(o.apiId ?? "") ? { ...o, status } : o)),
    }));
    try {
      await Promise.all(
        ids.map((id) => {
          const row = get().orders.find((o) => o.id === id || o.apiId === id);
          return ordersAdminApi.setStatus(row?.apiId ?? id, statusMap[status]);
        }),
      );
    } catch (err) {
      console.warn("[orders-store] status sync", err);
      await get().hydrate();
    }
  },
  payBalance: (id) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id && o.reservation
          ? { ...o, reservation: { ...o.reservation, balancePaid: true, balancePaidAt: Date.now() } }
          : o,
      ),
    })),
  removeOrders: (ids) => {
    const set2 = new Set(ids);
    set((s) => ({ orders: s.orders.filter((o) => !set2.has(o.id) && !set2.has(o.apiId ?? "")) }));
  },
}));

/** Read-only selectors */
export const useOrderById = (id: string | undefined) =>
  useOrders((s) => (id ? s.orders.find((o) => o.id === id || o.apiId === id) : undefined));
export const useAllOrders = () => useOrders((s) => s.orders);
