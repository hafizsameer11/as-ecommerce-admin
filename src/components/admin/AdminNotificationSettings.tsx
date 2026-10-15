import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import {
  CATEGORIES, CHANNELS, useNotifSettings,
  type Channel, type EventCategory, type NotifRule,
} from "@/lib/notification-settings-store";
import { ADMIN_ROLES } from "@/lib/admin-role-store";
import {
  Bell, Mail, Smartphone, MessageSquare, Zap, MessageCircle, Send, Search,
  Settings2, Users, Moon, CalendarClock, ShieldAlert, CheckCircle2, TestTube2, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const CH_ICON: Record<Channel, typeof Mail> = {
  email: Mail,
  push: Smartphone,
  in_app: Bell,
  slack: MessageSquare,
  sms: MessageCircle,
};

const CAT_ICON: Record<EventCategory, typeof Bell> = {
  orders: Zap,
  concierge: Send,
  catalog: Settings2,
  customers: Users,
  finance: ShieldAlert,
  system: ShieldAlert,
};

const PRIORITY_STYLES: Record<NotifRule["priority"], string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-rose-50 text-rose-700 border-rose-200",
};

type Tab = "rules" | "channels" | "quiet" | "digest";

export function AdminNotificationSettings() {
  const rules = useNotifSettings((s) => s.rules);
  const channels = useNotifSettings((s) => s.channels);
  const quiet = useNotifSettings((s) => s.quietHours);
  const digest = useNotifSettings((s) => s.digest);
  const toggleRule = useNotifSettings((s) => s.toggleRule);
  const toggleChannel = useNotifSettings((s) => s.toggleChannel);
  const setPriority = useNotifSettings((s) => s.setPriority);
  const setRecipients = useNotifSettings((s) => s.setRecipients);
  const updateChannels = useNotifSettings((s) => s.updateChannels);
  const updateQuietHours = useNotifSettings((s) => s.updateQuietHours);
  const updateDigest = useNotifSettings((s) => s.updateDigest);
  const sendTest = useNotifSettings((s) => s.sendTest);
  const hydrate = useNotifSettings((s) => s.hydrate);

  const [tab, setTab] = useState<Tab>("rules");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<EventCategory | "all">("all");
  const [drawer, setDrawer] = useState<NotifRule | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rules.filter((r) => {
      if (cat !== "all" && r.category !== cat) return false;
      if (!term) return true;
      return r.label.toLowerCase().includes(term) || r.description.toLowerCase().includes(term);
    });
  }, [rules, q, cat]);

  const counts = useMemo(() => {
    const total = rules.length;
    const enabled = rules.filter((r) => r.enabled).length;
    const critical = rules.filter((r) => r.priority === "critical" && r.enabled).length;
    const email = rules.filter((r) => r.channels.email && r.enabled).length;
    return { total, enabled, critical, email };
  }, [rules]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Notifications"
        subtitle="Route the right event to the right person on the right channel - before it becomes a fire."
        actions={
          <Button variant="outline" onClick={() => toast.success("Preferences saved")}>
            <Save className="h-4 w-4 mr-2" /> Save all
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Kpi label="Total events" value={counts.total} icon={Bell} />
        <Kpi label="Enabled" value={counts.enabled} icon={CheckCircle2} tone="green" />
        <Kpi label="Critical alerts" value={counts.critical} icon={ShieldAlert} tone="rose" />
        <Kpi label="Email-routed" value={counts.email} icon={Mail} tone="blue" />
      </div>

      <div className="flex gap-1 border-b border-border mb-5">
        {(
          [
            { id: "rules", label: "Event rules" },
            { id: "channels", label: "Channels" },
            { id: "quiet", label: "Quiet hours" },
            { id: "digest", label: "Digest" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 h-10 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.id ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rules" && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events…" className="pl-9 bg-white" />
            </div>
            <Select value={cat} onValueChange={(v) => setCat(v as EventCategory | "all")}>
              <SelectTrigger className="w-[220px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="grid grid-cols-[1.6fr_repeat(5,80px)_120px_44px] gap-2 px-4 h-11 items-center border-b border-border bg-[#faf8f3] text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <div>Event</div>
              {CHANNELS.map((c) => <div key={c.id} className="text-center">{c.label}</div>)}
              <div>Priority</div>
              <div />
            </div>
            {filtered.map((r) => {
              const CatI = CAT_ICON[r.category];
              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-[1.6fr_repeat(5,80px)_120px_44px] gap-2 px-4 py-3 items-center border-b border-border last:border-0 hover:bg-[#faf8f3] transition-colors ${
                    !r.enabled ? "opacity-55" : ""
                  }`}
                >
                  <button className="flex items-start gap-3 text-left" onClick={() => setDrawer(r)}>
                    <div className="h-8 w-8 rounded-md bg-gold/10 text-gold grid place-items-center shrink-0">
                      <CatI className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate">{r.label}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{r.description}</div>
                    </div>
                  </button>
                  {CHANNELS.map((c) => (
                    <div key={c.id} className="grid place-items-center">
                      <Switch checked={r.channels[c.id]} onCheckedChange={() => toggleChannel(r.id, c.id)} />
                    </div>
                  ))}
                  <div>
                    <Select value={r.priority} onValueChange={(v) => setPriority(r.id, v as NotifRule["priority"])}>
                      <SelectTrigger className="h-8 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["low", "normal", "high", "critical"] as const).map((p) => (
                          <SelectItem key={p} value={p}>
                            <span className={`text-[11px] font-bold uppercase px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[p]}`}>{p}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid place-items-center">
                    <Switch checked={r.enabled} onCheckedChange={() => toggleRule(r.id)} />
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-10 text-center text-[13px] text-muted-foreground">No events match.</div>
            )}
          </div>
        </>
      )}

      {tab === "channels" && (
        <div className="grid grid-cols-2 gap-4">
          <ChannelCard title="Email" icon={Mail} onTest={() => sendTest("email").then(() => toast.success("Test email queued"))}>
            <Field label="From name">
              <Input value={channels.email.fromName} onChange={(e) => updateChannels({ email: { ...channels.email, fromName: e.target.value } })} />
            </Field>
            <Field label="From address">
              <Input value={channels.email.fromAddress} onChange={(e) => updateChannels({ email: { ...channels.email, fromAddress: e.target.value } })} />
            </Field>
            <Field label="Reply-to">
              <Input value={channels.email.replyTo} onChange={(e) => updateChannels({ email: { ...channels.email, replyTo: e.target.value } })} />
            </Field>
            <Field label="Provider">
              <Select value={channels.email.provider} onValueChange={(v) => updateChannels({ email: { ...channels.email, provider: v as "resend" | "sendgrid" | "ses" } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="ses">Amazon SES</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </ChannelCard>

          <ChannelCard title="Push" icon={Smartphone} onTest={() => sendTest("push").then(() => toast.success("Test push sent"))}>
            <ToggleRow label="Enable push notifications" checked={channels.push.enabled} onChange={(v) => updateChannels({ push: { ...channels.push, enabled: v } })} />
            <ToggleRow label="Play sound" checked={channels.push.sound} onChange={(v) => updateChannels({ push: { ...channels.push, sound: v } })} />
            <ToggleRow label="Vibration" checked={channels.push.vibration} onChange={(v) => updateChannels({ push: { ...channels.push, vibration: v } })} />
          </ChannelCard>

          <ChannelCard title="Slack" icon={MessageSquare} onTest={() => sendTest("slack").then(() => toast.success("Slack test posted"))}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={channels.slack.connected ? "border-border bg-muted text-ink" : "border-slate-200 bg-slate-50 text-slate-600"}>
                {channels.slack.connected ? "Connected" : "Not connected"}
              </Badge>
            </div>
            <Field label="Webhook URL">
              <Input value={channels.slack.webhookUrl} onChange={(e) => updateChannels({ slack: { ...channels.slack, webhookUrl: e.target.value } })} />
            </Field>
            <Field label="Default channel">
              <Input value={channels.slack.channel} onChange={(e) => updateChannels({ slack: { ...channels.slack, channel: e.target.value } })} />
            </Field>
          </ChannelCard>

          <ChannelCard title="SMS" icon={MessageCircle} onTest={() => sendTest("sms").then(() => toast.success("Test SMS sent"))}>
            <ToggleRow label="Enable SMS" checked={channels.sms.enabled} onChange={(v) => updateChannels({ sms: { ...channels.sms, enabled: v } })} />
            <Field label="Provider">
              <Select value={channels.sms.provider} onValueChange={(v) => updateChannels({ sms: { ...channels.sms, provider: v as "twilio" | "africas_talking" } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="africas_talking">Africa's Talking</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sender ID">
              <Input value={channels.sms.senderId} onChange={(e) => updateChannels({ sms: { ...channels.sms, senderId: e.target.value } })} />
            </Field>
          </ChannelCard>
        </div>
      )}

      {tab === "quiet" && (
        <div className="max-w-2xl rounded-lg border border-border bg-white p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-indigo-50 text-indigo-600 grid place-items-center"><Moon className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="text-[15px] font-semibold">Quiet hours</div>
              <div className="text-[12px] text-muted-foreground">Pause non-critical notifications during off-hours.</div>
            </div>
            <Switch checked={quiet.enabled} onCheckedChange={(v) => updateQuietHours({ enabled: v })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start">
              <Input type="time" value={quiet.start} onChange={(e) => updateQuietHours({ start: e.target.value })} />
            </Field>
            <Field label="End">
              <Input type="time" value={quiet.end} onChange={(e) => updateQuietHours({ end: e.target.value })} />
            </Field>
          </div>
          <Field label="Timezone">
            <Select value={quiet.timezone} onValueChange={(v) => updateQuietHours({ timezone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <ToggleRow
            label="Always deliver critical alerts"
            description="Fraud, downtime, and security events bypass quiet hours."
            checked={quiet.exceptCritical}
            onChange={(v) => updateQuietHours({ exceptCritical: v })}
          />
        </div>
      )}

      {tab === "digest" && (
        <div className="max-w-2xl rounded-lg border border-border bg-white p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-muted text-ink grid place-items-center"><CalendarClock className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="text-[15px] font-semibold">Summary digest</div>
              <div className="text-[12px] text-muted-foreground">One consolidated email of everything that happened.</div>
            </div>
            <Switch checked={digest.enabled} onCheckedChange={(v) => updateDigest({ enabled: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Frequency">
              <Select value={digest.frequency} onValueChange={(v) => updateDigest({ frequency: v as "daily" | "weekly" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Delivery time">
              <Input type="time" value={digest.time} onChange={(e) => updateDigest({ time: e.target.value })} />
            </Field>
          </div>
          {digest.frequency === "weekly" && (
            <Field label="Day of week">
              <Select value={digest.day} onValueChange={(v) => updateDigest({ day: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Button variant="outline" onClick={() => sendTest("email").then(() => toast.success("Sample digest queued"))}>
            <TestTube2 className="h-4 w-4 mr-2" /> Send sample digest
          </Button>
        </div>
      )}

      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[520px] overflow-y-auto">
          {drawer && (
            <>
              <SheetHeader>
                <SheetTitle>{drawer.label}</SheetTitle>
                <SheetDescription>{drawer.description}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <Label className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Channels</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {CHANNELS.map((c) => {
                      const Icon = CH_ICON[c.id];
                      const on = drawer.channels[c.id];
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleChannel(drawer.id, c.id)}
                          className={`flex items-center gap-2 h-10 px-3 rounded-md border text-[13px] transition-colors ${
                            on ? "border-ink bg-ink text-white" : "border-border bg-white text-ink hover:bg-black/5"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1 text-left font-semibold">{c.label}</span>
                          {on && <CheckCircle2 className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Recipients (roles)</Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ADMIN_ROLES.map((r) => {
                      const selected = drawer.recipients.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            const next = selected
                              ? drawer.recipients.filter((x) => x !== r.id)
                              : [...drawer.recipients, r.id];
                            setRecipients(drawer.id, next);
                            setDrawer({ ...drawer, recipients: next });
                          }}
                          className={`h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors ${
                            selected ? "bg-gold/15 text-gold border-gold/40" : "bg-white text-muted-foreground border-border hover:border-ink"
                          }`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Priority</Label>
                  <div className="mt-2 flex gap-2">
                    {(["low", "normal", "high", "critical"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => { setPriority(drawer.id, p); setDrawer({ ...drawer, priority: p }); }}
                        className={`flex-1 h-9 rounded-md border text-[12px] font-bold uppercase tracking-[0.06em] transition-colors ${
                          drawer.priority === p ? PRIORITY_STYLES[p] : "border-border bg-white text-muted-foreground hover:text-ink"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => sendTest("email").then(() => toast.success("Test notification queued"))}>
                  <TestTube2 className="h-4 w-4 mr-2" /> Send test
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone = "ink" }: { label: string; value: number; icon: typeof Bell; tone?: "ink" | "green" | "rose" | "blue" }) {
  const tones: Record<string, string> = {
    ink: "bg-ink/5 text-ink",
    green: "bg-muted text-ink",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="rounded-lg border border-border bg-white p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-md grid place-items-center ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
        <div className="text-[22px] font-display font-bold leading-none mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function ChannelCard({ title, icon: Icon, onTest, children }: { title: string; icon: typeof Bell; onTest: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-md bg-gold/10 text-gold grid place-items-center">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-semibold">{title}</div>
          <div className="text-[11px] text-muted-foreground">Delivery settings for {title.toLowerCase()} notifications.</div>
        </div>
        <Button size="sm" variant="outline" onClick={onTest}>
          <TestTube2 className="h-4 w-4 mr-1.5" /> Test
        </Button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div>
        <div className="text-[13px] font-semibold">{label}</div>
        {description && <div className="text-[11px] text-muted-foreground">{description}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
