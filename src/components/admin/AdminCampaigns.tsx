import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, IconButton, StatusPill, TableWrap, Toolbar, naira } from "./ui";
import {
  useCampaigns, type Campaign, type CampaignChannel, type CampaignStatus, type CampaignGoal,
} from "@/lib/campaigns-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Megaphone, Search, Download, Plus, Mail, Bell, MessageSquare, Smartphone, Layout,
  Play, Pause, Copy, Trash2, Pin, X, Check, Users, MousePointerClick, Eye, TrendingUp,
  Calendar, Send, Archive, Sparkles, ExternalLink, Filter as FilterIcon,
} from "lucide-react";

const CHANNEL_META: Record<CampaignChannel, { label: string; Icon: typeof Mail; tone: Parameters<typeof Chip>[0]["tone"] }> = {
  email: { label: "Email", Icon: Mail, tone: "blue" },
  push: { label: "Push", Icon: Bell, tone: "purple" },
  sms: { label: "SMS", Icon: Smartphone, tone: "amber" },
  whatsapp: { label: "WhatsApp", Icon: MessageSquare, tone: "green" },
  inapp: { label: "In-app", Icon: Layout, tone: "slate" },
};

const GOALS: { id: CampaignGoal; label: string }[] = [
  { id: "awareness", label: "Awareness" },
  { id: "conversion", label: "Conversion" },
  { id: "retention", label: "Retention" },
  { id: "winback", label: "Win-back" },
  { id: "launch", label: "Launch" },
];

type Tab = "all" | CampaignStatus;

export function AdminCampaigns() {
  const { campaigns, hydrate, create, update, remove, duplicate, setStatus, togglePin } = useCampaigns();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState<CampaignChannel | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return campaigns
      .filter((c) => {
        if (tab !== "all" && c.status !== tab) return false;
        if (channel !== "all" && c.channel !== channel) return false;
        if (!query) return true;
        return [c.name, c.subject, c.segmentName, ...c.tags].some((v) => v.toLowerCase().includes(query));
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [campaigns, tab, q, channel]);

  const kpis = useMemo(() => {
    const sent = campaigns.filter((c) => c.status === "sent" || c.status === "sending");
    const totalSent = sent.reduce((a, c) => a + c.sent, 0);
    const totalRev = sent.reduce((a, c) => a + c.revenue, 0);
    const totalOpened = sent.reduce((a, c) => a + c.opened, 0);
    const totalClicked = sent.reduce((a, c) => a + c.clicked, 0);
    return {
      active: campaigns.filter((c) => c.status === "scheduled" || c.status === "sending").length,
      totalSent,
      revenue: totalRev,
      openRate: totalSent ? (totalOpened / totalSent) * 100 : 0,
      clickRate: totalSent ? (totalClicked / totalSent) * 100 : 0,
    };
  }, [campaigns]);

  const open = campaigns.find((c) => c.id === openId) ?? null;
  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((c) => c.id)));
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkArchive = () => { selected.forEach((id) => setStatus(id, "archived")); setSelected(new Set()); };
  const bulkDelete = () => {
    if (!confirm(`Delete ${selected.size} campaigns?`)) return;
    selected.forEach((id) => remove(id));
    setSelected(new Set());
  };

  const exportCSV = () => downloadCSV("campaigns.csv", filtered.map((c) => ({
    Name: c.name, Channel: c.channel, Status: c.status, Goal: c.goal, Segment: c.segmentName,
    Audience: c.audienceSize, Sent: c.sent, Delivered: c.delivered, Opened: c.opened, Clicked: c.clicked,
    Converted: c.converted, Revenue: c.revenue, Unsubscribed: c.unsubscribed,
    Scheduled: c.scheduledAt ?? "", SentAt: c.sentAt ?? "", CreatedBy: c.createdBy,
  })));

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "draft", label: "Drafts" },
    { id: "scheduled", label: "Scheduled" },
    { id: "sending", label: "Sending" },
    { id: "sent", label: "Sent" },
    { id: "paused", label: "Paused" },
    { id: "archived", label: "Archived" },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Campaigns"
        subtitle="Plan, schedule and measure outbound campaigns across every channel."
        actions={
          <>
            <button onClick={exportCSV} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button onClick={() => setCreating(true)} className="h-9 px-3 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New campaign
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <KPI label="Active" value={String(kpis.active)} Icon={Sparkles} />
        <KPI label="Messages sent (30d)" value={kpis.totalSent.toLocaleString()} Icon={Send} />
        <KPI label="Revenue attributed" value={naira(kpis.revenue)} Icon={TrendingUp} tone="text-ink" />
        <KPI label="Open rate" value={`${kpis.openRate.toFixed(1)}%`} Icon={Eye} />
        <KPI label="Click rate" value={`${kpis.clickRate.toFixed(1)}%`} Icon={MousePointerClick} />
      </div>

      <div className="flex items-center gap-1 border-b border-black/[0.08] mb-4 overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const count = t.id === "all" ? campaigns.length : campaigns.filter((c) => c.status === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
              }`}
            >
              {t.label} <span className="ml-1 text-[11px] text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>

      <Toolbar>
        <div className="flex-1 min-w-[220px] max-w-md h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, subject, segment, tag…"
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>
        <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
          <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={channel} onChange={(e) => setChannel(e.target.value as CampaignChannel | "all")} className="bg-transparent outline-none pr-1">
            <option value="all">All channels</option>
            {(Object.keys(CHANNEL_META) as CampaignChannel[]).map((c) => (
              <option key={c} value={c}>{CHANNEL_META[c].label}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-[12px] text-muted-foreground">{filtered.length} of {campaigns.length}</div>
      </Toolbar>

      {selected.size > 0 && (
        <div className="sticky top-14 z-20 mb-3 flex items-center gap-2 bg-ink text-white rounded-md px-3 h-11 text-[12.5px]">
          <span className="font-semibold">{selected.size} selected</span>
          <button onClick={bulkArchive} className="ml-auto h-8 px-3 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1.5">
            <Archive className="h-3.5 w-3.5" /> Archive
          </button>
          <button onClick={bulkDelete} className="h-8 px-3 rounded bg-rose-500 hover:bg-rose-600 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="h-8 w-8 grid place-items-center rounded hover:bg-white/10">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card><Empty title="No campaigns match" sub="Try clearing filters or start a new campaign." /></Card>
      ) : (
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-[#faf8f3] text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2.5 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-left px-3 py-2.5">Campaign</th>
                <th className="text-left px-3 py-2.5">Channel</th>
                <th className="text-left px-3 py-2.5">Audience</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-right px-3 py-2.5">Open</th>
                <th className="text-right px-3 py-2.5">CTR</th>
                <th className="text-right px-3 py-2.5">Revenue</th>
                <th className="text-right px-3 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const meta = CHANNEL_META[c.channel];
                const openRate = c.sent ? (c.opened / c.sent) * 100 : 0;
                const ctr = c.sent ? (c.clicked / c.sent) * 100 : 0;
                return (
                  <tr key={c.id} className="border-t border-black/[0.06] hover:bg-black/[0.02]">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {c.pinned && <Pin className="h-3 w-3 text-gold fill-gold" />}
                        <button onClick={() => setOpenId(c.id)} className="font-semibold hover:underline text-left">{c.name}</button>
                      </div>
                      <div className="text-[11.5px] text-muted-foreground truncate max-w-[360px]">{c.subject}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Chip tone={meta.tone}><meta.Icon className="h-3 w-3" /> {meta.label}</Chip>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{c.audienceSize.toLocaleString()}</div>
                      <div className="text-[11.5px] text-muted-foreground">{c.segmentName}</div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={c.status} />
                      {c.scheduledAt && c.status === "scheduled" && (
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(c.scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                      {c.sentAt && (c.status === "sent" || c.status === "archived") && (
                        <div className="text-[11px] text-muted-foreground mt-1">{new Date(c.sentAt).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.sent ? `${openRate.toFixed(1)}%` : " - "}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.sent ? `${ctr.toFixed(1)}%` : " - "}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.revenue ? naira(c.revenue) : " - "}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => setOpenId(c.id)} className="text-[12px] font-semibold text-ink hover:underline">
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      {open && (
        <CampaignDrawer
          key={open.id}
          campaign={open}
          onClose={() => setOpenId(null)}
          onSave={(patch) => update(open.id, patch)}
          onStatus={(s) => setStatus(open.id, s)}
          onDuplicate={() => { duplicate(open.id); setOpenId(null); }}
          onDelete={() => { if (confirm("Delete this campaign?")) { remove(open.id); setOpenId(null); } }}
          onPin={() => togglePin(open.id)}
        />
      )}

      {creating && (
        <NewCampaignModal
          onClose={() => setCreating(false)}
          onCreate={async (patch) => {
            const c = await create(patch);
            setCreating(false);
            if (c.id) setOpenId(c.id);
          }}
        />
      )}
    </div>
  );
}

function KPI({ label, value, Icon, tone = "text-ink" }: { label: string; value: string; Icon: typeof Megaphone; tone?: string }) {
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

function CampaignDrawer({
  campaign, onClose, onSave, onStatus, onDuplicate, onDelete, onPin,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSave: (patch: Partial<Campaign>) => void;
  onStatus: (s: CampaignStatus) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  const [form, setForm] = useState({
    name: campaign.name,
    subject: campaign.subject,
    preheader: campaign.preheader ?? "",
    goal: campaign.goal,
    body: campaign.body,
    ctaLabel: campaign.cta.label,
    ctaUrl: campaign.cta.url,
    tags: campaign.tags.join(", "),
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    onSave({
      name: form.name, subject: form.subject, preheader: form.preheader || undefined,
      goal: form.goal, body: form.body,
      cta: { label: form.ctaLabel, url: form.ctaUrl },
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const meta = CHANNEL_META[campaign.channel];
  const openRate = campaign.sent ? (campaign.opened / campaign.sent) * 100 : 0;
  const ctr = campaign.sent ? (campaign.clicked / campaign.sent) * 100 : 0;
  const convRate = campaign.sent ? (campaign.converted / campaign.sent) * 100 : 0;

  const isSent = campaign.status === "sent" || campaign.status === "archived" || campaign.status === "sending";

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[640px] bg-white z-50 shadow-2xl flex flex-col">
        <div className="h-14 px-5 border-b border-black/[0.08] flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Campaign · {meta.label}</div>
            <div className="font-display font-bold text-[15px] leading-tight truncate">{campaign.name}</div>
          </div>
          <div className="flex items-center gap-1">
            <IconButton onClick={onPin} title="Pin" active={campaign.pinned}><Pin className="h-4 w-4" /></IconButton>
            <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {campaign.status === "draft" && (
              <button onClick={() => onStatus("scheduled")} className="h-8 px-3 rounded-md bg-ink text-white text-[12px] font-semibold hover:bg-black flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Schedule
              </button>
            )}
            {campaign.status === "draft" && (
              <button onClick={() => onStatus("sending")} className="h-8 px-3 rounded-md border border-border bg-muted text-ink text-[12px] font-semibold flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" /> Send now
              </button>
            )}
            {(campaign.status === "sending" || campaign.status === "scheduled") && (
              <button onClick={() => onStatus("paused")} className="h-8 px-3 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[12px] font-semibold flex items-center gap-1.5">
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
            )}
            {campaign.status === "paused" && (
              <button onClick={() => onStatus("sending")} className="h-8 px-3 rounded-md border border-border bg-muted text-ink text-[12px] font-semibold flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" /> Resume
              </button>
            )}
            {campaign.status !== "archived" && (
              <button onClick={() => onStatus("archived")} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
            )}
            <button onClick={onDuplicate} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
          </div>

          {isSent && (
            <Section title="Performance">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="Sent" value={campaign.sent.toLocaleString()} />
                <Stat label="Open rate" value={`${openRate.toFixed(1)}%`} />
                <Stat label="Click rate" value={`${ctr.toFixed(1)}%`} />
                <Stat label="Conv. rate" value={`${convRate.toFixed(1)}%`} />
                <Stat label="Delivered" value={campaign.delivered.toLocaleString()} />
                <Stat label="Converted" value={campaign.converted.toLocaleString()} />
                <Stat label="Revenue" value={naira(campaign.revenue)} />
                <Stat label="Unsubscribed" value={campaign.unsubscribed.toLocaleString()} />
              </div>
            </Section>
          )}

          <Section title="Audience">
            <div className="rounded-md border border-black/[0.06] bg-[#faf8f3] p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-white border border-black/10 grid place-items-center">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px] truncate">{campaign.segmentName}</div>
                <div className="text-[11.5px] text-muted-foreground">{campaign.audienceSize.toLocaleString()} recipients</div>
              </div>
              <a href="/segments" className="text-[12px] font-semibold text-ink hover:underline flex items-center gap-1">
                Change <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </Section>

          <Section title="Message">
            <div className="grid gap-2.5">
              <Field label="Campaign name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label={campaign.channel === "email" ? "Subject" : "Headline"} value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} />
              {campaign.channel === "email" && (
                <Field label="Preheader" value={form.preheader} onChange={(v) => setForm({ ...form, preheader: v })} />
              )}
              <label className="block">
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Body</div>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={4}
                  className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="CTA label" value={form.ctaLabel} onChange={(v) => setForm({ ...form, ctaLabel: v })} />
                <Field label="CTA URL" value={form.ctaUrl} onChange={(v) => setForm({ ...form, ctaUrl: v })} />
              </div>
              <label className="block">
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Goal</div>
                <select
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value as CampaignGoal })}
                  className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink"
                >
                  {GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </label>
              <Field label="Tags (comma separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} />
            </div>
          </Section>

          <Section title="Preview">
            <div className="rounded-md border border-black/10 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-black/[0.06] bg-[#faf8f3] text-[11.5px] text-muted-foreground flex items-center gap-2">
                <meta.Icon className="h-3.5 w-3.5" /> {meta.label} preview
              </div>
              <div className="p-4 space-y-2">
                <div className="font-display text-[16px] leading-snug">{form.subject || "Subject line"}</div>
                {form.preheader && campaign.channel === "email" && (
                  <div className="text-[12px] text-muted-foreground">{form.preheader}</div>
                )}
                <p className="text-[13px] leading-relaxed text-ink/80 whitespace-pre-wrap">{form.body || "Body copy goes here."}</p>
                <div>
                  <span className="inline-flex items-center h-8 px-3 rounded-md bg-ink text-white text-[12px] font-semibold">
                    {form.ctaLabel || "Call to action"}
                  </span>
                </div>
              </div>
            </div>
          </Section>
        </div>

        <div className="border-t border-black/[0.08] p-4 flex items-center gap-2 shrink-0">
          <button onClick={onDelete} className="h-9 px-3 rounded-md border border-rose-200 bg-white text-rose-600 text-[12.5px] font-semibold hover:bg-rose-50 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={onClose} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Cancel</button>
          <button onClick={save} className="h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
            {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : "Save changes"}
          </button>
        </div>
      </aside>
    </>
  );
}

function NewCampaignModal({ onClose, onCreate }: { onClose: () => void; onCreate: (patch: Partial<Campaign>) => void }) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("email");
  const [goal, setGoal] = useState<CampaignGoal>("conversion");
  const [segmentName, setSegmentName] = useState("All subscribers");
  const [audienceSize, setAudienceSize] = useState(12_840);

  const submit = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), channel, goal, segmentName, audienceSize });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 grid place-items-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="px-5 h-14 border-b border-black/[0.08] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Create</div>
              <div className="font-display font-bold text-[15px] leading-tight">New campaign</div>
            </div>
            <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
          </div>
          <div className="p-5 space-y-3">
            <Field label="Name" value={name} onChange={setName} />
            <label className="block">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Channel</div>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(CHANNEL_META) as CampaignChannel[]).map((c) => {
                  const Icon = CHANNEL_META[c].Icon;
                  const active = channel === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setChannel(c)}
                      className={`h-14 rounded-md border text-[11px] font-semibold flex flex-col items-center justify-center gap-1 ${active ? "bg-ink text-white border-ink" : "bg-white border-black/10 hover:bg-black/[0.04]"}`}
                    >
                      <Icon className="h-4 w-4" />
                      {CHANNEL_META[c].label}
                    </button>
                  );
                })}
              </div>
            </label>
            <label className="block">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Goal</div>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as CampaignGoal)}
                className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink"
              >
                {GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Segment" value={segmentName} onChange={setSegmentName} />
              <label className="block">
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Audience size</div>
                <input
                  type="number"
                  value={audienceSize}
                  onChange={(e) => setAudienceSize(parseInt(e.target.value) || 0)}
                  className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink"
                />
              </label>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-black/[0.08] flex items-center gap-2">
            <button onClick={onClose} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Cancel</button>
            <button onClick={submit} disabled={!name.trim()} className="h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black disabled:opacity-50 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create draft
            </button>
          </div>
        </div>
      </div>
    </>
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink"
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#faf8f3] py-2.5 text-center">
      <div className="font-display text-[15px] leading-tight">{value}</div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">{label}</div>
    </div>
  );
}
