import { create } from "zustand";
import type { CustomerTier } from "@/lib/customers-store";
import { clubAdminApi, koboToNaira, nairaToKobo } from "@/lib/api/loyalty";

export type ClubTier = {
  id: CustomerTier;
  name: string;
  color: string;
  minSpend: number; // NGN lifetime spend to qualify
  pointsMultiplier: number;
  perks: string[];
  active: boolean;
};

export type ClubReward = {
  id: string;
  title: string;
  description: string;
  cost: number;
  category: "shipping" | "credit" | "experience" | "product" | "concierge";
  eligibleTiers: CustomerTier[];
  stock: number | null;
  redeemed: number;
  active: boolean;
  createdAt: string;
  value?: number | null;
};

export type ClubRule = {
  earnPerNaira: number; // points per ₦1,000 spent (UI)
  pointValueNaira: number; // ₦ per point
  birthdayBonus: number;
  referralBonus: number;
  reviewBonus: number;
  signupBonus: number;
  expiryMonths: number;
};

export type PointsEntry = {
  id: string;
  customerId: string;
  customerName: string;
  tier: CustomerTier;
  delta: number;
  reason: string;
  at: string;
};

const DEFAULT_RULES: ClubRule = {
  earnPerNaira: 10,
  pointValueNaira: 5,
  birthdayBonus: 500,
  referralBonus: 1000,
  reviewBonus: 50,
  signupBonus: 250,
  expiryMonths: 24,
};

function mapTier(t: Record<string, unknown>): ClubTier {
  const id = (t.id as CustomerTier) || "Standard";
  const minRaw = Number(t.minSpend ?? 0);
  // API stores minSpend in kobo; tolerate already-naira seeds.
  const minSpend = minRaw > 10_000_000 ? koboToNaira(minRaw) : minRaw;
  return {
    id,
    name: String(t.name ?? id),
    color: String(t.color ?? "#6B7280"),
    minSpend,
    pointsMultiplier: Number(t.pointsMultiplier ?? t.multiplier ?? 1),
    perks: Array.isArray(t.perks) ? (t.perks as string[]) : [],
    active: t.active !== false,
  };
}

function mapReward(r: Record<string, unknown>): ClubReward {
  const cat = String(r.category ?? "credit");
  const category = (
    ["shipping", "credit", "experience", "product", "concierge"].includes(cat) ? cat : "credit"
  ) as ClubReward["category"];
  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    cost: Number(r.cost ?? 0),
    category,
    eligibleTiers: (Array.isArray(r.eligibleTiers) ? r.eligibleTiers : ["Standard"]) as CustomerTier[],
    stock: r.stock == null ? null : Number(r.stock),
    redeemed: Number(r.redeemed ?? 0),
    active: r.active !== false,
    createdAt: r.createdAt ? new Date(r.createdAt as string).toISOString() : new Date().toISOString(),
    value: r.value == null ? null : Number(r.value),
  };
}

function mapLedger(e: Record<string, unknown>): PointsEntry {
  return {
    id: String(e.id),
    customerId: String(e.customerId ?? ""),
    customerName: String(e.customerName ?? "Customer"),
    tier: (e.tier as CustomerTier) || "Standard",
    delta: Number(e.delta ?? 0),
    reason: String(e.reason ?? ""),
    at: e.at ? new Date(e.at as string).toISOString() : new Date().toISOString(),
  };
}

/** UI earnPerNaira (pts / ₦1000) ↔ API nairaPerPoint */
function rulesFromApi(club: Record<string, unknown>): ClubRule {
  const nairaPerPoint = Number(club.nairaPerPoint ?? 100) || 100;
  return {
    earnPerNaira: Math.max(1, Math.round(1000 / nairaPerPoint)),
    pointValueNaira: koboToNaira(Number(club.pointValueKobo ?? 500)),
    birthdayBonus: Number(club.birthdayBonus ?? 500),
    referralBonus: DEFAULT_RULES.referralBonus,
    reviewBonus: Number(club.reviewBonus ?? 50),
    signupBonus: Number(club.signupBonus ?? 250),
    expiryMonths: Number(club.expiryMonths ?? 24),
  };
}

function rulesToApi(rules: Partial<ClubRule>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (rules.earnPerNaira != null) body.nairaPerPoint = Math.max(1, Math.round(1000 / rules.earnPerNaira));
  if (rules.pointValueNaira != null) body.pointValueKobo = nairaToKobo(rules.pointValueNaira);
  if (rules.birthdayBonus != null) body.birthdayBonus = rules.birthdayBonus;
  if (rules.reviewBonus != null) body.reviewBonus = rules.reviewBonus;
  if (rules.signupBonus != null) body.signupBonus = rules.signupBonus;
  if (rules.expiryMonths != null) body.expiryMonths = rules.expiryMonths;
  return body;
}

type State = {
  tiers: ClubTier[];
  rewards: ClubReward[];
  rules: ClubRule;
  ledger: PointsEntry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  updateTier: (id: CustomerTier, patch: Partial<ClubTier>) => Promise<void>;
  updateRules: (patch: Partial<ClubRule>) => Promise<void>;
  createReward: (input: Omit<ClubReward, "id" | "createdAt" | "redeemed">) => Promise<string>;
  updateReward: (id: string, patch: Partial<ClubReward>) => Promise<void>;
  removeReward: (id: string) => Promise<void>;
  duplicateReward: (id: string) => Promise<void>;
  adjustPoints: (customerId: string, customerName: string, tier: CustomerTier, delta: number, reason: string) => Promise<void>;
};

export const useClub = create<State>()((set, get) => ({
  tiers: [],
  rewards: [],
  rules: DEFAULT_RULES,
  ledger: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const [overview, rewardsRes, ledgerRes] = await Promise.all([
        clubAdminApi.overview() as Promise<Record<string, unknown>>,
        clubAdminApi.rewards({ pageSize: 100 }),
        clubAdminApi.ledger({ pageSize: 50 }),
      ]);
      const tiersRaw = Array.isArray(overview.tiers) ? overview.tiers : [];
      const rulesRaw = (overview.rules ?? {}) as Record<string, unknown>;
      set({
        tiers: tiersRaw.map((t) => mapTier(t as Record<string, unknown>)),
        rules: rulesFromApi(rulesRaw),
        rewards: (rewardsRes.data as Record<string, unknown>[]).map(mapReward),
        ledger: (ledgerRes.data as Record<string, unknown>[]).map(mapLedger),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[club] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  updateTier: async (id, patch) => {
    set((s) => ({
      tiers: s.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
    try {
      const body: Record<string, unknown> = {};
      if (patch.name !== undefined) body.name = patch.name;
      if (patch.color !== undefined) body.color = patch.color;
      if (patch.minSpend !== undefined) body.minSpend = nairaToKobo(patch.minSpend);
      if (patch.pointsMultiplier !== undefined) body.multiplier = patch.pointsMultiplier;
      if (patch.perks !== undefined) body.perks = patch.perks;
      if (patch.active !== undefined) body.active = patch.active;
      const after = mapTier((await clubAdminApi.updateTier(id, body)) as Record<string, unknown>);
      set((s) => ({ tiers: s.tiers.map((t) => (t.id === id ? after : t)) }));
    } catch (err) {
      console.warn("[club] updateTier sync", err);
      await get().hydrate();
    }
  },
  updateRules: async (patch) => {
    set((s) => ({ rules: { ...s.rules, ...patch } }));
    try {
      const after = rulesFromApi((await clubAdminApi.updateRules(rulesToApi(patch))) as Record<string, unknown>);
      set({ rules: after });
    } catch (err) {
      console.warn("[club] updateRules sync", err);
      await get().hydrate();
    }
  },
  createReward: async (input) => {
    const created = mapReward(
      (await clubAdminApi.createReward({
        title: input.title,
        description: input.description,
        cost: input.cost,
        category: input.category,
        eligibleTiers: input.eligibleTiers,
        stock: input.stock,
        active: input.active,
        value: input.value ?? undefined,
      })) as Record<string, unknown>
    );
    set((s) => ({ rewards: [created, ...s.rewards] }));
    return created.id;
  },
  updateReward: async (id, patch) => {
    set((s) => ({
      rewards: s.rewards.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    try {
      if (patch.active !== undefined && Object.keys(patch).length === 1) {
        const updated = mapReward((await clubAdminApi.toggleReward(id)) as Record<string, unknown>);
        set((s) => ({ rewards: s.rewards.map((r) => (r.id === id ? updated : r)) }));
        return;
      }
      const updated = mapReward((await clubAdminApi.updateReward(id, patch as Record<string, unknown>)) as Record<string, unknown>);
      set((s) => ({ rewards: s.rewards.map((r) => (r.id === id ? updated : r)) }));
    } catch (err) {
      console.warn("[club] updateReward sync", err);
      await get().hydrate();
    }
  },
  removeReward: async (id) => {
    await clubAdminApi.removeReward(id);
    set((s) => ({ rewards: s.rewards.filter((r) => r.id !== id) }));
  },
  duplicateReward: async (id) => {
    const copy = mapReward((await clubAdminApi.duplicateReward(id)) as Record<string, unknown>);
    set((s) => ({ rewards: [copy, ...s.rewards] }));
  },
  adjustPoints: async (customerId, customerName, tier, delta, reason) => {
    set((s) => ({
      ledger: [
        {
          id: `pe_${Date.now()}`,
          customerId,
          customerName,
          tier,
          delta,
          reason,
          at: new Date().toISOString(),
        },
        ...s.ledger,
      ],
    }));
    try {
      await clubAdminApi.adjustPoints({ customerId, delta, reason });
      await get().hydrate();
    } catch (err) {
      console.warn("[club] adjustPoints sync", err);
      await get().hydrate();
    }
  },
}));
