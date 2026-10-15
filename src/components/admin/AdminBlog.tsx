import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, StatusPill, Toolbar } from "./ui";
import { useBlog, type BlogPost, type PostStatus } from "@/lib/blog-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Search, Plus, Trash2, Copy, X, Send, EyeOff, Download, Calendar, Star,
  Clock, Eye, Heart, MessageCircle, Edit3, LayoutGrid, Rows3, Tag as TagIcon,
  Image as ImageIcon, User as UserIcon, Globe, ChevronRight, FolderPlus,
} from "lucide-react";

export function AdminBlog() {
  const { posts, categories, authors, hydrate, create, remove, duplicate, setStatus, toggleFeatured } = useBlog();
  const [q, setQ] = useState("");
  const [status, setStatusF] = useState<PostStatus | "all">("all");
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [authorId, setAuthorId] = useState<string | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => posts
    .filter((p) => status === "all" || p.status === status)
    .filter((p) => categoryId === "all" || p.categoryId === categoryId)
    .filter((p) => authorId === "all" || p.authorId === authorId)
    .filter((p) => !q || `${p.title} ${p.excerpt} ${p.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt)),
  [posts, status, categoryId, authorId, q]);

  const counts = useMemo(() => ({
    all: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    archived: posts.filter((p) => p.status === "archived").length,
  }), [posts]);

  const totalViews = posts.reduce((s, p) => s + p.views30d, 0);
  const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
  const featured = posts.filter((p) => p.featured).length;

  const selected = posts.find((p) => p.id === selectedId) || null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Blog"
        subtitle="Editorial, style stories, concierge guides and house notes."
        actions={
          <>
            <button
              onClick={() => downloadCSV("blog.csv", posts.map((p) => ({
                title: p.title, slug: p.slug,
                category: categories.find((c) => c.id === p.categoryId)?.name ?? "",
                author: authors.find((a) => a.id === p.authorId)?.name ?? "",
                status: p.status, featured: p.featured,
                published_at: p.publishedAt ?? "", views_30d: p.views30d,
                likes: p.likes, comments: p.comments,
              })))}
              className="h-9 px-3 rounded-md border border-black/10 text-[13px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              onClick={() => setShowCatModal(true)}
              className="h-9 px-3 rounded-md border border-black/10 text-[13px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5"
            >
              <FolderPlus className="h-3.5 w-3.5" /> New category
            </button>
            <button
              onClick={async () => { const id = await create(); setSelectedId(id); }}
              className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-semibold hover:opacity-90 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> New post
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Posts" value={posts.length.toString()} />
        <Kpi label="Published" value={counts.published.toString()} tone="green" />
        <Kpi label="Featured" value={featured.toString()} tone="gold" />
        <Kpi label="Views · 30d" value={totalViews.toLocaleString()} />
      </div>

      {/* Filters */}
      <Toolbar>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, excerpt or tag…"
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
              {s}
              <span className="opacity-60 ml-1">{counts[s as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
          className="h-9 px-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={authorId} onChange={(e) => setAuthorId(e.target.value)}
          className="h-9 px-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink">
          <option value="all">All authors</option>
          {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-0.5 bg-white border border-black/10 rounded-md p-0.5">
          <button onClick={() => setView("grid")} title="Grid"
            className={`h-7 w-7 grid place-items-center rounded ${view === "grid" ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView("list")} title="List"
            className={`h-7 w-7 grid place-items-center rounded ${view === "list" ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"}`}>
            <Rows3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </Toolbar>

      {filtered.length === 0 ? (
        <Card><Empty title="No posts match" sub="Adjust filters or write a new post." /></Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} onOpen={() => setSelectedId(p.id)} />
          ))}
        </div>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-black/[0.05]">
            {filtered.map((p) => (
              <PostRow key={p.id} post={p} onOpen={() => setSelectedId(p.id)} />
            ))}
          </ul>
        </Card>
      )}

      {selected && <PostDrawer post={selected} onClose={() => setSelectedId(null)} />}
      {showCatModal && (
        <NewCategoryModal onClose={() => setShowCatModal(false)} onCreate={(name) => { useBlog.getState().addCategory(name); setShowCatModal(false); }} />
      )}
    </div>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "green" | "gold" }) {
  const tones = { neutral: "text-ink", green: "text-ink", gold: "text-gold-deep" } as const;
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={`font-display text-[26px] leading-none mt-1.5 ${tones[tone]}`}>{value}</div>
    </Card>
  );
}

function PostCard({ post, onOpen }: { post: BlogPost; onOpen: () => void }) {
  const { categories, authors, toggleFeatured, setStatus, duplicate, remove } = useBlog();
  const cat = categories.find((c) => c.id === post.categoryId);
  const author = authors.find((a) => a.id === post.authorId);
  return (
    <Card className="!p-0 overflow-hidden flex flex-col">
      <button onClick={onOpen}
        className="aspect-[16/9] bg-gradient-to-br from-[#f7f2e6] to-[#e8ded0] relative grid place-items-center">
        {post.coverUrl ? (
          <img src={post.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-8 w-8 text-black/20" />
        )}
        {post.featured && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-gold text-black text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
            <Star className="h-2.5 w-2.5 fill-current" /> Featured
          </span>
        )}
        <span className="absolute top-2 right-2"><StatusPill status={post.status} /></span>
      </button>
      <div className="p-4 flex-1 flex flex-col">
        {cat && (
          <span className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: cat.colour }}>
            {cat.name}
          </span>
        )}
        <button onClick={onOpen} className="text-left">
          <div className="font-display text-[16px] font-bold text-ink leading-snug line-clamp-2">{post.title}</div>
        </button>
        <div className="text-[12.5px] text-muted-foreground mt-1.5 line-clamp-2 flex-1">{post.excerpt || "No excerpt yet."}</div>
        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground mt-3">
          <UserIcon className="h-3 w-3" /><span>{author?.name}</span>
          <span>·</span>
          <Clock className="h-3 w-3" /><span>{post.readingMinutes} min</span>
          {post.publishedAt && (<><span>·</span><span>{new Date(post.publishedAt).toLocaleDateString()}</span></>)}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.05]">
          <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.views30d.toLocaleString()}</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {post.likes}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {post.comments}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => toggleFeatured(post.id)} title="Feature"
              className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]">
              <Star className={`h-3.5 w-3.5 ${post.featured ? "text-gold fill-gold" : "text-muted-foreground"}`} />
            </button>
            {post.status === "published" ? (
              <button onClick={() => setStatus(post.id, "draft")} title="Unpublish"
                className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]"><EyeOff className="h-3.5 w-3.5" /></button>
            ) : (
              <button onClick={() => setStatus(post.id, "published")} title="Publish"
                className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]"><Send className="h-3.5 w-3.5" /></button>
            )}
            <button onClick={() => duplicate(post.id)} title="Duplicate"
              className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]"><Copy className="h-3.5 w-3.5" /></button>
            <button onClick={() => { if (confirm("Delete this post?")) remove(post.id); }} title="Delete"
              className="h-7 w-7 grid place-items-center rounded hover:bg-rose-50 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PostRow({ post, onOpen }: { post: BlogPost; onOpen: () => void }) {
  const { categories, authors } = useBlog();
  const cat = categories.find((c) => c.id === post.categoryId);
  const author = authors.find((a) => a.id === post.authorId);
  return (
    <li className="px-4 py-3 flex items-center gap-3 hover:bg-black/[0.02]">
      <div className="h-12 w-16 rounded-md bg-gradient-to-br from-[#f7f2e6] to-[#e8ded0] shrink-0 overflow-hidden grid place-items-center">
        {post.coverUrl ? <img src={post.coverUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-black/20" />}
      </div>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 mb-1">
          <div className="font-semibold text-ink text-[13.5px] truncate">{post.title}</div>
          {post.featured && <Star className="h-3 w-3 text-gold fill-gold" />}
          <StatusPill status={post.status} />
        </div>
        <div className="text-[11.5px] text-muted-foreground flex items-center gap-2">
          {cat && <span style={{ color: cat.colour }} className="font-semibold">{cat.name}</span>}
          <span>·</span>
          <span>{author?.name}</span>
          <span>·</span>
          <span>{post.views30d.toLocaleString()} views</span>
        </div>
      </button>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </li>
  );
}

/* ==================== DRAWER ==================== */

function PostDrawer({ post, onClose }: { post: BlogPost; onClose: () => void }) {
  const { categories, authors, update, setStatus, toggleFeatured, remove } = useBlog();
  const [tab, setTab] = useState<"content" | "seo" | "settings">("content");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/40" aria-label="Close" />
      <div className="relative w-full max-w-[920px] bg-[#f7f5ef] h-full overflow-y-auto border-l border-black/10">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-5 py-3 border-b border-black/[0.08] flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-muted-foreground" />
              <input
                value={post.title}
                onChange={(e) => update(post.id, { title: e.target.value })}
                className="font-display text-[18px] font-bold bg-transparent outline-none border-b border-transparent focus:border-ink/30 min-w-0 flex-1"
              />
              <StatusPill status={post.status} />
              {post.featured && <Chip tone="gold"><Star className="h-2.5 w-2.5 fill-current" /> Featured</Chip>}
            </div>
            <div className="text-[11.5px] text-muted-foreground font-sans mt-0.5 flex items-center gap-1">
              <Globe className="h-3 w-3" /> asloriginals.online/journal/<span className="text-ink">{post.slug}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => toggleFeatured(post.id)}
              className="h-8 px-3 rounded-md border border-black/10 text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
              <Star className={`h-3.5 w-3.5 ${post.featured ? "text-gold fill-gold" : ""}`} />
              {post.featured ? "Featured" : "Feature"}
            </button>
            {post.status === "published" ? (
              <button onClick={() => setStatus(post.id, "draft")}
                className="h-8 px-3 rounded-md border border-black/10 text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
                <EyeOff className="h-3.5 w-3.5" /> Unpublish
              </button>
            ) : (
              <button onClick={() => setStatus(post.id, "published")}
                className="h-8 px-3 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:opacity-90 flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" /> Publish
              </button>
            )}
            <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-black/[0.06]"><X className="h-4 w-4" /></button>
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
          <div className="p-5 grid grid-cols-[1fr_280px] gap-4">
            <div className="space-y-3">
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Cover image URL</div>
                <input
                  value={post.coverUrl ?? ""} onChange={(e) => update(post.id, { coverUrl: e.target.value })}
                  placeholder="https://…/cover.jpg"
                  className="w-full h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] font-sans outline-none focus:border-ink"
                />
                <div className="mt-3 aspect-[16/9] rounded-md bg-gradient-to-br from-[#f7f2e6] to-[#e8ded0] overflow-hidden grid place-items-center">
                  {post.coverUrl ? <img src={post.coverUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-black/20" />}
                </div>
              </Card>
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Excerpt</div>
                <textarea
                  rows={3} value={post.excerpt} onChange={(e) => update(post.id, { excerpt: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
                />
              </Card>
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Body · markdown</div>
                <textarea
                  rows={16} value={post.content} onChange={(e) => update(post.id, { content: e.target.value })}
                  placeholder="Write the article. Markdown supported."
                  className="w-full px-3 py-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink leading-relaxed font-sans"
                />
                <div className="text-[11px] text-muted-foreground mt-1">
                  {post.content.length.toLocaleString()} characters · ~{Math.max(1, Math.round(post.content.split(/\s+/).length / 220))} min read
                </div>
              </Card>
            </div>
            <div className="space-y-3">
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Author</div>
                <select
                  value={post.authorId} onChange={(e) => update(post.id, { authorId: e.target.value })}
                  className="w-full h-9 px-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
                >
                  {authors.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.role}</option>)}
                </select>
              </Card>
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Category</div>
                <select
                  value={post.categoryId} onChange={(e) => update(post.id, { categoryId: e.target.value })}
                  className="w-full h-9 px-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
                >
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Card>
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Tags</div>
                <input
                  value={post.tags.join(", ")}
                  onChange={(e) => update(post.id, { tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="loro piana, wardrobe"
                  className="w-full h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
                />
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {post.tags.map((t) => <Chip key={t}><TagIcon className="h-2.5 w-2.5" /> {t}</Chip>)}
                  </div>
                )}
              </Card>
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Performance · 30d</div>
                <div className="space-y-1.5 text-[12.5px]">
                  <Row label="Views" value={post.views30d.toLocaleString()} icon={<Eye className="h-3.5 w-3.5" />} />
                  <Row label="Likes" value={post.likes.toLocaleString()} icon={<Heart className="h-3.5 w-3.5" />} />
                  <Row label="Comments" value={post.comments.toLocaleString()} icon={<MessageCircle className="h-3.5 w-3.5" />} />
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === "seo" && (
          <div className="p-5 grid grid-cols-[1fr_320px] gap-4">
            <div className="space-y-3">
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">SEO title</div>
                <input
                  value={post.seoTitle} onChange={(e) => update(post.id, { seoTitle: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
                />
                <div className={`text-[11px] mt-1 ${post.seoTitle.length > 60 ? "text-rose-600" : "text-muted-foreground"}`}>{post.seoTitle.length} / 60</div>
              </Card>
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Meta description</div>
                <textarea
                  rows={3} value={post.seoDescription} onChange={(e) => update(post.id, { seoDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
                />
                <div className={`text-[11px] mt-1 ${post.seoDescription.length > 160 ? "text-rose-600" : "text-muted-foreground"}`}>{post.seoDescription.length} / 160</div>
              </Card>
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">OG image URL</div>
                <input
                  value={post.ogImage ?? ""} onChange={(e) => update(post.id, { ogImage: e.target.value })}
                  placeholder="Uses cover image if empty"
                  className="w-full h-10 px-3 rounded-md bg-white border border-black/10 text-[13px] font-sans outline-none focus:border-ink"
                />
              </Card>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Google preview</div>
              <div className="bg-white border border-black/[0.08] rounded-md p-3">
                <div className="text-[12px] text-[#202124]">asloriginals.online<span className="text-muted-foreground">/journal/{post.slug}</span></div>
                <div className="text-[16px] leading-snug text-[#1a0dab] mt-0.5 truncate">{post.seoTitle || post.title}</div>
                <div className="text-[12.5px] text-[#4d5156] mt-0.5 line-clamp-2">{post.seoDescription || post.excerpt || "No description set."}</div>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="p-5 grid grid-cols-2 gap-4">
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">URL slug</div>
              <div className="flex items-center gap-1">
                <span className="text-[13px] text-muted-foreground font-sans">/journal/</span>
                <input
                  value={post.slug}
                  onChange={(e) => update(post.id, { slug: e.target.value })}
                  className="flex-1 h-10 px-3 rounded-md bg-white border border-black/10 text-[13px] font-sans outline-none focus:border-ink"
                />
              </div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Reading time · minutes</div>
              <input
                type="number" min={1} max={60}
                value={post.readingMinutes}
                onChange={(e) => update(post.id, { readingMinutes: Number(e.target.value) || 1 })}
                className="w-full h-10 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
              />
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Publish date</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <input type="datetime-local"
                  value={post.publishedAt ? post.publishedAt.slice(0, 16) : ""}
                  onChange={(e) => update(post.id, { publishedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  className="flex-1 h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink" />
              </div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Scheduled for</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <input type="datetime-local"
                  value={post.scheduledFor ? post.scheduledFor.slice(0, 16) : ""}
                  onChange={(e) => update(post.id, { scheduledFor: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  className="flex-1 h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink" />
              </div>
            </Card>
            <Card className="border-rose-200 bg-rose-50/40 col-span-2">
              <div className="text-[11px] uppercase tracking-wider text-rose-700 font-semibold mb-2">Danger zone</div>
              <div className="flex items-center gap-2">
                {post.status !== "archived" && (
                  <button onClick={() => setStatus(post.id, "archived")}
                    className="h-9 px-3 rounded-md bg-white border border-black/10 text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
                    <EyeOff className="h-3.5 w-3.5" /> Archive
                  </button>
                )}
                <button onClick={() => { if (confirm("Delete this post permanently?")) { remove(post.id); onClose(); } }}
                  className="h-9 px-3 rounded-md bg-white border border-rose-200 text-rose-700 text-[12.5px] font-semibold hover:bg-rose-100 flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Delete post
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      <span className="font-semibold text-ink tabular-nums">{value}</span>
    </div>
  );
}

function NewCategoryModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-black/40" aria-label="Close" />
      <div className="relative w-full max-w-[440px] bg-white rounded-xl border border-black/10 shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-black/[0.08] flex items-center justify-between">
          <div className="font-display text-[16px] font-bold">New blog category</div>
          <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Name</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Travel Notes"
            className="mt-1 w-full h-10 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink" />
        </div>
        <div className="px-5 py-3 border-t border-black/[0.08] flex items-center justify-end gap-2 bg-black/[0.02]">
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-black/10 text-[13px] font-semibold hover:bg-black/[0.04]">Cancel</button>
          <button disabled={!name.trim()} onClick={() => onCreate(name.trim())}
            className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Create
          </button>
        </div>
      </div>
    </div>
  );
}
