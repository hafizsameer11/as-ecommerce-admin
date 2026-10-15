import { create } from "zustand";
import { notificationSettingsAdminApi } from "@/lib/api/platform";

export type Channel = "email" | "push" | "in_app" | "slack" | "sms";
export type EventCategory = "orders" | "concierge" | "catalog" | "customers" | "finance" | "system";

export type NotifRule = {
  id: string;
  category: EventCategory;
  label: string;
  description: string;
  channels: Record<Channel, boolean>;
  recipients: string[]; // role ids or emails
  priority: "low" | "normal" | "high" | "critical";
  enabled: boolean;
};

export type ChannelConfig = {
  email: { fromName: string; fromAddress: string; replyTo: string; provider: "resend" | "sendgrid" | "ses" };
  push: { enabled: boolean; sound: boolean; vibration: boolean };
  slack: { webhookUrl: string; channel: string; connected: boolean };
  sms: { provider: "twilio" | "africas_talking"; senderId: string; enabled: boolean };
};

export type QuietHours = { enabled: boolean; start: string; end: string; timezone: string; exceptCritical: boolean };
export type Digest = { enabled: boolean; frequency: "daily" | "weekly"; time: string; day: string };

const CHANNEL_IDS: Channel[] = ["email", "push", "in_app", "slack", "sms"];
const CATEGORIES_IDS: EventCategory[] = ["orders", "concierge", "catalog", "customers", "finance", "system"];
const PRIORITIES: NotifRule["priority"][] = ["low", "normal", "high", "critical"];

const emptyChannels: ChannelConfig = {
  email: { fromName: "", fromAddress: "", replyTo: "", provider: "resend" },
  push: { enabled: false, sound: true, vibration: true },
  slack: { webhookUrl: "", channel: "", connected: false },
  sms: { provider: "twilio", senderId: "", enabled: false },
};

function mapChannelsFlags(c: unknown): Record<Channel, boolean> {
  const raw = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
  return Object.fromEntries(CHANNEL_IDS.map((k) => [k, !!raw[k]])) as Record<Channel, boolean>;
}

function mapRule(r: Record<string, unknown>): NotifRule {
  const category = CATEGORIES_IDS.includes(r.category as EventCategory)
    ? (r.category as EventCategory)
    : "system";
  const priority = PRIORITIES.includes(r.priority as NotifRule["priority"])
    ? (r.priority as NotifRule["priority"])
    : "normal";
  return {
    id: String(r.id),
    category,
    label: String(r.label ?? ""),
    description: String(r.description ?? ""),
    channels: mapChannelsFlags(r.channels),
    recipients: Array.isArray(r.recipients) ? (r.recipients as string[]) : [],
    priority,
    enabled: !!r.enabled,
  };
}

function mapChannelConfig(c: unknown): ChannelConfig {
  const raw = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
  const email = (raw.email ?? {}) as Record<string, unknown>;
  const push = (raw.push ?? {}) as Record<string, unknown>;
  const slack = (raw.slack ?? {}) as Record<string, unknown>;
  const sms = (raw.sms ?? {}) as Record<string, unknown>;
  const provider = ["resend", "sendgrid", "ses"].includes(email.provider as string)
    ? (email.provider as ChannelConfig["email"]["provider"])
    : "resend";
  const smsProvider = ["twilio", "africas_talking"].includes(sms.provider as string)
    ? (sms.provider as ChannelConfig["sms"]["provider"])
    : "twilio";
  return {
    email: {
      fromName: String(email.fromName ?? ""),
      fromAddress: String(email.fromAddress ?? ""),
      replyTo: String(email.replyTo ?? ""),
      provider,
    },
    push: {
      enabled: !!push.enabled,
      sound: push.sound !== false,
      vibration: push.vibration !== false,
    },
    slack: {
      webhookUrl: String(slack.webhookUrl ?? ""),
      channel: String(slack.channel ?? ""),
      connected: !!slack.connected,
    },
    sms: {
      provider: smsProvider,
      senderId: String(sms.senderId ?? ""),
      enabled: !!sms.enabled,
    },
  };
}

function mapQuiet(q: unknown): QuietHours {
  const raw = (q && typeof q === "object" ? q : {}) as Record<string, unknown>;
  return {
    enabled: !!raw.enabled,
    start: String(raw.start ?? "22:00"),
    end: String(raw.end ?? "07:00"),
    timezone: String(raw.timezone ?? "Africa/Lagos"),
    exceptCritical: raw.exceptCritical !== false,
  };
}

function mapDigest(d: unknown): Digest {
  const raw = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
  return {
    enabled: !!raw.enabled,
    frequency: raw.frequency === "weekly" ? "weekly" : "daily",
    time: String(raw.time ?? "08:00"),
    day: String(raw.day ?? "monday"),
  };
}

type Store = {
  rules: NotifRule[];
  channels: ChannelConfig;
  quietHours: QuietHours;
  digest: Digest;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
  toggleChannel: (id: string, ch: Channel) => Promise<void>;
  setPriority: (id: string, p: NotifRule["priority"]) => Promise<void>;
  setRecipients: (id: string, r: string[]) => Promise<void>;
  updateChannels: (patch: Partial<ChannelConfig>) => Promise<void>;
  updateQuietHours: (patch: Partial<QuietHours>) => Promise<void>;
  updateDigest: (patch: Partial<Digest>) => Promise<void>;
  sendTest: (ch: Channel) => Promise<void>;
};

function applyRule(id: string, rule: NotifRule) {
  return (s: Store) => ({
    rules: s.rules.map((r) => (r.id === id ? rule : r)),
  });
}

export const useNotifSettings = create<Store>()((set, get) => ({
  rules: [],
  channels: { ...emptyChannels },
  quietHours: { enabled: false, start: "22:00", end: "07:00", timezone: "Africa/Lagos", exceptCritical: true },
  digest: { enabled: false, frequency: "daily", time: "08:00", day: "monday" },
  hydrated: false,

  hydrate: async () => {
    try {
      const data = (await notificationSettingsAdminApi.list()) as Record<string, unknown>;
      set({
        rules: Array.isArray(data.rules)
          ? (data.rules as Record<string, unknown>[]).map(mapRule)
          : [],
        channels: mapChannelConfig(data.channels),
        quietHours: mapQuiet(data.quietHours),
        digest: mapDigest(data.digest),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[notif-settings] hydrate failed", err);
      set({ hydrated: true });
    }
  },

  toggleRule: async (id) => {
    const prev = get().rules.find((r) => r.id === id);
    if (prev) {
      set(applyRule(id, { ...prev, enabled: !prev.enabled }));
    }
    try {
      const updated = mapRule((await notificationSettingsAdminApi.toggleRule(id)) as Record<string, unknown>);
      set(applyRule(id, updated));
    } catch (err) {
      console.warn("[notif-settings] toggleRule failed", err);
      if (prev) set(applyRule(id, prev));
    }
  },

  toggleChannel: async (id, ch) => {
    const prev = get().rules.find((r) => r.id === id);
    if (prev) {
      set(applyRule(id, { ...prev, channels: { ...prev.channels, [ch]: !prev.channels[ch] } }));
    }
    try {
      const updated = mapRule(
        (await notificationSettingsAdminApi.toggleChannel(id, ch)) as Record<string, unknown>,
      );
      set(applyRule(id, updated));
    } catch (err) {
      console.warn("[notif-settings] toggleChannel failed", err);
      if (prev) set(applyRule(id, prev));
    }
  },

  setPriority: async (id, p) => {
    const prev = get().rules.find((r) => r.id === id);
    if (prev) set(applyRule(id, { ...prev, priority: p }));
    try {
      const updated = mapRule(
        (await notificationSettingsAdminApi.update(id, { priority: p })) as Record<string, unknown>,
      );
      set(applyRule(id, updated));
    } catch (err) {
      console.warn("[notif-settings] setPriority failed", err);
      if (prev) set(applyRule(id, prev));
    }
  },

  setRecipients: async (id, recipients) => {
    const prev = get().rules.find((r) => r.id === id);
    if (prev) set(applyRule(id, { ...prev, recipients }));
    try {
      const updated = mapRule(
        (await notificationSettingsAdminApi.update(id, { recipients })) as Record<string, unknown>,
      );
      set(applyRule(id, updated));
    } catch (err) {
      console.warn("[notif-settings] setRecipients failed", err);
      if (prev) set(applyRule(id, prev));
    }
  },

  updateChannels: async (patch) => {
    const next = { ...get().channels, ...patch } as ChannelConfig;
    set({ channels: next });
    try {
      const after = mapChannelConfig(await notificationSettingsAdminApi.updateChannels(patch as Record<string, unknown>));
      set({ channels: after });
    } catch (err) {
      console.warn("[notif-settings] updateChannels failed", err);
      void get().hydrate();
    }
  },

  updateQuietHours: async (patch) => {
    set({ quietHours: { ...get().quietHours, ...patch } });
    try {
      const after = mapQuiet(await notificationSettingsAdminApi.updateQuietHours(patch as Record<string, unknown>));
      set({ quietHours: after });
    } catch (err) {
      console.warn("[notif-settings] updateQuietHours failed", err);
      void get().hydrate();
    }
  },

  updateDigest: async (patch) => {
    set({ digest: { ...get().digest, ...patch } });
    try {
      const after = mapDigest(await notificationSettingsAdminApi.updateDigest(patch as Record<string, unknown>));
      set({ digest: after });
    } catch (err) {
      console.warn("[notif-settings] updateDigest failed", err);
      void get().hydrate();
    }
  },

  sendTest: async (ch) => {
    await notificationSettingsAdminApi.test(ch);
  },
}));

export const CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: "orders", label: "Orders & sales" },
  { id: "concierge", label: "Concierge" },
  { id: "catalog", label: "Catalog & inventory" },
  { id: "customers", label: "Customers & support" },
  { id: "finance", label: "Finance" },
  { id: "system", label: "System & security" },
];

export const CHANNELS: { id: Channel; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "push", label: "Push" },
  { id: "in_app", label: "In-app" },
  { id: "slack", label: "Slack" },
  { id: "sms", label: "SMS" },
];
