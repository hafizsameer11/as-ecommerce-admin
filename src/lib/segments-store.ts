import { create } from "zustand";
import type { CustomerTier, CustomerStatus } from "@/lib/customers-store";
import { segmentsAdminApi } from "@/lib/api/marketing";
import { koboToNaira, nairaToKobo } from "@/lib/api/client";

export type SegmentOperator = "gte" | "lte" | "eq" | "in" | "contains" | "within_days" | "before_days";

export type SegmentRule =
  | { field: "spend"; op: "gte" | "lte"; value: number }
  | { field: "orders"; op: "gte" | "lte"; value: number }
  | { field: "aov"; op: "gte" | "lte"; value: number }
  | { field: "concierge"; op: "gte" | "lte"; value: number }
  | { field: "tier"; op: "in"; value: CustomerTier[] }
  | { field: "status"; op: "in"; value: CustomerStatus[] }
  | { field: "country"; op: "in"; value: string[] }
  | { field: "city"; op: "contains"; value: string }
  | { field: "tags"; op: "in"; value: string[] }
  | { field: "marketingOptIn"; op: "eq"; value: boolean }
  | { field: "lastOrderAt"; op: "within_days" | "before_days"; value: number }
  | { field: "createdAt"; op: "within_days" | "before_days"; value: number };

export type Segment = {
  id: string;
  name: string;
  description: string;
  color: string;
  match: "all" | "any";
  rules: SegmentRule[];
  pinned: boolean;
  system: boolean;
  createdAt: string;
  updatedAt: string;
  count?: number;
};

function rulesFromApi(rules: unknown): SegmentRule[] {
  if (!Array.isArray(rules)) return [];
  return rules.map((raw) => {
    const r = raw as SegmentRule;
    if (r.field === "spend" || r.field === "aov") {
      return { ...r, value: koboToNaira(Number(r.value)) } as SegmentRule;
    }
    return r;
  });
}

function rulesToApi(rules: SegmentRule[]) {
  return rules.map((r) => {
    if (r.field === "spend" || r.field === "aov") {
      return { ...r, value: nairaToKobo(Number(r.value)) };
    }
    return r;
  });
}

function mapSegment(s: Record<string, unknown>): Segment {
  return {
    id: String(s.id),
    name: String(s.name ?? ""),
    description: String(s.description ?? ""),
    color: String(s.color ?? "#0f0f0f"),
    match: s.match === "any" ? "any" : "all",
    rules: rulesFromApi(s.rules),
    pinned: !!s.pinned,
    system: !!s.system,
    createdAt: s.createdAt ? new Date(s.createdAt as string).toISOString() : new Date().toISOString(),
    updatedAt: s.updatedAt ? new Date(s.updatedAt as string).toISOString() : new Date().toISOString(),
    count: s.count !== undefined ? Number(s.count) : undefined,
  };
}

function toBody(input: Partial<Segment> & { rules?: SegmentRule[] }) {
  return {
    name: input.name,
    description: input.description ?? null,
    color: input.color,
    match: input.match,
    rules: input.rules ? rulesToApi(input.rules) : undefined,
    pinned: input.pinned,
  };
}

type State = {
  segments: Segment[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  create: (input: Omit<Segment, "id" | "createdAt" | "updatedAt" | "system" | "pinned"> & { pinned?: boolean }) => Promise<string>;
  update: (id: string, patch: Partial<Omit<Segment, "id" | "system" | "createdAt">>) => Promise<void>;
  duplicate: (id: string) => Promise<string | null>;
  remove: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  preview: (input: { match: "all" | "any"; rules: SegmentRule[] }) => Promise<Record<string, unknown> | null>;
  reset: () => void;
};

export const useSegments = create<State>()((set, get) => ({
  segments: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await segmentsAdminApi.list({ pageSize: 100 });
      set({ segments: (data as Record<string, unknown>[]).map(mapSegment), hydrated: true });
    } catch (err) {
      console.warn("[segments] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  create: async (input) => {
    const created = mapSegment(
      (await segmentsAdminApi.create(toBody({ ...input, pinned: !!input.pinned }))) as Record<string, unknown>,
    );
    set((s) => ({ segments: [created, ...s.segments] }));
    return created.id;
  },
  update: async (id, patch) => {
    set((s) => ({
      segments: s.segments.map((x) =>
        x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x,
      ),
    }));
    try {
      const updated = mapSegment((await segmentsAdminApi.update(id, toBody(patch))) as Record<string, unknown>);
      set((s) => ({ segments: s.segments.map((x) => (x.id === id ? updated : x)) }));
    } catch (err) {
      console.warn("[segments] update sync", err);
      await get().hydrate();
    }
  },
  duplicate: async (id) => {
    try {
      const copy = mapSegment((await segmentsAdminApi.duplicate(id)) as Record<string, unknown>);
      set((s) => ({ segments: [copy, ...s.segments] }));
      return copy.id;
    } catch (err) {
      console.warn("[segments] duplicate", err);
      return null;
    }
  },
  remove: async (id) => {
    try {
      await segmentsAdminApi.remove(id);
      set((s) => ({ segments: s.segments.filter((x) => x.id !== id) }));
    } catch (err) {
      console.warn("[segments] remove", err);
      await get().hydrate();
    }
  },
  togglePin: async (id) => {
    set((s) => ({
      segments: s.segments.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)),
    }));
    try {
      const updated = mapSegment((await segmentsAdminApi.togglePin(id)) as Record<string, unknown>);
      set((s) => ({ segments: s.segments.map((x) => (x.id === id ? updated : x)) }));
    } catch (err) {
      console.warn("[segments] pin sync", err);
      await get().hydrate();
    }
  },
  preview: async (input) => {
    try {
      return (await segmentsAdminApi.preview({
        match: input.match,
        rules: rulesToApi(input.rules),
      })) as Record<string, unknown>;
    } catch (err) {
      console.warn("[segments] preview", err);
      return null;
    }
  },
  reset: () => void get().hydrate(),
}));

// ============ Rule evaluation (client-side preview against customers store) ============
import type { Customer } from "@/lib/customers-store";

function daysBetween(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

const COUNTRY_MAP: Record<string, string> = {
  LA: "Nigeria", FC: "Nigeria", RI: "Nigeria", OY: "Nigeria",
  EN: "Nigeria", KN: "Nigeria", ED: "Nigeria", AK: "Nigeria",
  GB: "United Kingdom", GH: "Ghana", AE: "United Arab Emirates",
  NG: "Nigeria",
};

export function customerCountry(c: Customer): string {
  return COUNTRY_MAP[c.country] || c.country || "Nigeria";
}

function evalRule(c: Customer, r: SegmentRule): boolean {
  switch (r.field) {
    case "spend": return r.op === "gte" ? c.spend >= r.value : c.spend <= r.value;
    case "orders": return r.op === "gte" ? c.orders >= r.value : c.orders <= r.value;
    case "aov": return r.op === "gte" ? c.aov >= r.value : c.aov <= r.value;
    case "concierge": return r.op === "gte" ? c.concierge >= r.value : c.concierge <= r.value;
    case "tier": return r.value.includes(c.tier);
    case "status": return r.value.includes(c.status);
    case "country": return r.value.includes(customerCountry(c));
    case "city": return c.city.toLowerCase().includes(r.value.toLowerCase());
    case "tags": return r.value.some((t) => c.tags.includes(t));
    case "marketingOptIn": return c.marketingOptIn === r.value;
    case "lastOrderAt": {
      const d = daysBetween(c.lastOrderAt);
      return r.op === "within_days" ? d <= r.value : d > r.value;
    }
    case "createdAt": {
      const d = daysBetween(c.createdAt);
      return r.op === "within_days" ? d <= r.value : d > r.value;
    }
  }
}

export function matchSegment(c: Customer, seg: Pick<Segment, "match" | "rules">): boolean {
  if (seg.rules.length === 0) return false;
  return seg.match === "all"
    ? seg.rules.every((r) => evalRule(c, r))
    : seg.rules.some((r) => evalRule(c, r));
}

export function segmentStats(customers: Customer[], seg: Pick<Segment, "match" | "rules">) {
  const matched = customers.filter((c) => matchSegment(c, seg));
  const spend = matched.reduce((a, c) => a + c.spend, 0);
  const optIn = matched.filter((c) => c.marketingOptIn).length;
  return {
    count: matched.length,
    share: customers.length ? matched.length / customers.length : 0,
    spend,
    aov: matched.length ? Math.round(spend / matched.length) : 0,
    marketable: optIn,
    matched,
  };
}

export const RULE_FIELDS: Array<{ id: SegmentRule["field"]; label: string; kind: "number" | "money" | "tierList" | "statusList" | "countryList" | "text" | "tagList" | "bool" | "days" }> = [
  { id: "spend", label: "Lifetime spend", kind: "money" },
  { id: "orders", label: "Order count", kind: "number" },
  { id: "aov", label: "Average order value", kind: "money" },
  { id: "concierge", label: "Concierge requests", kind: "number" },
  { id: "tier", label: "Loyalty tier", kind: "tierList" },
  { id: "status", label: "Customer status", kind: "statusList" },
  { id: "country", label: "Country", kind: "countryList" },
  { id: "city", label: "City contains", kind: "text" },
  { id: "tags", label: "Has tag", kind: "tagList" },
  { id: "marketingOptIn", label: "Marketing opt-in", kind: "bool" },
  { id: "lastOrderAt", label: "Last order", kind: "days" },
  { id: "createdAt", label: "Joined", kind: "days" },
];

export const TIER_OPTIONS: CustomerTier[] = ["Signature", "Gold", "Silver", "Standard"];
export const STATUS_OPTIONS: CustomerStatus[] = ["vip", "active", "flagged", "blocked"];
export const COUNTRY_OPTIONS = ["Nigeria", "United Kingdom", "Ghana", "United Arab Emirates"];
export const TAG_OPTIONS = ["watches", "sneakers", "fragrance", "concierge", "fashion", "gifting", "corporate"];
