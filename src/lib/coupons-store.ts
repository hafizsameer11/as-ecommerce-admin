import { create } from "zustand";
import { commerceAdminApi, mapCouponFromApi, mapCouponToApiBody } from "@/lib/api/commerce";

export type CouponType = "percent" | "fixed" | "free_shipping" | "bogo";
export type CouponStatus = "active" | "scheduled" | "expired" | "paused" | "draft";
export type CouponAppliesTo = "all" | "categories" | "brands" | "products" | "collections";
export type CouponEligibility = "all" | "new" | "vip" | "segment";

export type Coupon = {
  id: string;
  code: string;
  title: string;
  description?: string;
  type: CouponType;
  value: number;
  status: CouponStatus;
  startsAt: string;
  endsAt?: string;
  minSubtotal?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  used: number;
  redemptions: number;
  revenue: number;
  appliesTo: CouponAppliesTo;
  appliesToRefs?: string[];
  eligibility: CouponEligibility;
  segmentId?: string;
  stackable: boolean;
  autoApply: boolean;
  oncePerCustomer: boolean;
  channels: ("web" | "mobile" | "concierge")[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  notes?: string;
};

type State = {
  coupons: Coupon[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  create: (c: Omit<Coupon, "id" | "used" | "redemptions" | "revenue" | "createdAt" | "updatedAt" | "pinned">) => Promise<Coupon>;
  update: (id: string, patch: Partial<Coupon>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Coupon | undefined>;
  setStatus: (id: string, status: CouponStatus) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  reset: () => void;
};

function toCreateBody(c: Omit<Coupon, "id" | "used" | "redemptions" | "revenue" | "createdAt" | "updatedAt" | "pinned">) {
  return mapCouponToApiBody({
    code: c.code,
    title: c.title,
    description: c.description,
    type: c.type,
    value: c.type === "fixed" ? c.value : c.value,
    status: c.status,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    minSubtotal: c.minSubtotal,
    maxDiscount: c.maxDiscount,
    usageLimit: c.usageLimit,
    perCustomerLimit: c.perCustomerLimit,
    appliesTo: c.appliesTo,
    appliesToRefs: c.appliesToRefs,
    eligibility: c.eligibility,
    segmentId: c.segmentId,
    stackable: c.stackable,
    autoApply: c.autoApply,
    oncePerCustomer: c.oncePerCustomer,
    channels: c.channels,
    notes: c.notes,
  });
}

export const useCoupons = create<State>()((set, get) => ({
  coupons: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await commerceAdminApi.listCoupons({ pageSize: 100 });
      set({ coupons: data.map(mapCouponFromApi), hydrated: true });
    } catch (err) {
      console.warn("[coupons] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  create: async (c) => {
    const body = toCreateBody(c);
    const created = mapCouponFromApi(await commerceAdminApi.createCoupon(body));
    set((s) => ({ coupons: [created, ...s.coupons] }));
    return created;
  },
  update: async (id, patch) => {
    const existing = get().coupons.find((x) => x.id === id);
    const type = patch.type ?? existing?.type;
    const body = mapCouponToApiBody({ ...patch, type } as never);
    const updated = mapCouponFromApi(await commerceAdminApi.updateCoupon(id, body));
    set((s) => ({ coupons: s.coupons.map((c) => (c.id === id ? updated : c)) }));
  },
  remove: async (id) => {
    await commerceAdminApi.deleteCoupon(id);
    set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) }));
  },
  duplicate: async (id) => {
    const copy = mapCouponFromApi(await commerceAdminApi.duplicateCoupon(id));
    set((s) => ({ coupons: [copy, ...s.coupons] }));
    return copy;
  },
  setStatus: async (id, status) => {
    const updated = mapCouponFromApi(await commerceAdminApi.setCouponStatus(id, status));
    set((s) => ({ coupons: s.coupons.map((c) => (c.id === id ? updated : c)) }));
  },
  togglePin: async (id) => {
    const updated = mapCouponFromApi(await commerceAdminApi.toggleCouponPin(id));
    set((s) => ({ coupons: s.coupons.map((c) => (c.id === id ? updated : c)) }));
  },
  reset: () => void get().hydrate(),
}));
