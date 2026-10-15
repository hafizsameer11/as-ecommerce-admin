import { useEffect, useMemo, useState } from "react";
import {
  Search, Star, Check, X, Flag, Trash2, MessageSquare, Download, ExternalLink,
  ShieldAlert, ChevronDown,
} from "lucide-react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, IconButton, Toolbar, Empty, TableWrap, StatusPill } from "./ui";
import { useAdminReviews, type AdminReview, type ReviewStatus } from "@/lib/admin-reviews-store";
import { downloadCSV } from "@/lib/admin-export";
import { toast } from "sonner";

const TABS: { id: "all" | ReviewStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "published", label: "Published" },
  { id: "flagged", label: "Flagged" },
  { id: "rejected", label: "Rejected" },
];

function Stars({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= n ? "fill-gold text-gold" : "text-black/20"}
        />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const { reviews, hydrate, setStatus, setStatusMany, reply, remove, removeMany, reset } = useAdminReviews();
  const [tab, setTab] = useState<"all" | ReviewStatus>("all");
  const [q, setQ] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [brand, setBrand] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "rating-hi" | "rating-lo" | "helpful">("recent");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const brands = useMemo(() => {
    const s = new Set<string>();
    reviews.forEach((r) => s.add(r.productBrand));
    return Array.from(s).sort();
  }, [reviews]);

  const filtered = useMemo(() => {
    const list = reviews
      .filter((r) => (tab === "all" ? true : r.status === tab))
      .filter((r) => (brand === "all" ? true : r.productBrand === brand))
      .filter((r) => r.rating >= minRating)
      .filter((r) => {
        if (!q) return true;
        const s = q.toLowerCase();
        return (
          r.author.toLowerCase().includes(s) ||
          r.title.toLowerCase().includes(s) ||
          r.body.toLowerCase().includes(s) ||
          r.productName.toLowerCase().includes(s)
        );
      });
    switch (sort) {
      case "rating-hi": return [...list].sort((a, b) => b.rating - a.rating);
      case "rating-lo": return [...list].sort((a, b) => a.rating - b.rating);
      case "helpful": return [...list].sort((a, b) => b.helpful - a.helpful);
      default: return list;
    }
  }, [reviews, tab, brand, minRating, q, sort]);

  const kpis = useMemo(() => {
    const total = reviews.length;
    const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const pending = reviews.filter((r) => r.status === "pending").length;
    const flagged = reviews.filter((r) => r.status === "flagged").length;
    const replyRate = total
      ? Math.round((reviews.filter((r) => r.reply).length / total) * 100)
      : 0;
    return { total, avg, pending, flagged, replyRate };
  }, [reviews]);

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
  const allChecked = filtered.length > 0 && filtered.every((r) => selected[r.id]);
  const open = openId ? reviews.find((r) => r.id === openId) ?? null : null;

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const toggleAll = () => {
    if (allChecked) {
      const n = { ...selected };
      filtered.forEach((r) => delete n[r.id]);
      setSelected(n);
    } else {
      const n = { ...selected };
      filtered.forEach((r) => (n[r.id] = true));
      setSelected(n);
    }
  };

  const bulk = (status: ReviewStatus) => {
    setStatusMany(selectedIds, status);
    toast.success(`${selectedIds.length} review${selectedIds.length === 1 ? "" : "s"} marked ${status}`);
    setSelected({});
  };

  const doExport = () => {
    const rows = (selectedIds.length ? filtered.filter((r) => selected[r.id]) : filtered).map((r) => ({
      id: r.id,
      product: r.productName,
      brand: r.productBrand,
      author: r.author,
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      helpful: r.helpful,
      date: r.date,
      replied: r.reply ? "yes" : "no",
    }));
    downloadCSV(`asl-reviews-${Date.now()}.csv`, rows);
  };

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <PageHeader
        title="Reviews"
        subtitle="Moderate customer reviews, publish, reject, flag and reply."
        actions={
          <>
            <button
              onClick={doExport}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5 hover:bg-black/[0.04]"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              onClick={() => { if (confirm("Reset reviews to seeded data?")) { reset(); toast.success("Reviews reset"); } }}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] hover:bg-black/[0.04]"
            >
              Reset
            </button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total reviews</div>
          <div className="font-display font-bold text-2xl mt-1">{kpis.total.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Average rating</div>
          <div className="font-display font-bold text-2xl mt-1 flex items-center gap-2">
            {kpis.avg.toFixed(2)}
            <Stars n={Math.round(kpis.avg)} size={14} />
          </div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pending</div>
          <div className="font-display font-bold text-2xl mt-1 text-amber-700">{kpis.pending}</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Flagged</div>
          <div className="font-display font-bold text-2xl mt-1 text-rose-700 flex items-center gap-1.5">
            {kpis.flagged}
            {kpis.flagged > 0 && <ShieldAlert className="h-4 w-4" />}
          </div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Reply rate</div>
          <div className="font-display font-bold text-2xl mt-1">{kpis.replyRate}%</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-black/10">
        {TABS.map((t) => {
          const count = t.id === "all" ? reviews.length : reviews.filter((r) => r.status === t.id).length;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 h-10 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                active ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
              }`}
            >
              {t.label}
              <span className="text-[10px] px-1.5 h-4 grid place-items-center rounded-full bg-black/[0.06] text-ink/70">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <Toolbar>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search author, product, or content…"
            className="w-full h-9 pl-9 pr-3 rounded-md border border-black/10 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div className="relative">
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-md border border-black/10 bg-white text-[13px] appearance-none"
          >
            <option value="all">All brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
        </div>
        <div className="relative">
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="h-9 pl-3 pr-8 rounded-md border border-black/10 bg-white text-[13px] appearance-none"
          >
            <option value={0}>All ratings</option>
            <option value={5}>5 stars only</option>
            <option value={4}>4★ &amp; up</option>
            <option value={3}>3★ &amp; up</option>
            <option value={2}>2★ &amp; up</option>
          </select>
          <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
        </div>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-9 pl-3 pr-8 rounded-md border border-black/10 bg-white text-[13px] appearance-none"
          >
            <option value="recent">Most recent</option>
            <option value="rating-hi">Rating high → low</option>
            <option value="rating-lo">Rating low → high</option>
            <option value="helpful">Most helpful</option>
          </select>
          <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
        </div>
      </Toolbar>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-14 z-10 mb-3 bg-ink text-white rounded-md px-4 h-11 flex items-center gap-3 text-[13px]">
          <span className="font-medium">{selectedIds.length} selected</span>
          <span className="text-white/40">·</span>
          <button onClick={() => bulk("published")} className="flex items-center gap-1 hover:text-gold"><Check className="h-4 w-4" /> Publish</button>
          <button onClick={() => bulk("rejected")} className="flex items-center gap-1 hover:text-gold"><X className="h-4 w-4" /> Reject</button>
          <button onClick={() => bulk("flagged")} className="flex items-center gap-1 hover:text-gold"><Flag className="h-4 w-4" /> Flag</button>
          <button
            onClick={() => {
              if (confirm(`Delete ${selectedIds.length} review(s)?`)) {
                removeMany(selectedIds);
                setSelected({});
                toast.success("Reviews deleted");
              }
            }}
            className="flex items-center gap-1 hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <div className="ml-auto">
            <button onClick={() => setSelected({})} className="text-white/60 hover:text-white">Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <Empty title="No reviews match" sub="Try adjusting filters or the search term." />
      ) : (
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.03] text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th className="px-3 py-2">Review</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Rating</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Helpful</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-black/[0.02]">
                  <td className="px-3 py-3 align-top">
                    <input type="checkbox" checked={!!selected[r.id]} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="px-3 py-3 align-top max-w-[420px]">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-black/[0.06] grid place-items-center text-[11px] font-semibold">{r.initials}</div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.author} {r.verified && <Chip tone="green" className="ml-1">Verified</Chip>}</div>
                        <div className="text-[12px] text-muted-foreground truncate">{r.title}</div>
                      </div>
                    </div>
                    <div className="mt-1.5 text-[12px] text-ink/80 line-clamp-2">{r.body}</div>
                    {r.reply && <div className="mt-1 text-[11px] text-ink flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Replied</div>}
                    {r.status === "flagged" && r.flaggedReason && (
                      <div className="mt-1 text-[11px] text-rose-700 flex items-center gap-1"><Flag className="h-3 w-3" /> {r.flaggedReason} · {r.reportedCount} report{r.reportedCount === 1 ? "" : "s"}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <a href={`/product/${encodeURIComponent(r.productId)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 group">
                      <img src={r.productImage} alt="" className="h-9 w-9 rounded object-cover bg-black/[0.04]" />
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.productBrand}</div>
                        <div className="text-[12px] font-medium truncate max-w-[180px] group-hover:underline">{r.productName}</div>
                      </div>
                    </a>
                  </td>
                  <td className="px-3 py-3 align-top"><Stars n={r.rating} /></td>
                  <td className="px-3 py-3 align-top"><StatusPill status={r.status} /></td>
                  <td className="px-3 py-3 align-top">{r.helpful}</td>
                  <td className="px-3 py-3 align-top text-muted-foreground">{r.date}</td>
                  <td className="px-3 py-3 align-top">
                    <button
                      onClick={() => { setOpenId(r.id); setReplyDraft(r.reply?.body ?? ""); }}
                      className="text-[12px] font-medium text-ink hover:text-gold underline underline-offset-2"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpenId(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full max-w-[560px] bg-white shadow-xl overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-black/[0.06] px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Review</div>
                <div className="font-display font-bold text-lg">{open.title}</div>
              </div>
              <IconButton title="Close" onClick={() => setOpenId(null)}><X className="h-4 w-4" /></IconButton>
            </div>

            <div className="p-6 space-y-5">
              <a href={`/product/${encodeURIComponent(open.productId)}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-black/[0.06] hover:bg-black/[0.02]">
                <img src={open.productImage} alt="" className="h-14 w-14 rounded object-cover bg-black/[0.04]" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{open.productBrand}</div>
                  <div className="text-[13px] font-medium truncate">{open.productName}</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-9 w-9 rounded-full bg-black/[0.06] grid place-items-center text-[12px] font-semibold">{open.initials}</div>
                  <div>
                    <div className="text-[13px] font-medium">{open.author} {open.verified && <Chip tone="green" className="ml-1">Verified buyer</Chip>}</div>
                    <div className="text-[11px] text-muted-foreground">{open.date} · {open.helpful} found this helpful</div>
                  </div>
                  <div className="ml-auto"><Stars n={open.rating} size={14} /></div>
                </div>
                <div className="text-[13px] text-ink/90 mt-2 leading-relaxed">{open.body}</div>
                {open.fit && <div className="mt-2 text-[12px] text-muted-foreground">Fit: <span className="text-ink">{open.fit}</span></div>}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">Status:</span>
                <StatusPill status={open.status} />
                {open.status === "flagged" && open.flaggedReason && (
                  <span className="text-[12px] text-rose-700">· {open.flaggedReason}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => { setStatus(open.id, "published"); toast.success("Published"); }} className="h-9 px-3 rounded-md bg-ink text-white text-[13px] flex items-center gap-1.5 hover:bg-ink"><Check className="h-4 w-4" /> Publish</button>
                <button onClick={() => { setStatus(open.id, "rejected"); toast.success("Rejected"); }} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5 hover:bg-black/[0.04]"><X className="h-4 w-4" /> Reject</button>
                <button onClick={() => { setStatus(open.id, "flagged"); toast.success("Flagged"); }} className="h-9 px-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-[13px] flex items-center gap-1.5 hover:bg-rose-100"><Flag className="h-4 w-4" /> Flag</button>
                <button
                  onClick={() => { if (confirm("Delete this review?")) { remove(open.id); setOpenId(null); toast.success("Deleted"); } }}
                  className="h-9 px-3 rounded-md border border-black/10 bg-white text-rose-700 text-[13px] flex items-center gap-1.5 hover:bg-rose-50 ml-auto"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>

              <div className="border-t border-black/[0.06] pt-4">
                <div className="text-[12px] font-semibold mb-2 flex items-center gap-1.5"><MessageSquare className="h-4 w-4" /> Store reply</div>
                {open.reply ? (
                  <div className="rounded-lg bg-muted/60 border border-border p-3 mb-3">
                    <div className="text-[11px] text-ink mb-1">{open.reply.author} · {new Date(open.reply.at).toLocaleString()}</div>
                    <div className="text-[13px] text-ink">{open.reply.body}</div>
                  </div>
                ) : (
                  <div className="text-[12px] text-muted-foreground mb-2">No reply sent yet.</div>
                )}
                <textarea
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder="Write a thoughtful, on-brand reply…"
                  rows={4}
                  className="w-full rounded-md border border-black/10 bg-white text-[13px] p-2 focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => {
                      if (!replyDraft.trim()) return;
                      reply(open.id, replyDraft.trim());
                      toast.success("Reply sent");
                    }}
                    className="h-9 px-4 rounded-md bg-ink text-white text-[13px] font-medium hover:bg-black"
                  >
                    {open.reply ? "Update reply" : "Send reply"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
