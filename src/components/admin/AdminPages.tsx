import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, StatusPill, Toolbar } from "./ui";
import {
  usePages, type PageRecord, type PageStatus, type PageTemplate, type BlockType, type PageBlock,
} from "@/lib/pages-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Search, Plus, Copy, Trash2, X, ExternalLink, Eye, Edit3, Download, FileText,
  Filter, Calendar, Layers, Image as ImageIcon, Quote, Rows3, Columns3, PlayCircle,
  Type, Sparkles, ChevronUp, ChevronDown, Archive, Send, Save, Globe, Lock, EyeOff,
  ScrollText, Rocket, BookOpen, LifeBuoy, LayoutTemplate,
} from "lucide-react";

const TEMPLATE_META: Record<PageTemplate, { label: string; Icon: typeof FileText; tone: string }> = {
  standard: { label: "Standard", Icon: FileText, tone: "bg-slate-100 text-slate-700 border-slate-200" },
  legal: { label: "Legal", Icon: ScrollText, tone: "bg-slate-50 text-slate-600 border-slate-200" },
  landing: { label: "Landing", Icon: Rocket, tone: "bg-gold/15 text-gold-deep border-gold/30" },
  story: { label: "Story", Icon: BookOpen, tone: "bg-violet-50 text-violet-700 border-violet-200" },
  help: { label: "Help", Icon: LifeBuoy, tone: "bg-sky-50 text-sky-700 border-sky-200" },
};

const BLOCK_META: Record<BlockType, { label: string; Icon: typeof Type }> = {
  hero: { label: "Hero", Icon: LayoutTemplate },
  rich_text: { label: "Rich text", Icon: Type },
  image: { label: "Image", Icon: ImageIcon },
  gallery: { label: "Gallery", Icon: Layers },
  cta: { label: "Call to action", Icon: Sparkles },
  faq: { label: "FAQ block", Icon: Rows3 },
  video: { label: "Video", Icon: PlayCircle },
  columns: { label: "Columns", Icon: Columns3 },
  quote: { label: "Quote", Icon: Quote },
};

export function AdminPages() {
  const { pages, hydrate, create, duplicate, remove, setStatus } = usePages();
  const [q, setQ] = useState("");
  const [status, setStatusF] = useState<PageStatus | "all">("all");
  const [template, setTemplateF] = useState<PageTemplate | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => pages.filter((p) => {
    if (status !== "all" && p.status !== status) return false;
    if (template !== "all" && p.template !== template) return false;
    if (q && !`${p.title} ${p.slug}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [pages, q, status, template]);

  const counts = useMemo(() => ({
    all: pages.length,
    published: pages.filter((p) => p.status === "published").length,
    draft: pages.filter((p) => p.status === "draft").length,
    scheduled: pages.filter((p) => p.status === "scheduled").length,
    archived: pages.filter((p) => p.status === "archived").length,
  }), [pages]);

  const totalViews = pages.reduce((s, p) => s + p.views30d, 0);
  const inNav = pages.filter((p) => p.showInHeader || p.showInFooter).length;

  const selected = pages.find((p) => p.id === selectedId) || null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Pages"
        subtitle="Content pages, legal documents, landing pages and stories."
        actions={
          <>
            <button
              onClick={() => downloadCSV("pages.csv", pages.map((p) => ({
                title: p.title, slug: p.slug, template: p.template, status: p.status,
                published_at: p.publishedAt ?? "", views_30d: p.views30d, in_header: p.showInHeader, in_footer: p.showInFooter,
              })))}
              className="h-9 px-3 rounded-md border border-black/10 text-[13px] font-semibold text-ink hover:bg-black/[0.04] flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-semibold hover:opacity-90 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> New page
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Total pages" value={pages.length.toString()} />
        <Kpi label="Published" value={counts.published.toString()} tone="green" />
        <Kpi label="Views · 30d" value={totalViews.toLocaleString()} tone="gold" />
        <Kpi label="In site nav" value={inNav.toString()} />
      </div>

      {/* Filters */}
      <Toolbar>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or slug…"
            className="w-full h-9 pl-9 pr-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-black/10 rounded-md p-0.5">
          {(["all", "published", "draft", "scheduled", "archived"] as const).map((s) => (
            <button key={s}
              onClick={() => setStatusF(s)}
              className={`h-7 px-2.5 rounded text-[12px] font-semibold capitalize ${
                status === s ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"
              }`}>
              {s} <span className="opacity-60 ml-1">{counts[s as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
        <select
          value={template} onChange={(e) => setTemplateF(e.target.value as PageTemplate | "all")}
          className="h-9 px-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
        >
          <option value="all">All templates</option>
          {(Object.keys(TEMPLATE_META) as PageTemplate[]).map((t) => (
            <option key={t} value={t}>{TEMPLATE_META[t].label}</option>
          ))}
        </select>
      </Toolbar>

      {/* Table */}
      <Card padded={false}>
        {filtered.length === 0 ? (
          <div className="p-6"><Empty title="No pages match" sub="Try clearing filters or create a new page." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-black/[0.03] text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Title</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Template</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Visibility</th>
                  <th className="text-left px-4 py-2.5 font-semibold">In nav</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Views 30d</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Updated</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const T = TEMPLATE_META[p.template];
                  return (
                    <tr key={p.id} className="border-t border-black/[0.05] hover:bg-black/[0.02]">
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedId(p.id)} className="text-left">
                          <div className="font-semibold text-ink">{p.title}</div>
                          <div className="text-[11.5px] text-muted-foreground font-sans">{p.slug}</div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${T.tone}`}>
                          <T.Icon className="h-3 w-3" /> {T.label}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{p.visibility}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {p.showInHeader && <Chip tone="gold">Header</Chip>}
                          {p.showInFooter && <Chip tone="neutral">Footer</Chip>}
                          {!p.showInHeader && !p.showInFooter && <span className="text-muted-foreground text-[11.5px]"> - </span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.views30d.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground text-[12px]">{new Date(p.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedId(p.id)} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => duplicate(p.id)} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
                          {p.status === "published" ? (
                            <button onClick={() => setStatus(p.id, "draft")} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]" title="Unpublish"><EyeOff className="h-3.5 w-3.5" /></button>
                          ) : (
                            <button onClick={() => setStatus(p.id, "published")} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]" title="Publish"><Send className="h-3.5 w-3.5" /></button>
                          )}
                          <button onClick={() => remove(p.id)} className="h-7 w-7 grid place-items-center rounded hover:bg-rose-50 text-rose-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && <PageDrawer page={selected} onClose={() => setSelectedId(null)} />}
      {showNew && (
        <NewPageModal
          onClose={() => setShowNew(false)}
          onCreate={async (payload) => {
            const id = await create(payload);
            setShowNew(false);
            if (id) setSelectedId(id);
          }}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "green" | "gold" }) {
  const tones = {
    neutral: "text-ink",
    green: "text-ink",
    gold: "text-gold-deep",
  } as const;
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={`font-display text-[26px] leading-none mt-1.5 ${tones[tone]}`}>{value}</div>
    </Card>
  );
}

/* =========================== DRAWER =========================== */

function PageDrawer({ page, onClose }: { page: PageRecord; onClose: () => void }) {
  const { update, addBlock, removeBlock, updateBlock, moveBlock, setStatus } = usePages();
  const [tab, setTab] = useState<"content" | "seo" | "settings">("content");
  const T = TEMPLATE_META[page.template];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/40" aria-label="Close" />
      <div className="relative w-full max-w-[880px] bg-[#f7f5ef] h-full overflow-y-auto border-l border-black/10">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-5 py-3 border-b border-black/[0.08] flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <T.Icon className="h-4 w-4 text-muted-foreground" />
              <input
                value={page.title}
                onChange={(e) => update(page.id, { title: e.target.value })}
                className="font-display text-[18px] font-bold bg-transparent outline-none border-b border-transparent focus:border-ink/30 min-w-0 flex-1"
              />
              <StatusPill status={page.status} />
            </div>
            <div className="text-[11.5px] text-muted-foreground font-sans mt-0.5 flex items-center gap-1">
              <Globe className="h-3 w-3" /> asloriginals.online<span className="text-ink">{page.slug}</span>
              <a href="#" onClick={(e) => e.preventDefault()} className="ml-1 opacity-70 hover:opacity-100"><ExternalLink className="h-3 w-3" /></a>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {page.status !== "published" && (
              <button onClick={() => setStatus(page.id, "published")}
                className="h-8 px-3 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:opacity-90 flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" /> Publish
              </button>
            )}
            {page.status === "published" && (
              <button onClick={() => setStatus(page.id, "draft")}
                className="h-8 px-3 rounded-md border border-black/10 text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
                <EyeOff className="h-3.5 w-3.5" /> Unpublish
              </button>
            )}
            <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-black/[0.06]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-black/[0.08] bg-white px-3">
          {(["content", "seo", "settings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 h-10 text-[12.5px] font-semibold capitalize border-b-2 ${
                tab === t ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
              }`}>
              {t === "seo" ? "SEO" : t}
            </button>
          ))}
        </div>

        {tab === "content" && (
          <div className="p-5 grid grid-cols-[1fr_260px] gap-4">
            <div className="space-y-3">
              {page.blocks.length === 0 && (
                <Card><Empty title="No blocks yet" sub="Add a block from the palette on the right." /></Card>
              )}
              {page.blocks.map((b, i) => (
                <BlockEditor
                  key={b.id}
                  block={b}
                  first={i === 0}
                  last={i === page.blocks.length - 1}
                  onChange={(patch) => updateBlock(page.id, b.id, patch)}
                  onRemove={() => removeBlock(page.id, b.id)}
                  onMove={(dir) => moveBlock(page.id, b.id, dir)}
                />
              ))}
            </div>
            <div className="space-y-3">
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Add block</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(BLOCK_META) as BlockType[]).map((k) => {
                    const M = BLOCK_META[k];
                    return (
                      <button key={k}
                        onClick={() => addBlock(page.id, k)}
                        className="flex items-center gap-1.5 h-9 px-2 rounded-md border border-black/10 text-[12px] font-medium hover:bg-black/[0.04] text-left">
                        <M.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{M.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Preview stats</div>
                <div className="space-y-2 text-[12.5px]">
                  <Row label="Views · 30d" value={page.views30d.toLocaleString()} />
                  <Row label="Blocks" value={page.blocks.length.toString()} />
                  <Row label="Template" value={T.label} />
                  <Row label="Author" value={page.author} />
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === "seo" && <SeoPane page={page} />}
        {tab === "settings" && <SettingsPane page={page} />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function BlockEditor({
  block, first, last, onChange, onRemove, onMove,
}: {
  block: PageBlock; first: boolean; last: boolean;
  onChange: (p: Partial<PageBlock>) => void; onRemove: () => void; onMove: (d: -1 | 1) => void;
}) {
  const M = BLOCK_META[block.type];
  return (
    <Card className="!p-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-black/[0.06] bg-black/[0.02]">
        <M.Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="text-[12px] font-semibold flex-1">{M.label}</div>
        <button onClick={() => onMove(-1)} disabled={first}
          className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06] disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
        <button onClick={() => onMove(1)} disabled={last}
          className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06] disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
        <button onClick={onRemove} className="h-7 w-7 grid place-items-center rounded hover:bg-rose-50 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <div className="p-3 space-y-2">
        {(block.type === "hero" || block.type === "cta" || block.type === "image" || block.type === "quote" || block.type === "video" || block.type === "faq" || block.type === "columns" || block.type === "gallery" || block.type === "rich_text") && (
          <input
            value={block.title ?? ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Title / heading"
            className="w-full h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
          />
        )}
        <textarea
          value={block.body ?? ""}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder={block.type === "rich_text" ? "Body copy…" : "Description"}
          rows={block.type === "rich_text" ? 5 : 2}
          className="w-full px-3 py-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
        />
        {(block.type === "hero" || block.type === "image" || block.type === "gallery" || block.type === "cta") && (
          <input
            value={block.imageUrl ?? ""}
            onChange={(e) => onChange({ imageUrl: e.target.value })}
            placeholder="Image URL"
            className="w-full h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink font-sans"
          />
        )}
        {(block.type === "cta" || block.type === "hero") && (
          <div className="grid grid-cols-2 gap-2">
            <input
              value={block.ctaLabel ?? ""}
              onChange={(e) => onChange({ ctaLabel: e.target.value })}
              placeholder="Button label"
              className="h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
            />
            <input
              value={block.ctaHref ?? ""}
              onChange={(e) => onChange({ ctaHref: e.target.value })}
              placeholder="Button link (/shop)"
              className="h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink font-sans"
            />
          </div>
        )}
      </div>
    </Card>
  );
}

/* =========================== SEO PANE =========================== */

function SeoPane({ page }: { page: PageRecord }) {
  const { update } = usePages();
  const titleLen = page.seoTitle.length;
  const descLen = page.seoDescription.length;
  return (
    <div className="p-5 grid grid-cols-[1fr_320px] gap-4">
      <div className="space-y-3">
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">SEO title</div>
          <input
            value={page.seoTitle} onChange={(e) => update(page.id, { seoTitle: e.target.value })}
            className="w-full h-10 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
          />
          <div className={`text-[11px] mt-1 ${titleLen > 60 ? "text-rose-600" : "text-muted-foreground"}`}>{titleLen} / 60</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Meta description</div>
          <textarea
            rows={3}
            value={page.seoDescription} onChange={(e) => update(page.id, { seoDescription: e.target.value })}
            className="w-full px-3 py-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
          />
          <div className={`text-[11px] mt-1 ${descLen > 160 ? "text-rose-600" : "text-muted-foreground"}`}>{descLen} / 160</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">OG image URL</div>
          <input
            value={page.ogImage ?? ""} onChange={(e) => update(page.id, { ogImage: e.target.value })}
            placeholder="https://…/og.jpg"
            className="w-full h-10 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink font-sans"
          />
        </Card>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Google preview</div>
        <div className="bg-white border border-black/[0.08] rounded-md p-3">
          <div className="text-[12px] text-[#202124]">asloriginals.online<span className="text-muted-foreground">{page.slug}</span></div>
          <div className="text-[16px] leading-snug text-[#1a0dab] mt-0.5 truncate">{page.seoTitle || page.title}</div>
          <div className="text-[12.5px] text-[#4d5156] mt-0.5 line-clamp-2">{page.seoDescription || "No description set."}</div>
        </div>
      </div>
    </div>
  );
}

/* =========================== SETTINGS PANE =========================== */

function SettingsPane({ page }: { page: PageRecord }) {
  const { update, remove } = usePages();
  return (
    <div className="p-5 grid grid-cols-2 gap-4">
      <Card>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">URL slug</div>
        <div className="flex items-center gap-1">
          <span className="text-[13px] text-muted-foreground font-sans">/</span>
          <input
            value={page.slug.replace(/^\//, "")}
            onChange={(e) => update(page.id, { slug: `/${e.target.value.replace(/^\/+/, "")}` })}
            className="flex-1 h-10 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink font-sans"
          />
        </div>
      </Card>
      <Card>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Template</div>
        <select
          value={page.template} onChange={(e) => update(page.id, { template: e.target.value as PageTemplate })}
          className="w-full h-10 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
        >
          {(Object.keys(TEMPLATE_META) as PageTemplate[]).map((t) => (
            <option key={t} value={t}>{TEMPLATE_META[t].label}</option>
          ))}
        </select>
      </Card>
      <Card>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Visibility</div>
        <div className="flex gap-2">
          {(["public", "unlisted", "members"] as const).map((v) => (
            <button key={v} onClick={() => update(page.id, { visibility: v })}
              className={`flex-1 h-9 rounded-md border text-[12.5px] font-semibold capitalize flex items-center justify-center gap-1.5 ${
                page.visibility === v ? "bg-ink text-white border-ink" : "bg-white border-black/10 hover:bg-black/[0.04]"
              }`}>
              {v === "public" ? <Globe className="h-3.5 w-3.5" /> : v === "unlisted" ? <Eye className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {v}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Navigation</div>
        <label className="flex items-center gap-2 text-[13px] mb-1.5">
          <input type="checkbox" checked={page.showInHeader}
            onChange={(e) => update(page.id, { showInHeader: e.target.checked })} />
          Show in main header
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={page.showInFooter}
            onChange={(e) => update(page.id, { showInFooter: e.target.checked })} />
          Show in footer
        </label>
      </Card>
      <Card>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Schedule</div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="datetime-local"
            value={page.scheduledFor ? page.scheduledFor.slice(0, 16) : ""}
            onChange={(e) => update(page.id, { scheduledFor: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            className="flex-1 h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
          />
        </div>
        <p className="text-[11.5px] text-muted-foreground mt-1.5">Publish automatically at the scheduled time.</p>
      </Card>
      <Card className="border-rose-200 bg-rose-50/40">
        <div className="text-[11px] uppercase tracking-wider text-rose-700 font-semibold mb-2">Danger zone</div>
        <button
          onClick={() => { if (confirm("Delete this page? This cannot be undone.")) remove(page.id); }}
          className="h-9 px-3 rounded-md bg-white border border-rose-200 text-rose-700 text-[12.5px] font-semibold hover:bg-rose-100 flex items-center gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete page
        </button>
      </Card>
    </div>
  );
}

/* =========================== NEW PAGE MODAL =========================== */

function NewPageModal({
  onClose, onCreate,
}: { onClose: () => void; onCreate: (p: { title: string; slug: string; template: PageTemplate }) => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState<PageTemplate>("standard");

  const autoSlug = (t: string) => "/" + t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-black/40" aria-label="Close" />
      <div className="relative w-full max-w-[520px] bg-white rounded-xl border border-black/10 shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-black/[0.08] flex items-center justify-between">
          <div className="font-display text-[16px] font-bold">New page</div>
          <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Title</label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (!slug) setSlug(autoSlug(e.target.value)); }}
              placeholder="e.g. Ambassador Programme"
              className="mt-1 w-full h-10 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Slug</label>
            <input
              value={slug || autoSlug(title)}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="/ambassador-programme"
              className="mt-1 w-full h-10 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink font-sans"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">Template</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(TEMPLATE_META) as PageTemplate[]).map((t) => {
                const M = TEMPLATE_META[t];
                return (
                  <button key={t} onClick={() => setTemplate(t)}
                    className={`h-16 rounded-md border text-[12px] font-semibold flex flex-col items-center justify-center gap-1 ${
                      template === t ? "bg-ink text-white border-ink" : "bg-white border-black/10 hover:bg-black/[0.04]"
                    }`}>
                    <M.Icon className="h-4 w-4" />
                    {M.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-black/[0.08] flex items-center justify-end gap-2 bg-black/[0.02]">
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-black/10 text-[13px] font-semibold hover:bg-black/[0.04]">Cancel</button>
          <button
            disabled={!title.trim()}
            onClick={() => onCreate({ title: title.trim(), slug: (slug || autoSlug(title)).trim(), template })}
            className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Create page
          </button>
        </div>
      </div>
    </div>
  );
}
