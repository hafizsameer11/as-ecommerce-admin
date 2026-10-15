import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, IconButton, StatusPill, Toolbar } from "./ui";
import {
  useMessaging, type Template, type MsgChannel, type MsgCategory, type MsgStatus, type PushBlast,
} from "@/lib/messaging-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Mail, Bell, MessageCircle, Smartphone, Search, X, Check, Copy, Play, Pause,
  Send, Plus, Download, Zap, Eye, MousePointerClick, AlertTriangle, Clock,
  Trash2, Sparkles, ChevronRight, Code2,
} from "lucide-react";

const CHANNEL_META: Record<MsgChannel, { label: string; Icon: typeof Mail; tone: string }> = {
  email: { label: "Email", Icon: Mail, tone: "bg-sky-50 text-sky-700 border-sky-200" },
  push: { label: "Push", Icon: Bell, tone: "bg-violet-50 text-violet-700 border-violet-200" },
  sms: { label: "SMS", Icon: Smartphone, tone: "bg-ink text-white border-ink" },
  whatsapp: { label: "WhatsApp", Icon: MessageCircle, tone: "bg-lime-50 text-lime-700 border-lime-200" },
};

const CATEGORY_LABEL: Record<MsgCategory, string> = {
  transactional: "Transactional",
  lifecycle: "Lifecycle",
  concierge: "Concierge",
  system: "System",
};

const STATUS_LABEL: Record<MsgStatus, string> = {
  active: "Active", draft: "Draft", paused: "Paused",
};

type Tab = "templates" | "push";

export function AdminMessaging() {
  const [tab, setTab] = useState<Tab>("templates");
  const hydrate = useMessaging((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Push & Email"
        subtitle="Transactional templates and push notification console. Everything the app sends automatically or on demand."
      />

      <div className="flex items-center gap-1 border-b border-black/[0.08] mb-5 overflow-x-auto no-scrollbar">
        <TabBtn active={tab === "templates"} onClick={() => setTab("templates")}>
          <Mail className="h-3.5 w-3.5" /> Templates
        </TabBtn>
        <TabBtn active={tab === "push"} onClick={() => setTab("push")}>
          <Bell className="h-3.5 w-3.5" /> Push console
        </TabBtn>
      </div>

      {tab === "templates" ? <TemplatesTab /> : <PushTab />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
        active ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
      }`}>
      {children}
    </button>
  );
}

/* ============================ TEMPLATES ============================ */

function TemplatesTab() {
  const { templates, updateTemplate, duplicateTemplate, setStatus } = useMessaging();
  const [channel, setChannel] = useState<"all" | MsgChannel>("all");
  const [category, setCategory] = useState<"all" | MsgCategory>("all");
  const [status, setStatusFilter] = useState<"all" | MsgStatus>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => templates
    .filter((t) => channel === "all" || t.channel === channel)
    .filter((t) => category === "all" || t.category === category)
    .filter((t) => status === "all" || t.status === status)
    .filter((t) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return [t.name, t.code, t.subject, t.body].filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    })
    .sort((a, b) => b.sentLast30 - a.sentLast30),
    [templates, channel, category, status, q]);

  const kpis = useMemo(() => {
    const sent = templates.reduce((s, t) => s + t.sentLast30, 0);
    const weighted = templates.reduce((s, t) => s + t.openRate * t.sentLast30, 0);
    const click = templates.reduce((s, t) => s + t.clickRate * t.sentLast30, 0);
    const bounce = templates.reduce((s, t) => s + t.bounceRate * t.sentLast30, 0);
    return {
      active: templates.filter((t) => t.status === "active").length,
      sent, openRate: sent ? weighted / sent : 0,
      clickRate: sent ? click / sent : 0,
      bounceRate: sent ? bounce / sent : 0,
    };
  }, [templates]);

  const open = templates.find((t) => t.id === openId) || null;

  const exportCSV = () => downloadCSV("messaging-templates.csv", list.map((t) => ({
    Code: t.code, Name: t.name, Channel: t.channel, Category: t.category, Status: t.status,
    Subject: t.subject ?? "", Trigger: t.trigger, Sent30d: t.sentLast30,
    OpenRate: `${(t.openRate * 100).toFixed(1)}%`,
    ClickRate: `${(t.clickRate * 100).toFixed(1)}%`,
    BounceRate: `${(t.bounceRate * 100).toFixed(2)}%`,
    Updated: t.updatedAt.slice(0, 10),
  })));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KPI label="Active templates" value={kpis.active.toString()} Icon={Zap} tone="text-ink" />
        <KPI label="Sent (30d)" value={kpis.sent.toLocaleString()} Icon={Send} />
        <KPI label="Open rate" value={`${(kpis.openRate * 100).toFixed(1)}%`} Icon={Eye} />
        <KPI label="Click rate" value={`${(kpis.clickRate * 100).toFixed(1)}%`} Icon={MousePointerClick} />
        <KPI label="Bounce" value={`${(kpis.bounceRate * 100).toFixed(2)}%`} Icon={AlertTriangle} tone={kpis.bounceRate > 0.01 ? "text-amber-700" : "text-ink"} />
      </div>

      <Toolbar>
        <div className="flex-1 min-w-[220px] max-w-md h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, code, subject…"
            className="flex-1 bg-transparent outline-none text-[13px]" />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>

        <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
          <select value={channel} onChange={(e) => setChannel(e.target.value as "all" | MsgChannel)} className="bg-transparent outline-none pr-1">
            <option value="all">All channels</option>
            {(Object.keys(CHANNEL_META) as MsgChannel[]).map((c) => (
              <option key={c} value={c}>{CHANNEL_META[c].label}</option>
            ))}
          </select>
        </div>
        <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
          <select value={category} onChange={(e) => setCategory(e.target.value as "all" | MsgCategory)} className="bg-transparent outline-none pr-1">
            <option value="all">All categories</option>
            {(Object.keys(CATEGORY_LABEL) as MsgCategory[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>
        <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
          <select value={status} onChange={(e) => setStatusFilter(e.target.value as "all" | MsgStatus)} className="bg-transparent outline-none pr-1">
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_LABEL) as MsgStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <button onClick={exportCSV} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </Toolbar>

      {list.length === 0 ? (
        <Card><Empty title="No templates match" sub="Adjust the filters to find what you need." /></Card>
      ) : (
        <div className="space-y-2">
          {list.map((t) => (
            <TemplateRow key={t.id} template={t}
              onOpen={() => setOpenId(t.id)}
              onSetStatus={(s) => setStatus(t.id, s)}
              onDuplicate={async () => { const c = await duplicateTemplate(t.id); if (c) setOpenId(c.id); }} />
          ))}
        </div>
      )}

      {open && (
        <TemplateDrawer key={open.id} template={open}
          onClose={() => setOpenId(null)}
          onSave={(patch) => updateTemplate(open.id, patch)}
          onSetStatus={(s) => setStatus(open.id, s)}
          onDuplicate={async () => { const c = await duplicateTemplate(open.id); if (c) setOpenId(c.id); }} />
      )}
    </>
  );
}

function TemplateRow({ template, onOpen, onSetStatus, onDuplicate }: {
  template: Template;
  onOpen: () => void;
  onSetStatus: (s: MsgStatus) => void;
  onDuplicate: () => void;
}) {
  const meta = CHANNEL_META[template.channel];
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="p-4 flex items-center gap-4 flex-wrap">
        <div className={`h-10 w-10 rounded-md grid place-items-center border ${meta.tone}`}>
          <meta.Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onOpen} className="font-display font-bold text-[13.5px] hover:underline text-left">{template.name}</button>
            <StatusPill status={STATUS_LABEL[template.status]} />
            <Chip tone="neutral">{CATEGORY_LABEL[template.category]}</Chip>
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <code className="font-sans text-[11px] px-1.5 py-0.5 bg-black/[0.04] rounded">{template.code}</code>
            <span className="hidden sm:inline">·</span>
            <span className="truncate">{template.trigger}</span>
          </div>
        </div>
        <div className="hidden md:grid grid-cols-4 gap-2 text-center min-w-[320px]">
          <MiniStat label="Sent 30d" value={template.sentLast30.toLocaleString()} />
          <MiniStat label="Open" value={`${(template.openRate * 100).toFixed(0)}%`} />
          <MiniStat label="Click" value={`${(template.clickRate * 100).toFixed(0)}%`} />
          <MiniStat label="Bounce" value={`${(template.bounceRate * 100).toFixed(2)}%`}
            tone={template.bounceRate > 0.01 ? "text-amber-700" : ""} />
        </div>
        <div className="flex items-center gap-1.5">
          {template.status === "active" ? (
            <button onClick={() => onSetStatus("paused")} className="h-8 px-2.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[11.5px] font-semibold flex items-center gap-1">
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          ) : (
            <button onClick={() => onSetStatus("active")} className="h-8 px-2.5 rounded-md border border-border bg-muted text-ink text-[11.5px] font-semibold flex items-center gap-1">
              <Play className="h-3.5 w-3.5" /> Activate
            </button>
          )}
          <IconButton onClick={onDuplicate} title="Duplicate"><Copy className="h-3.5 w-3.5" /></IconButton>
          <button onClick={onOpen} className="h-8 px-3 rounded-md bg-ink text-white text-[11.5px] font-semibold hover:bg-black flex items-center gap-1">
            Edit <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function TemplateDrawer({ template, onClose, onSave, onSetStatus, onDuplicate }: {
  template: Template;
  onClose: () => void;
  onSave: (patch: Partial<Template>) => void;
  onSetStatus: (s: MsgStatus) => void;
  onDuplicate: () => void;
}) {
  const [form, setForm] = useState({ ...template });
  const [saved, setSaved] = useState(false);
  const meta = CHANNEL_META[form.channel];
  const patch = <K extends keyof Template>(k: K, v: Template[K]) => setForm({ ...form, [k]: v });
  const save = () => { onSave(form); setSaved(true); setTimeout(() => setSaved(false), 1500); };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[640px] bg-white z-50 shadow-2xl flex flex-col">
        <div className="h-14 px-5 border-b border-black/[0.08] flex items-center justify-between shrink-0">
          <div className="min-w-0 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-md grid place-items-center border ${meta.tone}`}>
              <meta.Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">{meta.label} · {CATEGORY_LABEL[form.category]}</div>
              <div className="font-display font-bold text-[15px] leading-tight truncate">{form.name}</div>
            </div>
          </div>
          <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {form.status !== "active" && (
              <button onClick={() => onSetStatus("active")} className="h-8 px-3 rounded-md border border-border bg-muted text-ink text-[12px] font-semibold flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" /> Activate
              </button>
            )}
            {form.status === "active" && (
              <button onClick={() => onSetStatus("paused")} className="h-8 px-3 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[12px] font-semibold flex items-center gap-1.5">
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
            )}
            <button onClick={onDuplicate} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-black/[0.04]">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button
              onClick={() => alert(`Test send queued for ${meta.label.toLowerCase()} template "${form.name}".`)}
              className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-black/[0.04]">
              <Send className="h-3.5 w-3.5" /> Send test
            </button>
          </div>

          <Section title="Preview">
            <TemplatePreview template={form} />
          </Section>

          <Section title="Trigger">
            <div className="rounded-md border border-black/[0.08] bg-[#faf8f3] p-3 text-[12.5px] leading-relaxed">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3.5 w-3.5 text-gold" />
                <span className="font-semibold">When this fires</span>
              </div>
              <p className="text-muted-foreground">{form.trigger}</p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Code2 className="h-3 w-3" />
                <code className="font-sans">{form.code}</code>
              </div>
            </div>
          </Section>

          <Section title="Content">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Name (internal)" value={form.name} onChange={(v) => patch("name", v)} span={2} />
              {(form.channel === "email" || form.channel === "push") && (
                <>
                  <Field label={form.channel === "email" ? "Subject" : "Title"} value={form.subject ?? ""} onChange={(v) => patch("subject", v)} span={2} />
                  {form.channel === "email" && (
                    <Field label="Preheader" value={form.preheader ?? ""} onChange={(v) => patch("preheader", v)} span={2} />
                  )}
                </>
              )}
              <label className="col-span-2 block">
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Body</div>
                <textarea value={form.body} onChange={(e) => patch("body", e.target.value)} rows={6}
                  className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-y font-sans" />
              </label>
              <Field label="CTA label" value={form.cta ?? ""} onChange={(v) => patch("cta", v)} />
              <Field label="Link" value={form.linkTo ?? ""} onChange={(v) => patch("linkTo", v)} />
            </div>
          </Section>

          <Section title="Available variables">
            <div className="flex flex-wrap gap-1.5">
              {form.variables.length === 0 && <span className="text-[12px] text-muted-foreground">None</span>}
              {form.variables.map((v) => (
                <code key={v} className="font-sans text-[11.5px] px-2 py-1 rounded bg-black/[0.04] border border-black/10">{`{{${v}}}`}</code>
              ))}
            </div>
          </Section>

          <Section title="Deliverability (last 30 days)">
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat label="Sent" value={template.sentLast30.toLocaleString()} />
              <Stat label="Open rate" value={`${(template.openRate * 100).toFixed(1)}%`} />
              <Stat label="Click rate" value={`${(template.clickRate * 100).toFixed(1)}%`} />
              <Stat label="Bounce" value={`${(template.bounceRate * 100).toFixed(2)}%`}
                tone={template.bounceRate > 0.01 ? "text-amber-700" : ""} />
            </div>
          </Section>

          <Section title="Internal notes">
            <textarea value={form.notes ?? ""} onChange={(e) => patch("notes", e.target.value)} rows={3}
              placeholder="Legal approval, dependencies, A/B history…"
              className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-none" />
          </Section>
        </div>

        <div className="border-t border-black/[0.08] p-4 flex items-center gap-2 shrink-0">
          <button onClick={onClose} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Cancel</button>
          <button onClick={save} className="h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
            {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : "Save changes"}
          </button>
        </div>
      </aside>
    </>
  );
}

function TemplatePreview({ template }: { template: Template }) {
  const meta = CHANNEL_META[template.channel];
  if (template.channel === "email") {
    return (
      <div className="rounded-lg overflow-hidden border border-black/[0.08] bg-white">
        <div className="px-4 py-3 border-b border-black/[0.06] bg-[#faf8f3]">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Subject</div>
          <div className="font-display font-bold text-[15px] mt-0.5">{template.subject || " - "}</div>
          {template.preheader && <div className="text-[12px] text-muted-foreground mt-0.5 truncate">{template.preheader}</div>}
        </div>
        <div className="p-6 bg-white">
          <div className="text-center mb-5">
            <div className="font-display text-[15px] tracking-[0.18em] font-bold whitespace-nowrap">ASL ORIGINALS</div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Originals</div>
          </div>
          <div className="text-[13px] leading-relaxed whitespace-pre-line text-ink">{template.body}</div>
          {template.cta && (
            <div className="mt-5 text-center">
              <span className="inline-block px-5 py-2.5 bg-ink text-white text-[12px] font-semibold uppercase tracking-wider rounded">{template.cta}</span>
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-black/[0.06] text-[10.5px] text-center text-muted-foreground">
            ASL ORIGINALS · Lagos, Nigeria · You are receiving this because you have an account with us.
          </div>
        </div>
      </div>
    );
  }
  if (template.channel === "push") {
    return (
      <div className="rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 p-4 max-w-sm mx-auto">
        <div className="rounded-xl bg-white/95 backdrop-blur p-3 flex gap-3">
          <div className="h-10 w-10 rounded-md bg-ink grid place-items-center shrink-0">
            <div className="font-display text-[10px] text-gold tracking-widest font-bold whitespace-nowrap">ASL ORIGINALS</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="font-semibold">ASL ORIGINALS</span>
              <span>· now</span>
            </div>
            <div className="font-semibold text-[13px] mt-0.5">{template.subject || " - "}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">{template.body}</div>
          </div>
        </div>
      </div>
    );
  }
  if (template.channel === "sms") {
    return (
      <div className="rounded-2xl bg-slate-100 p-4 max-w-sm mx-auto">
        <div className="text-[10px] text-center text-muted-foreground mb-2">SMS · ASL ORIGINALS</div>
        <div className="rounded-2xl bg-white border border-black/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed">
          {template.body}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-[#075e54]/5 p-4 max-w-sm mx-auto">
      <div className="text-[10px] text-center text-muted-foreground mb-2 flex items-center justify-center gap-1">
        <meta.Icon className="h-3 w-3" /> WhatsApp Business
      </div>
      <div className="rounded-lg bg-white border border-border px-3.5 py-2.5 text-[13px] leading-relaxed">
        {template.body}
      </div>
    </div>
  );
}

/* ============================ PUSH CONSOLE ============================ */

function PushTab() {
  const { blasts, createBlast, updateBlast, deleteBlast, sendBlastNow } = useMessaging();
  const [showNew, setShowNew] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const sent = blasts.filter((b) => b.status === "sent");
    const totalSent = sent.reduce((s, b) => s + b.recipients, 0);
    const totalOpens = sent.reduce((s, b) => s + b.opens, 0);
    return {
      scheduled: blasts.filter((b) => b.status === "scheduled").length,
      sent30: totalSent,
      openRate: totalSent ? (totalOpens / totalSent) * 100 : 0,
      drafts: blasts.filter((b) => b.status === "draft").length,
    };
  }, [blasts]);

  const open = blasts.find((b) => b.id === openId) || null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Scheduled" value={kpis.scheduled.toString()} Icon={Clock} />
        <KPI label="Sent (recent)" value={kpis.sent30.toLocaleString()} Icon={Send} />
        <KPI label="Open rate" value={`${kpis.openRate.toFixed(1)}%`} Icon={Eye} tone="text-ink" />
        <KPI label="Drafts" value={kpis.drafts.toString()} Icon={Sparkles} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="font-display font-bold text-[15px] flex items-center gap-2">
          <Bell className="h-4 w-4" /> Push notification history
        </div>
        <button onClick={() => setShowNew(true)} className="h-9 px-3 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New push
        </button>
      </div>

      {blasts.length === 0 ? (
        <Card><Empty title="No push notifications yet" sub="Send your first push to app subscribers." /></Card>
      ) : (
        <div className="space-y-2">
          {blasts.map((b) => (
            <PushRow key={b.id} blast={b}
              onOpen={() => setOpenId(b.id)}
              onSendNow={() => sendBlastNow(b.id)}
              onDelete={() => { if (confirm(`Delete "${b.title}"?`)) deleteBlast(b.id); }} />
          ))}
        </div>
      )}

      {open && (
        <PushDrawer key={open.id} blast={open}
          onClose={() => setOpenId(null)}
          onSave={(p) => updateBlast(open.id, p)}
          onSendNow={() => { sendBlastNow(open.id); }}
          onDelete={() => { deleteBlast(open.id); setOpenId(null); }} />
      )}

      {showNew && (
        <NewPushModal onClose={() => setShowNew(false)}
          onCreate={async (p) => { const b = await createBlast(p); setShowNew(false); if (b.id) setOpenId(b.id); }} />
      )}
    </>
  );
}

function PushRow({ blast, onOpen, onSendNow, onDelete }: {
  blast: PushBlast;
  onOpen: () => void;
  onSendNow: () => void;
  onDelete: () => void;
}) {
  const openRate = blast.recipients ? (blast.opens / blast.recipients) * 100 : 0;
  return (
    <Card padded={false}>
      <div className="p-4 flex items-center gap-4 flex-wrap">
        <div className="h-10 w-10 rounded-md bg-violet-50 text-violet-700 border border-violet-200 grid place-items-center shrink-0">
          <Bell className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onOpen} className="font-display font-bold text-[13.5px] hover:underline text-left">{blast.title}</button>
            <StatusPill status={blast.status[0].toUpperCase() + blast.status.slice(1)} />
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5 truncate">{blast.body}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
            <span>Audience: <span className="text-ink font-medium">{blast.audience}</span></span>
            {blast.sentAt && <span>Sent {new Date(blast.sentAt).toLocaleString()}</span>}
            {blast.scheduledFor && <span>Scheduled {new Date(blast.scheduledFor).toLocaleString()}</span>}
          </div>
        </div>
        <div className="hidden md:grid grid-cols-3 gap-2 text-center min-w-[240px]">
          <MiniStat label="Recipients" value={blast.recipients.toLocaleString()} />
          <MiniStat label="Opens" value={blast.opens.toLocaleString()} />
          <MiniStat label="Rate" value={blast.status === "sent" ? `${openRate.toFixed(1)}%` : " - "} />
        </div>
        <div className="flex items-center gap-1.5">
          {blast.status !== "sent" && (
            <button onClick={onSendNow} className="h-8 px-2.5 rounded-md border border-border bg-muted text-ink text-[11.5px] font-semibold flex items-center gap-1">
              <Send className="h-3.5 w-3.5" /> Send now
            </button>
          )}
          <button onClick={onOpen} className="h-8 px-3 rounded-md bg-ink text-white text-[11.5px] font-semibold hover:bg-black">Edit</button>
          <IconButton onClick={onDelete} title="Delete"><Trash2 className="h-3.5 w-3.5" /></IconButton>
        </div>
      </div>
    </Card>
  );
}

function PushDrawer({ blast, onClose, onSave, onSendNow, onDelete }: {
  blast: PushBlast;
  onClose: () => void;
  onSave: (p: Partial<PushBlast>) => void;
  onSendNow: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({ ...blast });
  const [saved, setSaved] = useState(false);
  const patch = <K extends keyof PushBlast>(k: K, v: PushBlast[K]) => setForm({ ...form, [k]: v });
  const save = () => { onSave(form); setSaved(true); setTimeout(() => setSaved(false), 1500); };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-white z-50 shadow-2xl flex flex-col">
        <div className="h-14 px-5 border-b border-black/[0.08] flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Push notification</div>
            <div className="font-display font-bold text-[15px] leading-tight truncate">{form.title}</div>
          </div>
          <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <Section title="Preview">
            <TemplatePreview template={{
              id: "preview", code: "preview", name: form.title, channel: "push",
              category: "lifecycle", status: "draft",
              trigger: "", subject: form.title, body: form.body,
              variables: [], sentLast30: 0, openRate: 0, clickRate: 0, bounceRate: 0,
              createdAt: "", updatedAt: "",
            }} />
          </Section>

          <Section title="Message">
            <div className="space-y-2.5">
              <Field label="Title" value={form.title} onChange={(v) => patch("title", v)} />
              <label className="block">
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Body</div>
                <textarea value={form.body} onChange={(e) => patch("body", e.target.value)} rows={3}
                  className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-none" />
              </label>
            </div>
          </Section>

          <Section title="Audience">
            <Select value={form.audience} onChange={(v) => patch("audience", v)} options={[
              { value: "All app users", label: "All app users (~8.4k)" },
              { value: "VIP · Signature tier", label: "VIP · Signature tier (~620)" },
              { value: "Lapsed 30-day", label: "Lapsed 30-day (~4.2k)" },
              { value: "Concierge subscribers", label: "Concierge subscribers (~1.2k)" },
            ]} label="Segment" />
          </Section>

          {form.status === "sent" && (
            <Section title="Performance">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Recipients" value={form.recipients.toLocaleString()} />
                <Stat label="Opens" value={form.opens.toLocaleString()} />
                <Stat label="Rate" value={`${form.recipients ? ((form.opens / form.recipients) * 100).toFixed(1) : 0}%`} />
              </div>
            </Section>
          )}
        </div>

        <div className="border-t border-black/[0.08] p-4 flex items-center gap-2 shrink-0">
          <button onClick={onDelete} className="h-9 px-3 rounded-md border border-rose-200 bg-white text-rose-600 text-[12.5px] font-semibold hover:bg-rose-50 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          {form.status !== "sent" && (
            <button onClick={onSendNow} className="h-9 px-3 rounded-md border border-border bg-muted text-ink text-[12.5px] font-semibold flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5" /> Send now
            </button>
          )}
          <button onClick={onClose} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Cancel</button>
          <button onClick={save} className="h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
            {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : "Save"}
          </button>
        </div>
      </aside>
    </>
  );
}

function NewPushModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (p: Omit<PushBlast, "id" | "recipients" | "opens" | "createdAt">) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("All app users");
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const [scheduledFor, setScheduledFor] = useState("");

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    onCreate({
      title: title.trim(),
      body: body.trim(),
      audience,
      status: when === "schedule" ? "scheduled" : "draft",
      scheduledFor: when === "schedule" && scheduledFor
        ? new Date(scheduledFor).toISOString() : undefined,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 grid place-items-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="h-12 px-4 border-b border-black/[0.08] flex items-center justify-between">
            <div className="font-display font-bold text-[15px]">New push notification</div>
            <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
          </div>
          <div className="p-4 space-y-3">
            <Field label="Title" value={title} onChange={setTitle} />
            <label className="block">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Body</div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
                className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-none" />
            </label>
            <Select value={audience} onChange={setAudience} options={[
              { value: "All app users", label: "All app users (~8.4k)" },
              { value: "VIP · Signature tier", label: "VIP · Signature tier (~620)" },
              { value: "Lapsed 30-day", label: "Lapsed 30-day (~4.2k)" },
              { value: "Concierge subscribers", label: "Concierge subscribers (~1.2k)" },
            ]} label="Audience" />
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">When</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => setWhen("now")}
                  className={`h-9 rounded-md border text-[12.5px] font-semibold ${when === "now" ? "border-ink bg-ink text-white" : "border-black/10 bg-white"}`}>
                  Save as draft
                </button>
                <button type="button" onClick={() => setWhen("schedule")}
                  className={`h-9 rounded-md border text-[12.5px] font-semibold ${when === "schedule" ? "border-ink bg-ink text-white" : "border-black/10 bg-white"}`}>
                  Schedule
                </button>
              </div>
              {when === "schedule" && (
                <input type="datetime-local" value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full mt-2 h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink" />
              )}
            </div>
          </div>
          <div className="border-t border-black/[0.08] p-3 flex items-center gap-2">
            <button onClick={onClose} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Cancel</button>
            <button onClick={submit} disabled={!title.trim() || !body.trim()}
              className="h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black disabled:opacity-40 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================ shared bits ============================ */

function KPI({ label, value, Icon, tone = "text-ink" }: { label: string; value: string; Icon: typeof Mail; tone?: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className={`font-display text-[22px] leading-tight mt-1 ${tone}`}>{value}</div>
        </div>
        <div className="h-8 w-8 rounded-md bg-black/[0.04] grid place-items-center"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, span = 1 }: { label: string; value: string; onChange: (v: string) => void; span?: 1 | 2 }) {
  return (
    <label className={`block ${span === 2 ? "col-span-2" : ""}`}>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2 text-[13px] outline-none focus:border-ink">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#faf8f3] py-1.5">
      <div className={`font-display text-[13px] leading-tight ${tone ?? ""}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#faf8f3] py-2.5">
      <div className={`font-display text-[14px] leading-tight ${tone ?? ""}`}>{value}</div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">{label}</div>
    </div>
  );
}
