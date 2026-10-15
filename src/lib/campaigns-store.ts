import { create } from "zustand";
import { campaignsAdminApi } from "@/lib/api/cms";

export type CampaignChannel = "email" | "push" | "sms" | "whatsapp" | "inapp";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused" | "archived";
export type CampaignGoal = "awareness" | "conversion" | "retention" | "winback" | "launch";

export type Campaign = {
  id: string;
  name: string;
  subject: string;
  preheader?: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  goal: CampaignGoal;
  segmentId: string;
  segmentName: string;
  audienceSize: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
  unsubscribed: number;
  body: string;
  cta: { label: string; url: string };
  utm?: { source: string; medium: string; campaign: string };
  tags: string[];
  pinned: boolean;
};

function iso(v: unknown): string | undefined {
  if (!v) return undefined;
  return new Date(v as string).toISOString();
}

function mapCampaign(c: Record<string, unknown>): Campaign {
  const status = (["draft", "scheduled", "sending", "sent", "paused", "archived"].includes(String(c.status))
    ? String(c.status)
    : "draft") as CampaignStatus;
  const ctaObj = (c.cta as { label?: string; url?: string } | undefined) ?? {};
  return {
    id: String(c.id),
    name: String(c.name ?? ""),
    subject: String(c.subject ?? ""),
    preheader: c.preheader ? String(c.preheader) : undefined,
    channel: (c.channel as CampaignChannel) || "email",
    status,
    goal: (c.goal as CampaignGoal) || "conversion",
    segmentId: String(c.segmentId ?? "seg_all"),
    segmentName: String(c.segmentName ?? "All subscribers"),
    audienceSize: Number(c.audienceSize ?? 0),
    scheduledAt: iso(c.scheduledAt),
    sentAt: iso(c.sentAt),
    createdAt: iso(c.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(c.updatedAt) ?? new Date().toISOString(),
    createdBy: String(c.createdBy ?? ""),
    sent: Number(c.sent ?? 0),
    delivered: Number(c.delivered ?? 0),
    opened: Number(c.opened ?? 0),
    clicked: Number(c.clicked ?? 0),
    converted: Number(c.converted ?? 0),
    revenue: Number(c.revenue ?? 0),
    unsubscribed: Number(c.unsubscribed ?? 0),
    body: String(c.body ?? ""),
    cta: {
      label: String(ctaObj.label ?? c.ctaLabel ?? "Shop now"),
      url: String(ctaObj.url ?? c.ctaUrl ?? "/"),
    },
    utm: c.utm as Campaign["utm"],
    tags: Array.isArray(c.tags) ? (c.tags as string[]) : [],
    pinned: !!c.pinned,
  };
}

function toBody(c: Partial<Campaign>) {
  return {
    name: c.name,
    subject: c.subject,
    preheader: c.preheader ?? null,
    channel: c.channel,
    goal: c.goal,
    segmentId: c.segmentId === "seg_all" ? null : c.segmentId ?? null,
    body: c.body,
    cta: c.cta,
    ctaLabel: c.cta?.label,
    ctaUrl: c.cta?.url,
    utm: c.utm ?? null,
    tags: c.tags,
    pinned: c.pinned,
    scheduledAt: c.scheduledAt ?? null,
  };
}

/** Map UI status targets → backend status actions / send-now */
async function applyStatus(id: string, status: CampaignStatus, cur?: Campaign) {
  if (status === "sending") {
    if (cur?.status === "paused") {
      return campaignsAdminApi.setStatus(id, { action: "resume" });
    }
    return campaignsAdminApi.sendNow(id);
  }
  if (status === "scheduled") {
    return campaignsAdminApi.setStatus(id, {
      action: "schedule",
      scheduledAt: cur?.scheduledAt ?? new Date(Date.now() + 3600_000).toISOString(),
    });
  }
  if (status === "paused") return campaignsAdminApi.setStatus(id, { action: "pause" });
  if (status === "archived") return campaignsAdminApi.setStatus(id, { action: "archive" });
  if (status === "draft") {
    if (cur?.status === "archived") return campaignsAdminApi.setStatus(id, { action: "unarchive" });
    return campaignsAdminApi.setStatus(id, { action: "unschedule" });
  }
  return campaignsAdminApi.setStatus(id, { action: "archive" });
}

type State = {
  campaigns: Campaign[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  create: (patch: Partial<Campaign>) => Promise<Campaign>;
  update: (id: string, patch: Partial<Campaign>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  setStatus: (id: string, status: CampaignStatus) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  reset: () => void;
};

export const useCampaigns = create<State>()((set, get) => ({
  campaigns: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await campaignsAdminApi.list({ pageSize: 100 });
      set({ campaigns: (data as Record<string, unknown>[]).map(mapCampaign), hydrated: true });
    } catch (err) {
      console.warn("[campaigns] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  create: async (patch) => {
    try {
      const created = mapCampaign(
        (await campaignsAdminApi.create({
          name: patch.name ?? "Untitled campaign",
          subject: patch.subject ?? "",
          channel: patch.channel ?? "email",
          goal: patch.goal ?? "conversion",
          segmentId: patch.segmentId === "seg_all" ? null : patch.segmentId ?? null,
          body: patch.body ?? "",
          cta: patch.cta ?? { label: "Shop now", url: "/" },
          tags: patch.tags ?? [],
        })) as Record<string, unknown>,
      );
      set((s) => ({ campaigns: [created, ...s.campaigns] }));
      return created;
    } catch (err) {
      console.warn("[campaigns] create", err);
      await get().hydrate();
      return {
        id: "",
        name: patch.name ?? "Untitled campaign",
        subject: patch.subject ?? "",
        channel: patch.channel ?? "email",
        status: "draft",
        goal: patch.goal ?? "conversion",
        segmentId: patch.segmentId ?? "seg_all",
        segmentName: patch.segmentName ?? "All subscribers",
        audienceSize: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "You",
        sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0, revenue: 0, unsubscribed: 0,
        body: patch.body ?? "",
        cta: patch.cta ?? { label: "Shop now", url: "/" },
        tags: patch.tags ?? [],
        pinned: false,
      };
    }
  },
  update: async (id, patch) => {
    set((s) => ({
      campaigns: s.campaigns.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
      ),
    }));
    try {
      const updated = mapCampaign(
        (await campaignsAdminApi.update(id, toBody(patch))) as Record<string, unknown>,
      );
      set((s) => ({ campaigns: s.campaigns.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[campaigns] update", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) }));
    try {
      await campaignsAdminApi.remove(id);
    } catch (err) {
      console.warn("[campaigns] remove", err);
      await get().hydrate();
    }
  },
  duplicate: async (id) => {
    try {
      const copy = mapCampaign((await campaignsAdminApi.duplicate(id)) as Record<string, unknown>);
      set((s) => ({ campaigns: [copy, ...s.campaigns] }));
    } catch (err) {
      console.warn("[campaigns] duplicate", err);
      await get().hydrate();
    }
  },
  setStatus: async (id, status) => {
    const cur = get().campaigns.find((c) => c.id === id);
    set((s) => ({
      campaigns: s.campaigns.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              updatedAt: new Date().toISOString(),
              sentAt: status === "sent" ? new Date().toISOString() : c.sentAt,
            }
          : c,
      ),
    }));
    try {
      const updated = mapCampaign((await applyStatus(id, status, cur)) as Record<string, unknown>);
      set((s) => ({ campaigns: s.campaigns.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[campaigns] setStatus", err);
      await get().hydrate();
    }
  },
  togglePin: async (id) => {
    set((s) => ({
      campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)),
    }));
    try {
      const updated = mapCampaign((await campaignsAdminApi.togglePin(id)) as Record<string, unknown>);
      set((s) => ({ campaigns: s.campaigns.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[campaigns] togglePin", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));
