import { create } from "zustand";
import { messagingAdminApi } from "@/lib/api/cms";

export type MsgChannel = "email" | "push" | "sms" | "whatsapp";
export type MsgCategory = "transactional" | "lifecycle" | "concierge" | "system";
export type MsgStatus = "active" | "draft" | "paused";

export type Template = {
  id: string;
  code: string;
  name: string;
  channel: MsgChannel;
  category: MsgCategory;
  status: MsgStatus;
  trigger: string;
  subject?: string;
  preheader?: string;
  body: string;
  cta?: string;
  linkTo?: string;
  variables: string[];
  sentLast30: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  updatedAt: string;
  createdAt: string;
  notes?: string;
};

export type PushBlast = {
  id: string;
  title: string;
  body: string;
  audience: string;
  status: "sent" | "scheduled" | "draft";
  sentAt?: string;
  scheduledFor?: string;
  recipients: number;
  opens: number;
  createdAt: string;
};

function mapTemplate(t: Record<string, unknown>): Template {
  const status = (["active", "draft", "paused"].includes(String(t.status))
    ? String(t.status)
    : "draft") as MsgStatus;
  return {
    id: String(t.id),
    code: String(t.code ?? ""),
    name: String(t.name ?? ""),
    channel: (t.channel as MsgChannel) || "email",
    category: (t.category as MsgCategory) || "transactional",
    status,
    trigger: String(t.trigger ?? ""),
    subject: t.subject ? String(t.subject) : undefined,
    preheader: t.preheader ? String(t.preheader) : undefined,
    body: String(t.body ?? ""),
    cta: t.cta ? String(t.cta) : t.ctaLabel ? String(t.ctaLabel) : undefined,
    linkTo: t.linkTo ? String(t.linkTo) : undefined,
    variables: Array.isArray(t.variables) ? (t.variables as string[]) : [],
    sentLast30: Number(t.sentLast30 ?? t.sentCount ?? 0),
    openRate: Number(t.openRate ?? 0),
    clickRate: Number(t.clickRate ?? 0),
    bounceRate: Number(t.bounceRate ?? 0),
    updatedAt: t.updatedAt ? new Date(t.updatedAt as string).toISOString() : new Date().toISOString(),
    createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : new Date().toISOString(),
    notes: t.notes ? String(t.notes) : undefined,
  };
}

function mapBlast(b: Record<string, unknown>): PushBlast {
  const raw = String(b.status ?? "draft");
  const status = (raw === "sent" || raw === "scheduled" ? raw : "draft") as PushBlast["status"];
  return {
    id: String(b.id),
    title: String(b.title ?? ""),
    body: String(b.body ?? ""),
    audience: String(b.audienceLabel ?? b.audience ?? "All app users"),
    status,
    sentAt: b.sentAt ? new Date(b.sentAt as string).toISOString() : undefined,
    scheduledFor: b.scheduledFor ? new Date(b.scheduledFor as string).toISOString() : undefined,
    recipients: Number(b.recipients ?? 0),
    opens: Number(b.opens ?? 0),
    createdAt: b.createdAt ? new Date(b.createdAt as string).toISOString() : new Date().toISOString(),
  };
}

function audienceToApi(audience: string): { audience: "all" | "segment"; segmentId?: string } {
  if (!audience || audience === "All app users" || audience === "all") return { audience: "all" };
  return { audience: "all" };
}

type State = {
  templates: Template[];
  blasts: PushBlast[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  updateTemplate: (id: string, patch: Partial<Template>) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<Template | undefined>;
  setStatus: (id: string, status: MsgStatus) => Promise<void>;
  createBlast: (b: Omit<PushBlast, "id" | "recipients" | "opens" | "createdAt">) => Promise<PushBlast>;
  updateBlast: (id: string, patch: Partial<PushBlast>) => Promise<void>;
  deleteBlast: (id: string) => Promise<void>;
  sendBlastNow: (id: string) => Promise<void>;
  reset: () => void;
};

export const useMessaging = create<State>()((set, get) => ({
  templates: [],
  blasts: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const [tplRes, blastRes] = await Promise.all([
        messagingAdminApi.templates({ pageSize: 100 }),
        messagingAdminApi.blasts({ pageSize: 100 }),
      ]);
      set({
        templates: (tplRes.data as Record<string, unknown>[]).map(mapTemplate),
        blasts: (blastRes.data as Record<string, unknown>[]).map(mapBlast),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[messaging] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  updateTemplate: async (id, patch) => {
    set((st) => ({
      templates: st.templates.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      ),
    }));
    try {
      const body: Record<string, unknown> = {
        name: patch.name,
        subject: patch.subject,
        preheader: patch.preheader,
        body: patch.body,
        cta: patch.cta,
        ctaLabel: patch.cta,
        linkTo: patch.linkTo,
        status: patch.status,
        trigger: patch.trigger,
        notes: patch.notes,
      };
      Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
      const updated = mapTemplate((await messagingAdminApi.updateTemplate(id, body)) as Record<string, unknown>);
      set((st) => ({ templates: st.templates.map((t) => (t.id === id ? updated : t)) }));
    } catch (err) {
      console.warn("[messaging] updateTemplate", err);
      await get().hydrate();
    }
  },
  duplicateTemplate: async (id) => {
    try {
      const copy = mapTemplate(
        (await messagingAdminApi.duplicateTemplate(id)) as Record<string, unknown>,
      );
      set((st) => ({ templates: [copy, ...st.templates] }));
      return copy;
    } catch (err) {
      console.warn("[messaging] duplicateTemplate", err);
      await get().hydrate();
      return undefined;
    }
  },
  setStatus: async (id, status) => {
    set((st) => ({
      templates: st.templates.map((t) =>
        t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t,
      ),
    }));
    try {
      const updated = mapTemplate(
        (await messagingAdminApi.setTemplateStatus(id, status)) as Record<string, unknown>,
      );
      set((st) => ({ templates: st.templates.map((t) => (t.id === id ? updated : t)) }));
    } catch (err) {
      console.warn("[messaging] setStatus", err);
      await get().hydrate();
    }
  },
  createBlast: async (payload) => {
    try {
      const apiAud = audienceToApi(payload.audience);
      const created = mapBlast(
        (await messagingAdminApi.createBlast({
          title: payload.title,
          body: payload.body,
          ...apiAud,
          status: payload.status === "scheduled" ? "scheduled" : "draft",
          scheduledFor: payload.scheduledFor ?? null,
        })) as Record<string, unknown>,
      );
      set((st) => ({ blasts: [created, ...st.blasts] }));
      return created;
    } catch (err) {
      console.warn("[messaging] createBlast", err);
      await get().hydrate();
      return {
        ...payload,
        id: "",
        recipients: 0,
        opens: 0,
        createdAt: new Date().toISOString(),
      };
    }
  },
  updateBlast: async (id, patch) => {
    set((st) => ({
      blasts: st.blasts.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
    try {
      const body: Record<string, unknown> = {
        title: patch.title,
        body: patch.body,
        scheduledFor: patch.scheduledFor ?? undefined,
      };
      if (patch.audience) Object.assign(body, audienceToApi(patch.audience));
      Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
      const updated = mapBlast((await messagingAdminApi.updateBlast(id, body)) as Record<string, unknown>);
      set((st) => ({ blasts: st.blasts.map((b) => (b.id === id ? updated : b)) }));
    } catch (err) {
      console.warn("[messaging] updateBlast", err);
      await get().hydrate();
    }
  },
  deleteBlast: async (id) => {
    set((st) => ({ blasts: st.blasts.filter((b) => b.id !== id) }));
    try {
      await messagingAdminApi.removeBlast(id);
    } catch (err) {
      console.warn("[messaging] deleteBlast", err);
      await get().hydrate();
    }
  },
  sendBlastNow: async (id) => {
    set((st) => ({
      blasts: st.blasts.map((b) =>
        b.id === id ? { ...b, status: "sent" as const, sentAt: new Date().toISOString() } : b,
      ),
    }));
    try {
      const updated = mapBlast((await messagingAdminApi.sendBlastNow(id)) as Record<string, unknown>);
      set((st) => ({ blasts: st.blasts.map((b) => (b.id === id ? updated : b)) }));
    } catch (err) {
      console.warn("[messaging] sendBlastNow", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));
