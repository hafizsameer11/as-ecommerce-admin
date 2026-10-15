import { create } from "zustand";
import { referralsAdminApi, koboToNaira, nairaToKobo } from "@/lib/api/loyalty";

export type ReferralStatus = "pending" | "qualified" | "rewarded" | "expired" | "flagged";
export type RewardType = "credit" | "percent" | "fixed" | "points";

export type ProgramConfig = {
  enabled: boolean;
  advocateReward: { type: RewardType; value: number };
  friendReward: { type: RewardType; value: number };
  qualifyingSpendMinor: number;
  cookieWindowDays: number;
  maxRewardsPerAdvocate: number;
  requireFirstOrder: boolean;
  autoApproveWithinLimit: boolean;
  fraudScoreThreshold: number;
  landingHeadline: string;
  landingSubhead: string;
};

export type Advocate = {
  id: string;
  name: string;
  email: string;
  tier: "Standard" | "Silver" | "Gold" | "Signature";
  code: string;
  joinedAt: string;
  clicks: number;
  signups: number;
  qualified: number;
  rewardsEarnedMinor: number;
  revenueDrivenMinor: number;
  status: "active" | "paused" | "banned";
};

export type Referral = {
  id: string;
  advocateId: string;
  advocateName: string;
  friendName: string;
  friendEmail: string;
  channel: "link" | "whatsapp" | "email" | "sms" | "instagram";
  status: ReferralStatus;
  orderId?: string;
  spendMinor: number;
  rewardMinor: number;
  fraudScore: number;
  createdAt: string;
  updatedAt: string;
  note?: string;
};

const DEFAULT_CONFIG: ProgramConfig = {
  enabled: true,
  advocateReward: { type: "credit", value: 15000 },
  friendReward: { type: "percent", value: 10 },
  qualifyingSpendMinor: 50_000,
  cookieWindowDays: 30,
  maxRewardsPerAdvocate: 20,
  requireFirstOrder: true,
  autoApproveWithinLimit: true,
  fraudScoreThreshold: 65,
  landingHeadline: "Share ASL. Earn credits.",
  landingSubhead:
    "Give friends 10% off their first order. Earn ₦15,000 in wallet credit for every qualifying purchase.",
};

function mapConfig(c: Record<string, unknown>): ProgramConfig {
  const adv = (c.advocateReward ?? {}) as { type?: RewardType; value?: number };
  const friend = (c.friendReward ?? {}) as { type?: RewardType; value?: number };
  const advType = (adv.type ?? "credit") as RewardType;
  const friendType = (friend.type ?? "percent") as RewardType;
  const moneyTypes = new Set(["credit", "fixed"]);
  return {
    enabled: c.enabled !== false,
    advocateReward: {
      type: advType,
      value: moneyTypes.has(advType) ? koboToNaira(Number(adv.value ?? 0)) : Number(adv.value ?? 0),
    },
    friendReward: {
      type: friendType,
      value: moneyTypes.has(friendType) ? koboToNaira(Number(friend.value ?? 0)) : Number(friend.value ?? 0),
    },
    qualifyingSpendMinor: koboToNaira(Number(c.qualifyingSpend ?? c.qualifyingSpendMinor ?? 0)),
    cookieWindowDays: Number(c.cookieWindowDays ?? 30),
    maxRewardsPerAdvocate: Number(c.maxRewardsPerAdvocate ?? 20),
    requireFirstOrder: c.requireFirstOrder !== false,
    autoApproveWithinLimit: c.autoApproveWithinLimit !== false,
    fraudScoreThreshold: Number(c.fraudScoreThreshold ?? 65),
    landingHeadline: String(c.landingHeadline ?? DEFAULT_CONFIG.landingHeadline),
    landingSubhead: String(c.landingSubhead ?? DEFAULT_CONFIG.landingSubhead),
  };
}

function configToApi(patch: Partial<ProgramConfig>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.enabled !== undefined) body.enabled = patch.enabled;
  if (patch.advocateReward) {
    const money = patch.advocateReward.type === "credit" || patch.advocateReward.type === "fixed";
    body.advocateReward = {
      type: patch.advocateReward.type,
      value: money ? nairaToKobo(patch.advocateReward.value) : patch.advocateReward.value,
    };
  }
  if (patch.friendReward) {
    const money = patch.friendReward.type === "credit" || patch.friendReward.type === "fixed";
    body.friendReward = {
      type: patch.friendReward.type,
      value: money ? nairaToKobo(patch.friendReward.value) : patch.friendReward.value,
    };
  }
  if (patch.qualifyingSpendMinor !== undefined) body.qualifyingSpend = nairaToKobo(patch.qualifyingSpendMinor);
  if (patch.cookieWindowDays !== undefined) body.cookieWindowDays = patch.cookieWindowDays;
  if (patch.maxRewardsPerAdvocate !== undefined) body.maxRewardsPerAdvocate = patch.maxRewardsPerAdvocate;
  if (patch.requireFirstOrder !== undefined) body.requireFirstOrder = patch.requireFirstOrder;
  if (patch.autoApproveWithinLimit !== undefined) body.autoApproveWithinLimit = patch.autoApproveWithinLimit;
  if (patch.fraudScoreThreshold !== undefined) body.fraudScoreThreshold = patch.fraudScoreThreshold;
  if (patch.landingHeadline !== undefined) body.landingHeadline = patch.landingHeadline;
  if (patch.landingSubhead !== undefined) body.landingSubhead = patch.landingSubhead;
  return body;
}

function mapAdvocate(a: Record<string, unknown>): Advocate {
  return {
    id: String(a.id),
    name: String(a.name ?? ""),
    email: String(a.email ?? ""),
    tier: (a.tier as Advocate["tier"]) || "Standard",
    code: String(a.code ?? ""),
    joinedAt: a.joinedAt ? new Date(a.joinedAt as string).toISOString() : new Date().toISOString(),
    clicks: Number(a.clicks ?? 0),
    signups: Number(a.signups ?? 0),
    qualified: Number(a.qualified ?? 0),
    rewardsEarnedMinor: koboToNaira(Number(a.rewardsEarnedMinor ?? 0)),
    revenueDrivenMinor: koboToNaira(Number(a.revenueDrivenMinor ?? 0)),
    status: (a.status as Advocate["status"]) || "active",
  };
}

function mapReferral(r: Record<string, unknown>): Referral {
  const channel = String(r.channel ?? "link");
  const allowed = ["link", "whatsapp", "email", "sms", "instagram"];
  return {
    id: String(r.id),
    advocateId: String(r.advocateId ?? ""),
    advocateName: String(r.advocateName ?? ""),
    friendName: String(r.friendName ?? ""),
    friendEmail: String(r.friendEmail ?? ""),
    channel: (allowed.includes(channel) ? channel : "link") as Referral["channel"],
    status: (r.status as ReferralStatus) || "pending",
    orderId: r.orderNumber ? String(r.orderNumber) : r.orderId ? String(r.orderId) : undefined,
    spendMinor: koboToNaira(Number(r.spendMinor ?? r.spend ?? 0)),
    rewardMinor: koboToNaira(Number(r.rewardMinor ?? r.reward ?? 0)),
    fraudScore: Number(r.fraudScore ?? 0),
    createdAt: r.createdAt ? new Date(r.createdAt as string).toISOString() : new Date().toISOString(),
    updatedAt: r.updatedAt ? new Date(r.updatedAt as string).toISOString() : new Date().toISOString(),
    note: r.note ? String(r.note) : undefined,
  };
}

type State = {
  config: ProgramConfig;
  advocates: Advocate[];
  referrals: Referral[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  updateConfig: (patch: Partial<ProgramConfig>) => Promise<void>;
  setAdvocateStatus: (id: string, status: Advocate["status"]) => Promise<void>;
  setReferralStatus: (id: string, status: ReferralStatus) => void;
  approveReferral: (id: string) => Promise<void>;
  rejectReferral: (id: string) => Promise<void>;
  reset: () => void;
};

export const useReferrals = create<State>()((set, get) => ({
  config: DEFAULT_CONFIG,
  advocates: [],
  referrals: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const [config, advocatesRes, referralsRes] = await Promise.all([
        referralsAdminApi.config() as Promise<Record<string, unknown>>,
        referralsAdminApi.advocates({ pageSize: 100 }),
        referralsAdminApi.list({ pageSize: 100 }),
      ]);
      set({
        config: mapConfig(config),
        advocates: (advocatesRes.data as Record<string, unknown>[]).map(mapAdvocate),
        referrals: (referralsRes.data as Record<string, unknown>[]).map(mapReferral),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[referrals] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  updateConfig: async (patch) => {
    set((st) => ({ config: { ...st.config, ...patch } }));
    try {
      const after = mapConfig((await referralsAdminApi.updateConfig(configToApi(patch))) as Record<string, unknown>);
      set({ config: after });
    } catch (err) {
      console.warn("[referrals] config sync", err);
      await get().hydrate();
    }
  },
  setAdvocateStatus: async (id, status) => {
    set((st) => ({
      advocates: st.advocates.map((a) => (a.id === id ? { ...a, status } : a)),
    }));
    try {
      await referralsAdminApi.setAdvocateStatus(id, status);
    } catch (err) {
      console.warn("[referrals] advocate status sync", err);
      await get().hydrate();
    }
  },
  setReferralStatus: (id, status) =>
    set((st) => ({
      referrals: st.referrals.map((r) =>
        r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
      ),
    })),
  approveReferral: async (id) => {
    set((st) => ({
      referrals: st.referrals.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "rewarded" as const,
              rewardMinor: r.rewardMinor || st.config.advocateReward.value,
              updatedAt: new Date().toISOString(),
            }
          : r
      ),
    }));
    try {
      await referralsAdminApi.approve(id);
      await get().hydrate();
    } catch (err) {
      console.warn("[referrals] approve sync", err);
      await get().hydrate();
    }
  },
  rejectReferral: async (id) => {
    set((st) => ({
      referrals: st.referrals.map((r) =>
        r.id === id ? { ...r, status: "expired" as const, updatedAt: new Date().toISOString() } : r
      ),
    }));
    try {
      await referralsAdminApi.reject(id);
      await get().hydrate();
    } catch (err) {
      console.warn("[referrals] reject sync", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));
