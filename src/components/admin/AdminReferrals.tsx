import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, StatusPill, Toolbar, naira } from "./ui";
import {
  useReferrals, type Advocate, type Referral, type ReferralStatus, type RewardType,
} from "@/lib/referrals-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Share2, Users, TrendingUp, Gift, Crown, Trophy, Medal, Award, Search, X, Check,
  Download, Copy, Play, Pause, Ban, ShieldAlert, MessageCircle, Mail, Smartphone,
  Instagram, LinkIcon, ChevronRight, Sparkles, Settings, AlertTriangle, ArrowUp,
} from "lucide-react";

type Tab = "overview" | "advocates" | "referrals" | "program";

const CHANNEL_META: Record<Referral["channel"], { label: string; Icon: typeof LinkIcon; tone: string }> = {
  link: { label: "Link", Icon: LinkIcon, tone: "bg-slate-50 text-slate-700 border-slate-200" },
  whatsapp: { label: "WhatsApp", Icon: MessageCircle, tone: "bg-ink text-white border-ink" },
  email: { label: "Email", Icon: Mail, tone: "bg-sky-50 text-sky-700 border-sky-200" },
  sms: { label: "SMS", Icon: Smartphone, tone: "bg-lime-50 text-lime-700 border-lime-200" },
  instagram: { label: "Instagram", Icon: Instagram, tone: "bg-pink-50 text-pink-700 border-pink-200" },
};

const STATUS_LABEL: Record<ReferralStatus, string> = {
  pending: "Pending", qualified: "Qualified", rewarded: "Rewarded", expired: "Expired", flagged: "Flagged",
};

const TIER_META: Record<Advocate["tier"], { Icon: typeof Crown; tone: string }> = {
  Signature: { Icon: Crown, tone: "text-gold-deep" },
  Gold: { Icon: Trophy, tone: "text-amber-600" },
  Silver: { Icon: Medal, tone: "text-slate-500" },
  Standard: { Icon: Award, tone: "text-muted-foreground" },
};

export function AdminReferrals() {
  const hydrate = useReferrals((s) => s.hydrate);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Referrals"
        subtitle="Program configuration, ambassador leaderboard and per-referral tracking."
      />
      <div className="flex items-center gap-1 border-b border-black/[0.08] mb-5 overflow-x-auto no-scrollbar">
        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}><TrendingUp className="h-3.5 w-3.5" /> Overview</TabBtn>
        <TabBtn active={tab === "advocates"} onClick={() => setTab("advocates")}><Users className="h-3.5 w-3.5" /> Advocates</TabBtn>
        <TabBtn active={tab === "referrals"} onClick={() => setTab("referrals")}><Share2 className="h-3.5 w-3.5" /> Referrals</TabBtn>
        <TabBtn active={tab === "program"} onClick={() => setTab("program")}><Settings className="h-3.5 w-3.5" /> Program</TabBtn>
      </div>
      {tab === "overview" && <OverviewTab />}
      {tab === "advocates" && <AdvocatesTab />}
      {tab === "referrals" && <ReferralsTab />}
      {tab === "program" && <ProgramTab />}
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

/* ============================ OVERVIEW ============================ */

function OverviewTab() {
  const { advocates, referrals } = useReferrals();

  const kpis = useMemo(() => {
    const totalClicks = advocates.reduce((s, a) => s + a.clicks, 0);
    const totalSignups = advocates.reduce((s, a) => s + a.signups, 0);
    const qualified = referrals.filter((r) => r.status === "qualified" || r.status === "rewarded").length;
    const revenue = advocates.reduce((s, a) => s + a.revenueDrivenMinor, 0);
    const rewards = advocates.reduce((s, a) => s + a.rewardsEarnedMinor, 0);
    const conv = totalClicks ? (totalSignups / totalClicks) * 100 : 0;
    const roi = rewards ? ((revenue - rewards) / rewards) * 100 : 0;
    return { totalClicks, totalSignups, qualified, revenue, rewards, conv, roi };
  }, [advocates, referrals]);

  const leaderboard = [...advocates]
    .sort((a, b) => b.revenueDrivenMinor - a.revenueDrivenMinor)
    .slice(0, 5);

  const channelBreakdown = useMemo(() => {
    const rows: { key: Referral["channel"]; count: number; pct: number }[] = [];
    const map = new Map<Referral["channel"], number>();
    referrals.forEach((r) => map.set(r.channel, (map.get(r.channel) ?? 0) + 1));
    const total = referrals.length || 1;
    (Object.keys(CHANNEL_META) as Referral["channel"][]).forEach((k) => {
      const count = map.get(k) ?? 0;
      rows.push({ key: k, count, pct: (count / total) * 100 });
    });
    return rows.sort((a, b) => b.count - a.count);
  }, [referrals]);

  const funnel = useMemo(() => {
    const clicks = kpis.totalClicks;
    const signups = kpis.totalSignups;
    const qualified = kpis.qualified;
    const rewarded = referrals.filter((r) => r.status === "rewarded").length;
    return [
      { label: "Clicks", value: clicks, pct: 100 },
      { label: "Sign-ups", value: signups, pct: clicks ? (signups / clicks) * 100 : 0 },
      { label: "Qualified", value: qualified, pct: clicks ? (qualified / clicks) * 100 : 0 },
      { label: "Rewarded", value: rewarded, pct: clicks ? (rewarded / clicks) * 100 : 0 },
    ];
  }, [kpis, referrals]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Clicks" value={kpis.totalClicks.toLocaleString()} Icon={Share2} />
        <KPI label="Sign-ups" value={kpis.totalSignups.toLocaleString()} sub={`${kpis.conv.toFixed(1)}% conversion`} Icon={Users} />
        <KPI label="Revenue driven" value={naira(kpis.revenue)} Icon={TrendingUp} tone="text-ink" />
        <KPI label="Rewards paid" value={naira(kpis.rewards)} sub={`${kpis.roi.toFixed(0)}% ROI`} Icon={Gift} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-display font-bold text-[15px]">Conversion funnel</div>
              <div className="text-[11.5px] text-muted-foreground">From link click to rewarded referral</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {funnel.map((f, i) => {
              const barTone = i === 0 ? "bg-slate-800" : i === 1 ? "bg-sky-700" : i === 2 ? "bg-amber-600" : "bg-ink";
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="font-semibold">{f.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {f.value.toLocaleString()} · {f.pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-black/[0.05] overflow-hidden">
                    <div className={`h-full ${barTone} rounded-full transition-all`} style={{ width: `${Math.max(2, f.pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="font-display font-bold text-[15px] mb-3">Channel mix</div>
          <div className="space-y-2">
            {channelBreakdown.map((c) => {
              const meta = CHANNEL_META[c.key];
              return (
                <div key={c.key} className="flex items-center gap-2.5">
                  <div className={`h-7 w-7 rounded-md grid place-items-center border ${meta.tone}`}>
                    <meta.Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold">{meta.label}</span>
                      <span className="tabular-nums text-muted-foreground">{c.count} · {c.pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/[0.05] overflow-hidden mt-1">
                      <div className="h-full bg-ink rounded-full" style={{ width: `${Math.max(2, c.pct)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display font-bold text-[15px] flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gold" /> Top ambassadors
              </div>
              <div className="text-[11.5px] text-muted-foreground">Ranked by revenue driven all-time</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {leaderboard.map((a, i) => {
              const tier = TIER_META[a.tier];
              return (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-black/[0.04] last:border-b-0">
                  <div className={`h-8 w-8 rounded-full grid place-items-center font-display font-bold text-[13px] ${
                    i === 0 ? "bg-gold text-ink" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-amber-100 text-amber-700" : "bg-black/[0.04] text-muted-foreground"
                  }`}>{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold text-[13.5px] truncate">{a.name}</span>
                      <tier.Icon className={`h-3.5 w-3.5 ${tier.tone}`} />
                      <code className="font-sans text-[10.5px] px-1.5 py-0.5 bg-black/[0.04] rounded">{a.code}</code>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{a.qualified} qualified · {a.signups} signups · {a.clicks.toLocaleString()} clicks</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[13.5px] font-bold tabular-nums">{naira(a.revenueDrivenMinor)}</div>
                    <div className="text-[11px] text-muted-foreground">{naira(a.rewardsEarnedMinor)} in rewards</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ============================ ADVOCATES ============================ */

function AdvocatesTab() {
  const { advocates, setAdvocateStatus } = useReferrals();
  const [q, setQ] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | Advocate["tier"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Advocate["status"]>("all");
  const [sortKey, setSortKey] = useState<"revenue" | "qualified" | "clicks" | "recent">("revenue");
  const [copied, setCopied] = useState<string | null>(null);

  const list = useMemo(() => advocates
    .filter((a) => tierFilter === "all" || a.tier === tierFilter)
    .filter((a) => statusFilter === "all" || a.status === statusFilter)
    .filter((a) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return [a.name, a.email, a.code].some((v) => v.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (sortKey === "revenue") return b.revenueDrivenMinor - a.revenueDrivenMinor;
      if (sortKey === "qualified") return b.qualified - a.qualified;
      if (sortKey === "clicks") return b.clicks - a.clicks;
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    }),
    [advocates, tierFilter, statusFilter, q, sortKey]);

  const copyLink = (code: string) => {
    const link = `https://asloriginals.online/?ref=${code}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(code);
        setTimeout(() => setCopied(null), 1500);
      });
    }
  };

  const exportCSV = () => downloadCSV("referral-advocates.csv", list.map((a) => ({
    Name: a.name, Email: a.email, Tier: a.tier, Code: a.code, Status: a.status,
    Joined: a.joinedAt.slice(0, 10),
    Clicks: a.clicks, Signups: a.signups, Qualified: a.qualified,
    Rewards: a.rewardsEarnedMinor, Revenue: a.revenueDrivenMinor,
  })));

  return (
    <>
      <Toolbar>
        <div className="flex-1 min-w-[220px] max-w-md h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search advocate, code, email…"
            className="flex-1 bg-transparent outline-none text-[13px]" />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>
        <SelectRow label="Tier" value={tierFilter} onChange={(v) => setTierFilter(v as typeof tierFilter)}
          options={[{ value: "all", label: "All tiers" }, { value: "Signature", label: "Signature" }, { value: "Gold", label: "Gold" }, { value: "Silver", label: "Silver" }, { value: "Standard", label: "Standard" }]} />
        <SelectRow label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as typeof statusFilter)}
          options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "paused", label: "Paused" }, { value: "banned", label: "Banned" }]} />
        <SelectRow label="Sort" value={sortKey} onChange={(v) => setSortKey(v as typeof sortKey)}
          options={[{ value: "revenue", label: "Revenue driven" }, { value: "qualified", label: "Qualified" }, { value: "clicks", label: "Clicks" }, { value: "recent", label: "Recently joined" }]} />
        <button onClick={exportCSV} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </Toolbar>

      {list.length === 0 ? (
        <Card><Empty title="No advocates match" sub="Adjust filters to find ambassadors." /></Card>
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <AdvocateRow key={a.id} advocate={a}
              onCopy={() => copyLink(a.code)} copied={copied === a.code}
              onSetStatus={(s) => setAdvocateStatus(a.id, s)} />
          ))}
        </div>
      )}
    </>
  );
}

function AdvocateRow({ advocate, onCopy, copied, onSetStatus }: {
  advocate: Advocate;
  onCopy: () => void;
  copied: boolean;
  onSetStatus: (s: Advocate["status"]) => void;
}) {
  const tier = TIER_META[advocate.tier];
  const conv = advocate.clicks ? (advocate.qualified / advocate.clicks) * 100 : 0;
  return (
    <Card padded={false}>
      <div className="p-4 flex items-center gap-4 flex-wrap">
        <div className="h-10 w-10 rounded-full bg-ink text-white font-display font-bold text-[13px] grid place-items-center shrink-0">
          {advocate.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-[13.5px]">{advocate.name}</span>
            <tier.Icon className={`h-3.5 w-3.5 ${tier.tone}`} />
            <Chip tone="neutral">{advocate.tier}</Chip>
            {advocate.status === "banned" && <StatusPill status="Banned" />}
            {advocate.status === "paused" && <StatusPill status="Paused" />}
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="truncate">{advocate.email}</span>
            <span>·</span>
            <button onClick={onCopy} className="flex items-center gap-1 hover:text-ink group">
              <code className="font-sans text-[11px] px-1.5 py-0.5 bg-black/[0.04] rounded group-hover:bg-black/[0.08]">?ref={advocate.code}</code>
              {copied ? <Check className="h-3 w-3 text-ink" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
        <div className="hidden md:grid grid-cols-4 gap-2 text-center min-w-[380px]">
          <MiniStat label="Clicks" value={advocate.clicks.toLocaleString()} />
          <MiniStat label="Signups" value={advocate.signups.toString()} />
          <MiniStat label="Qualified" value={`${advocate.qualified} · ${conv.toFixed(0)}%`} />
          <MiniStat label="Revenue" value={naira(advocate.revenueDrivenMinor)} tone="text-ink" />
        </div>
        <div className="flex items-center gap-1.5">
          {advocate.status === "active" ? (
            <button onClick={() => onSetStatus("paused")} className="h-8 px-2.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[11.5px] font-semibold flex items-center gap-1">
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          ) : (
            <button onClick={() => onSetStatus("active")} className="h-8 px-2.5 rounded-md border border-border bg-muted text-ink text-[11.5px] font-semibold flex items-center gap-1">
              <Play className="h-3.5 w-3.5" /> Activate
            </button>
          )}
          {advocate.status !== "banned" ? (
            <button onClick={() => { if (confirm(`Ban ${advocate.name}?`)) onSetStatus("banned"); }}
              className="h-8 px-2.5 rounded-md border border-rose-200 bg-white text-rose-600 text-[11.5px] font-semibold flex items-center gap-1 hover:bg-rose-50">
              <Ban className="h-3.5 w-3.5" /> Ban
            </button>
          ) : (
            <button onClick={() => onSetStatus("active")} className="h-8 px-2.5 rounded-md border border-black/10 bg-white text-[11.5px] font-semibold flex items-center gap-1 hover:bg-black/[0.04]">
              Unban
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ============================ REFERRALS ============================ */

function ReferralsTab() {
  const { referrals, approveReferral, rejectReferral } = useReferrals();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | ReferralStatus>("all");
  const [channel, setChannel] = useState<"all" | Referral["channel"]>("all");

  const list = useMemo(() => referrals
    .filter((r) => status === "all" || r.status === status)
    .filter((r) => channel === "all" || r.channel === channel)
    .filter((r) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return [r.friendName, r.friendEmail, r.advocateName, r.orderId ?? ""].some((v) => v.toLowerCase().includes(query));
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [referrals, status, channel, q]);

  const counts = useMemo(() => {
    const c: Record<"all" | ReferralStatus, number> = { all: referrals.length, pending: 0, qualified: 0, rewarded: 0, expired: 0, flagged: 0 };
    referrals.forEach((r) => { c[r.status]++; });
    return c;
  }, [referrals]);

  const exportCSV = () => downloadCSV("referrals.csv", list.map((r) => ({
    Friend: r.friendName, Email: r.friendEmail, Advocate: r.advocateName,
    Channel: r.channel, Status: r.status, Order: r.orderId ?? "",
    Spend: r.spendMinor, Reward: r.rewardMinor, FraudScore: r.fraudScore,
    Created: r.createdAt.slice(0, 10),
  })));

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap mb-4">
        {(Object.keys(counts) as ("all" | ReferralStatus)[]).map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`h-8 px-3 rounded-full text-[12px] font-semibold border transition-colors ${
              status === s ? "bg-ink text-white border-ink" : "bg-white border-black/10 text-ink hover:bg-black/[0.04]"
            }`}>
            {s === "all" ? "All" : STATUS_LABEL[s]}
            <span className={`ml-1.5 text-[10.5px] ${status === s ? "text-white/70" : "text-muted-foreground"}`}>{counts[s]}</span>
          </button>
        ))}
      </div>

      <Toolbar>
        <div className="flex-1 min-w-[220px] max-w-md h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search friend, advocate, order…"
            className="flex-1 bg-transparent outline-none text-[13px]" />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>
        <SelectRow label="Channel" value={channel} onChange={(v) => setChannel(v as typeof channel)}
          options={[{ value: "all", label: "All channels" }, ...(Object.keys(CHANNEL_META) as Referral["channel"][]).map((k) => ({ value: k, label: CHANNEL_META[k].label }))]} />
        <button onClick={exportCSV} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </Toolbar>

      {list.length === 0 ? (
        <Card><Empty title="No referrals match" sub="Try broadening the filters." /></Card>
      ) : (
        <div className="rounded-lg border border-black/[0.08] bg-white overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-[#faf8f3] text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th>Friend</Th>
                <Th>Advocate</Th>
                <Th>Channel</Th>
                <Th>Status</Th>
                <Th className="text-right">Spend</Th>
                <Th className="text-right">Reward</Th>
                <Th>Risk</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const meta = CHANNEL_META[r.channel];
                const risk = r.fraudScore >= 65 ? "high" : r.fraudScore >= 35 ? "med" : "low";
                return (
                  <tr key={r.id} className="border-t border-black/[0.05] hover:bg-black/[0.015]">
                    <Td>
                      <div className="font-semibold">{r.friendName}</div>
                      <div className="text-[11px] text-muted-foreground">{r.friendEmail}</div>
                      {r.orderId && <div className="text-[10.5px] text-muted-foreground mt-0.5">Order {r.orderId}</div>}
                    </Td>
                    <Td>{r.advocateName}</Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${meta.tone}`}>
                        <meta.Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </Td>
                    <Td><StatusPill status={STATUS_LABEL[r.status]} /></Td>
                    <Td className="text-right tabular-nums">{r.spendMinor ? naira(r.spendMinor) : " - "}</Td>
                    <Td className="text-right tabular-nums">{r.rewardMinor ? naira(r.rewardMinor) : " - "}</Td>
                    <Td>
                      <span className={`text-[11px] font-semibold ${
                        risk === "high" ? "text-rose-600" : risk === "med" ? "text-amber-600" : "text-ink"
                      }`}>
                        {risk === "high" && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                        {r.fraudScore}
                      </span>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      {(r.status === "qualified" || r.status === "pending" || r.status === "flagged") && (
                        <>
                          <button onClick={() => approveReferral(r.id)}
                            className="h-7 px-2 rounded-md border border-border bg-muted text-ink text-[11px] font-semibold mr-1 inline-flex items-center gap-1">
                            <Check className="h-3 w-3" /> Approve
                          </button>
                          <button onClick={() => rejectReferral(r.id)}
                            className="h-7 px-2 rounded-md border border-black/10 bg-white text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-black/[0.04]">
                            <X className="h-3 w-3" /> Reject
                          </button>
                        </>
                      )}
                      {r.status === "rewarded" && <span className="text-[11px] text-ink font-semibold">Paid</span>}
                      {r.status === "expired" && <span className="text-[11px] text-muted-foreground">Closed</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ============================ PROGRAM ============================ */

function ProgramTab() {
  const { config, updateConfig } = useReferrals();
  const [form, setForm] = useState({ ...config });
  const [saved, setSaved] = useState(false);
  const patch = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });
  const save = () => { updateConfig(form); setSaved(true); setTimeout(() => setSaved(false), 1500); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-5">
      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display font-bold text-[15px]">Program status</div>
              <div className="text-[11.5px] text-muted-foreground">Turn the entire referral program on or off across web and mobile.</div>
            </div>
            <button onClick={() => patch("enabled", !form.enabled)}
              className={`h-8 px-3 rounded-md border text-[12px] font-semibold flex items-center gap-1.5 ${
                form.enabled ? "border-border bg-muted text-ink" : "border-black/10 bg-white"
              }`}>
              {form.enabled ? <><Play className="h-3.5 w-3.5" /> Active</> : <><Pause className="h-3.5 w-3.5" /> Paused</>}
            </button>
          </div>
        </Card>

        <Card>
          <div className="font-display font-bold text-[15px] mb-3">Rewards</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RewardEditor label="Advocate reward"
              caption="Given to the referring advocate when their friend completes a qualifying order."
              value={form.advocateReward}
              onChange={(v) => patch("advocateReward", v)} />
            <RewardEditor label="Friend reward"
              caption="Given to the friend as a first-order discount when they use the referral link."
              value={form.friendReward}
              onChange={(v) => patch("friendReward", v)} />
          </div>
        </Card>

        <Card>
          <div className="font-display font-bold text-[15px] mb-3">Qualification & limits</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumberField label="Qualifying spend (NGN)"
              value={form.qualifyingSpendMinor}
              onChange={(v) => patch("qualifyingSpendMinor", v)}
              hint="Minimum friend order value before an advocate reward is issued." />
            <NumberField label="Cookie window (days)"
              value={form.cookieWindowDays}
              onChange={(v) => patch("cookieWindowDays", v)}
              hint="How long a click is attributed to the advocate." />
            <NumberField label="Max rewards per advocate / month"
              value={form.maxRewardsPerAdvocate}
              onChange={(v) => patch("maxRewardsPerAdvocate", v)} />
            <NumberField label="Fraud score threshold"
              value={form.fraudScoreThreshold}
              onChange={(v) => patch("fraudScoreThreshold", v)}
              hint="Referrals above this score are auto-flagged for review." />
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            <ToggleRow label="Require first-order status"
              caption="Only reward when the friend has no prior orders."
              value={form.requireFirstOrder}
              onChange={(v) => patch("requireFirstOrder", v)} />
            <ToggleRow label="Auto-approve within limits"
              caption="Skip manual review for referrals under the fraud threshold."
              value={form.autoApproveWithinLimit}
              onChange={(v) => patch("autoApproveWithinLimit", v)} />
          </div>
        </Card>

        <Card>
          <div className="font-display font-bold text-[15px] mb-3">Landing page copy</div>
          <div className="space-y-2.5">
            <TextField label="Headline" value={form.landingHeadline} onChange={(v) => patch("landingHeadline", v)} />
            <label className="block">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Subhead</div>
              <textarea value={form.landingSubhead} onChange={(e) => patch("landingSubhead", e.target.value)} rows={3}
                className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-none" />
            </label>
          </div>
        </Card>

        <div className="flex items-center gap-2">
          <button onClick={() => setForm({ ...config })} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Revert</button>
          <button onClick={save} className="ml-auto h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
            {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : "Save program"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2">Preview</div>
          <div className="rounded-lg bg-ink text-white p-5">
            <div className="flex items-center gap-1.5 text-gold mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[10.5px] uppercase tracking-[0.2em] font-bold">ASL Referrals</span>
            </div>
            <div className="font-display text-[22px] leading-tight">{form.landingHeadline}</div>
            <div className="text-[12.5px] text-white/70 mt-2 leading-relaxed">{form.landingSubhead}</div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md border border-white/15 bg-white/5 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Friend gets</div>
                <div className="font-display text-[15px] mt-0.5">{formatReward(form.friendReward)}</div>
              </div>
              <div className="rounded-md border border-gold/40 bg-gold/10 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-gold font-semibold">You get</div>
                <div className="font-display text-[15px] mt-0.5 text-gold">{formatReward(form.advocateReward)}</div>
              </div>
            </div>
            <div className="mt-4 rounded-md border border-white/15 bg-white/5 px-3 py-2 flex items-center gap-2">
              <LinkIcon className="h-3.5 w-3.5 text-white/60" />
              <div className="text-[11.5px] font-sans flex-1 truncate">asloriginals.online/?ref=YOU-24</div>
              <span className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Copy</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2">Program at a glance</div>
          <ul className="text-[12px] space-y-1.5">
            <RuleItem>Advocate reward: <b>{formatReward(form.advocateReward)}</b></RuleItem>
            <RuleItem>Friend reward: <b>{formatReward(form.friendReward)}</b></RuleItem>
            <RuleItem>Qualifying spend: <b>{naira(form.qualifyingSpendMinor)}</b></RuleItem>
            <RuleItem>Cookie window: <b>{form.cookieWindowDays} days</b></RuleItem>
            <RuleItem>Max rewards / month: <b>{form.maxRewardsPerAdvocate}</b></RuleItem>
            <RuleItem>Fraud threshold: <b>{form.fraudScoreThreshold}</b></RuleItem>
            <RuleItem>First-order required: <b>{form.requireFirstOrder ? "Yes" : "No"}</b></RuleItem>
            <RuleItem>Auto-approve: <b>{form.autoApproveWithinLimit ? "Yes" : "No"}</b></RuleItem>
          </ul>
        </Card>

        <Card>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
            <ShieldAlert className="h-3 w-3" /> Fraud safeguards
          </div>
          <ul className="text-[11.5px] space-y-1.5 text-muted-foreground">
            <li>· Device fingerprint match penalises self-referrals.</li>
            <li>· Same-household detection via shipping address hash.</li>
            <li>· High refund velocity temporarily suspends payouts.</li>
            <li>· Advocates over threshold require manual approval before rewards clear.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ============================ shared UI ============================ */

function KPI({ label, value, sub, Icon, tone = "text-ink" }: {
  label: string; value: string; sub?: string; Icon: typeof Share2; tone?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className={`font-display text-[22px] leading-tight mt-1 ${tone}`}>{value}</div>
          {sub && <div className="text-[10.5px] text-muted-foreground mt-1 flex items-center gap-1">
            <ArrowUp className="h-3 w-3 text-ink" />{sub}
          </div>}
        </div>
        <div className="h-8 w-8 rounded-md bg-black/[0.04] grid place-items-center"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#faf8f3] py-1.5">
      <div className={`font-display text-[13px] leading-tight tabular-nums ${tone ?? ""}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
      <span className="text-muted-foreground text-[11px]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent outline-none pr-1">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-semibold px-3 py-2.5 ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-top ${className}`}>{children}</td>;
}

function RewardEditor({ label, caption, value, onChange }: {
  label: string; caption: string;
  value: { type: RewardType; value: number };
  onChange: (v: { type: RewardType; value: number }) => void;
}) {
  return (
    <div className="rounded-lg border border-black/[0.08] p-3 bg-[#faf8f3]">
      <div className="font-semibold text-[13px]">{label}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{caption}</div>
      <div className="grid grid-cols-[110px,1fr] gap-2 mt-3">
        <select value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as RewardType })}
          className="h-9 rounded-md border border-black/10 bg-white px-2 text-[12.5px] outline-none focus:border-ink">
          <option value="credit">Wallet credit</option>
          <option value="percent">Percent off</option>
          <option value="fixed">Fixed off</option>
          <option value="points">Club points</option>
        </select>
        <div className="h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
          {value.type === "credit" || value.type === "fixed" ? <span className="text-muted-foreground text-[12px]">₦</span> : null}
          <input type="number" value={value.value}
            onChange={(e) => onChange({ ...value, value: Number(e.target.value) || 0 })}
            className="flex-1 bg-transparent outline-none text-[13px] tabular-nums" />
          {value.type === "percent" && <span className="text-muted-foreground text-[12px]">%</span>}
          {value.type === "points" && <span className="text-muted-foreground text-[12px]">pts</span>}
        </div>
      </div>
      <div className="mt-2 text-[11.5px] text-ink font-semibold">{formatReward(value)}</div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink" />
    </label>
  );
}

function NumberField({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] tabular-nums outline-none focus:border-ink" />
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}

function ToggleRow({ label, caption, value, onChange }: {
  label: string; caption: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`text-left rounded-md border p-3 transition-colors ${
        value ? "border-border bg-muted/50" : "border-black/10 bg-white"
      }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-[12.5px]">{label}</div>
        <div className={`h-5 w-9 rounded-full relative transition-colors ${value ? "bg-ink" : "bg-black/15"}`}>
          <div className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-all ${value ? "left-4" : "left-0.5"}`} />
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{caption}</div>
    </button>
  );
}

function RuleItem({ children }: { children: React.ReactNode }) {
  return <li className="flex items-start gap-2"><ChevronRight className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" /><span>{children}</span></li>;
}

function formatReward(r: { type: RewardType; value: number }): string {
  if (r.type === "credit" || r.type === "fixed") return naira(r.value);
  if (r.type === "percent") return `${r.value}% off`;
  return `${r.value.toLocaleString()} points`;
}
