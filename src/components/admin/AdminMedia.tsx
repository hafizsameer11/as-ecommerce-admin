import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Upload, Grid3x3, List, Star, Trash2, Download, X, Copy, Image as ImageIcon,
  FileText, Film, Folder, MoveRight, Edit3, ExternalLink,
} from "lucide-react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, IconButton, Toolbar, Empty } from "./ui";
import {
  useMedia, FOLDERS, type MediaAsset, type MediaFolder, type MediaType,
  humanSize, relTime,
} from "@/lib/media-store";
import { downloadCSV } from "@/lib/admin-export";
import { toast } from "sonner";

const TYPES: { id: "all" | MediaType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Video" },
  { id: "document", label: "Documents" },
];

function TypeIcon({ t, className = "" }: { t: MediaType; className?: string }) {
  if (t === "image") return <ImageIcon className={className} />;
  if (t === "video") return <Film className={className} />;
  return <FileText className={className} />;
}

export default function AdminMedia() {
  const {
    assets, hydrate, upload, removeAsset, removeMany, updateAsset, toggleStar, moveMany,
  } = useMedia();

  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<"all" | MediaFolder>("all");
  const [type, setType] = useState<"all" | MediaType>("all");
  const [starredOnly, setStarredOnly] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => {
    return assets
      .filter((a) => (folder === "all" ? true : a.folder === folder))
      .filter((a) => (type === "all" ? true : a.type === type))
      .filter((a) => (starredOnly ? a.starred : true))
      .filter((a) => {
        if (!q) return true;
        const s = q.toLowerCase();
        return (
          a.name.toLowerCase().includes(s) ||
          a.altText.toLowerCase().includes(s) ||
          a.tags.some((t) => t.toLowerCase().includes(s))
        );
      })
      .sort((a, b) => b.uploadedAt - a.uploadedAt);
  }, [assets, folder, type, starredOnly, q]);

  const kpis = useMemo(() => {
    const total = assets.length;
    const totalKB = assets.reduce((s, a) => s + a.sizeKB, 0);
    const images = assets.filter((a) => a.type === "image").length;
    const videos = assets.filter((a) => a.type === "video").length;
    const orphans = assets.filter((a) => a.usedIn.length === 0).length;
    return { total, totalKB, images, videos, orphans };
  }, [assets]);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const openAsset = openId ? assets.find((a) => a.id === openId) ?? null : null;

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }
  function clearSelection() { setSelected({}); }

  function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const list = Array.from(files);
    const targetFolder = folder === "all" ? "uncategorized" : folder;
    void upload(list, { folder: targetFolder })
      .then((added) => {
        toast.success(`${added.length} file${added.length === 1 ? "" : "s"} uploaded`);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      })
      .finally(() => {
        if (fileRef.current) fileRef.current.value = "";
      });
  }

  function copyUrl(a: MediaAsset) {
    navigator.clipboard.writeText(a.url || a.name).then(
      () => toast.success("URL copied"),
      () => toast.error("Copy failed"),
    );
  }

  function bulkDelete() {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} asset(s)? This cannot be undone.`)) return;
    removeMany(selectedIds);
    toast.success("Assets deleted");
    clearSelection();
  }

  function bulkMove(f: MediaFolder) {
    moveMany(selectedIds, f);
    toast.success(`Moved to ${FOLDERS.find((x) => x.id === f)?.label}`);
    setMoveOpen(false);
    clearSelection();
  }

  function exportCsv() {
    const rows = (selectedIds.length ? filtered.filter((a) => selected[a.id]) : filtered).map((a) => ({
      id: a.id, name: a.name, type: a.type, folder: a.folder,
      sizeKB: a.sizeKB, altText: a.altText, tags: a.tags.join("|"),
      usedIn: a.usedIn.join("|"), uploadedBy: a.uploadedBy,
      uploadedAt: new Date(a.uploadedAt).toISOString(),
    }));
    downloadCSV(`asl-media-${Date.now()}.csv`, rows);
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Media Library"
        subtitle="Central store for product photography, campaign assets, brand marks and documents."
        actions={
          <>
            <button
              onClick={exportCsv}
              className="h-9 px-3 text-[13px] font-medium rounded-md border border-black/10 bg-white hover:bg-black/[0.04] inline-flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="h-9 px-3 text-[13px] font-medium rounded-md bg-ink text-white hover:bg-ink/90 inline-flex items-center gap-1.5"
            >
              <Upload className="h-4 w-4" /> Upload
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Kpi label="Assets" value={kpis.total.toLocaleString()} />
        <Kpi label="Storage" value={humanSize(kpis.totalKB)} />
        <Kpi label="Images" value={kpis.images.toLocaleString()} />
        <Kpi label="Videos" value={kpis.videos.toLocaleString()} />
        <Kpi label="Unused" value={kpis.orphans.toLocaleString()} tone={kpis.orphans ? "amber" : "neutral"} />
      </div>

      <div className="flex gap-6">
        {/* Folder sidebar */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <Card padded={false} className="p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 mb-2">Folders</div>
            <FolderRow active={folder === "all"} onClick={() => setFolder("all")} label="All media" count={assets.length} />
            {FOLDERS.map((f) => {
              const c = assets.filter((a) => a.folder === f.id).length;
              return (
                <FolderRow
                  key={f.id}
                  active={folder === f.id}
                  onClick={() => setFolder(f.id)}
                  label={f.label}
                  count={c}
                />
              );
            })}
            <div className="h-px bg-black/[0.06] my-2" />
            <button
              onClick={() => setStarredOnly((v) => !v)}
              className={`w-full flex items-center justify-between text-[13px] px-2 py-1.5 rounded-md ${starredOnly ? "bg-gold/15 text-gold-deep" : "hover:bg-black/[0.04]"}`}
            >
              <span className="inline-flex items-center gap-2"><Star className={`h-3.5 w-3.5 ${starredOnly ? "fill-current" : ""}`} /> Starred</span>
              <span className="text-[11px] text-muted-foreground">{assets.filter((a) => a.starred).length}</span>
            </button>
          </Card>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <Toolbar>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, alt text, tag…"
                  className="w-full h-9 pl-8 pr-3 text-[13px] rounded-md border border-black/10 bg-white outline-none focus:border-ink/30"
                />
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white border border-black/10 rounded-md p-0.5">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`h-7 px-2.5 text-[12px] font-medium rounded ${type === t.id ? "bg-ink text-white" : "text-ink hover:bg-black/[0.04]"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <IconButton title="Grid" active={view === "grid"} onClick={() => setView("grid")}>
                <Grid3x3 className="h-4 w-4" />
              </IconButton>
              <IconButton title="List" active={view === "list"} onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </IconButton>
            </div>
          </Toolbar>

          {/* Bulk bar */}
          {selectedIds.length > 0 && (
            <div className="sticky top-2 z-10 mb-3 flex items-center gap-2 rounded-lg border border-ink/20 bg-ink text-white px-3 py-2 shadow">
              <span className="text-[13px] font-medium">{selectedIds.length} selected</span>
              <div className="flex-1" />
              <button
                onClick={() => setMoveOpen(true)}
                className="h-8 px-2.5 text-[12px] rounded-md bg-white/10 hover:bg-white/20 inline-flex items-center gap-1.5"
              >
                <MoveRight className="h-3.5 w-3.5" /> Move
              </button>
              <button
                onClick={exportCsv}
                className="h-8 px-2.5 text-[12px] rounded-md bg-white/10 hover:bg-white/20 inline-flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button
                onClick={bulkDelete}
                className="h-8 px-2.5 text-[12px] rounded-md bg-rose-500/90 hover:bg-rose-500 inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button onClick={clearSelection} className="h-8 w-8 grid place-items-center rounded-md hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            <Empty title="No assets" sub="Try clearing filters or upload a new file." />
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((a) => {
                const isSel = !!selected[a.id];
                return (
                  <div
                    key={a.id}
                    className={`group relative bg-white border rounded-xl overflow-hidden transition ${isSel ? "border-ink ring-2 ring-ink/20" : "border-black/[0.06] hover:border-black/20"}`}
                  >
                    <button
                      onClick={() => setOpenId(a.id)}
                      className="block aspect-square w-full bg-[#f2f2f2] relative"
                    >
                      {a.type === "image" && a.url ? (
                        <img src={a.url} alt={a.altText} className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-ink/50">
                          <TypeIcon t={a.type} className="h-10 w-10" />
                        </div>
                      )}
                    </button>
                    <label className="absolute top-2 left-2 h-5 w-5 grid place-items-center bg-white/95 border border-black/10 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggle(a.id)}
                        className="accent-ink"
                      />
                    </label>
                    <button
                      onClick={() => toggleStar(a.id)}
                      className={`absolute top-2 right-2 h-6 w-6 grid place-items-center rounded-full bg-white/95 border border-black/10 ${a.starred ? "text-gold" : "text-ink/40 opacity-0 group-hover:opacity-100"}`}
                      title={a.starred ? "Unstar" : "Star"}
                    >
                      <Star className={`h-3.5 w-3.5 ${a.starred ? "fill-current" : ""}`} />
                    </button>
                    <div className="p-2.5">
                      <div className="text-[12px] font-medium truncate">{a.name}</div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{humanSize(a.sizeKB)}</span>
                        {a.usedIn.length === 0 ? (
                          <Chip tone="amber">Unused</Chip>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Used ×{a.usedIn.length}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card padded={false}>
              <table className="w-full text-[13px]">
                <thead className="bg-black/[0.02] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={filtered.every((a) => selected[a.id]) && filtered.length > 0}
                        onChange={(e) => {
                          const on = e.target.checked;
                          const next: Record<string, boolean> = { ...selected };
                          filtered.forEach((a) => { next[a.id] = on; });
                          setSelected(next);
                        }}
                        className="accent-ink"
                      />
                    </th>
                    <th className="p-3">Asset</th>
                    <th className="p-3">Folder</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Used in</th>
                    <th className="p-3">Uploaded</th>
                    <th className="p-3 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-t border-black/[0.06] hover:bg-black/[0.02]">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={!!selected[a.id]}
                          onChange={() => toggle(a.id)}
                          className="accent-ink"
                        />
                      </td>
                      <td className="p-3">
                        <button onClick={() => setOpenId(a.id)} className="flex items-center gap-3 text-left">
                          <div className="h-10 w-10 bg-[#f2f2f2] rounded overflow-hidden grid place-items-center shrink-0">
                            {a.type === "image" && a.url ? (
                              <img src={a.url} alt={a.altText} className="h-full w-full object-contain" />
                            ) : (
                              <TypeIcon t={a.type} className="h-4 w-4 text-ink/50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{a.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{a.altText}</div>
                          </div>
                        </button>
                      </td>
                      <td className="p-3 capitalize">{FOLDERS.find((f) => f.id === a.folder)?.label ?? a.folder}</td>
                      <td className="p-3 capitalize">{a.type}</td>
                      <td className="p-3">{humanSize(a.sizeKB)}</td>
                      <td className="p-3">{a.usedIn.length ? `×${a.usedIn.length}` : <Chip tone="amber">Unused</Chip>}</td>
                      <td className="p-3 text-muted-foreground">{relTime(a.uploadedAt)}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <IconButton title="Copy URL" onClick={() => copyUrl(a)}><Copy className="h-3.5 w-3.5" /></IconButton>
                          <IconButton title="Star" active={a.starred} onClick={() => toggleStar(a.id)}>
                            <Star className={`h-3.5 w-3.5 ${a.starred ? "fill-current" : ""}`} />
                          </IconButton>
                          <IconButton
                            title="Delete"
                            onClick={() => {
                              if (confirm(`Delete "${a.name}"?`)) {
                                removeAsset(a.id);
                                toast.success("Deleted");
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>

      {/* Move sheet */}
      {moveOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={() => setMoveOpen(false)}>
          <div className="bg-white rounded-xl w-[380px] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-lg">Move {selectedIds.length} to…</div>
              <button onClick={() => setMoveOpen(false)} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1">
              {FOLDERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => bulkMove(f.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-black/10 hover:bg-black/[0.03] text-[13px]"
                >
                  <span className="inline-flex items-center gap-2"><Folder className="h-4 w-4 text-ink/60" />{f.label}</span>
                  <MoveRight className="h-3.5 w-3.5 text-ink/50" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {openAsset && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={() => setOpenId(null)}>
          <div className="w-full max-w-[560px] h-full bg-white overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-black/[0.06] flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-display text-lg truncate">{openAsset.name}</div>
                <div className="text-[12px] text-muted-foreground">
                  {relTime(openAsset.uploadedAt)} • {openAsset.uploadedBy}
                </div>
              </div>
              <button onClick={() => setOpenId(null)} className="h-8 w-8 grid place-items-center rounded hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-5">
              <div className="aspect-[4/3] bg-[#f2f2f2] rounded-lg grid place-items-center overflow-hidden mb-4">
                {openAsset.type === "image" && openAsset.url ? (
                  <img src={openAsset.url} alt={openAsset.altText} className="h-full w-full object-contain" />
                ) : (
                  <TypeIcon t={openAsset.type} className="h-14 w-14 text-ink/40" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-[13px] mb-4">
                <Field label="Type" value={openAsset.type} />
                <Field label="Folder" value={FOLDERS.find((f) => f.id === openAsset.folder)?.label ?? openAsset.folder} />
                <Field label="Size" value={humanSize(openAsset.sizeKB)} />
                <Field label="Dimensions" value={openAsset.width ? `${openAsset.width}×${openAsset.height}` : " - "} />
              </div>

              <label className="block mb-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Alt text</div>
                <input
                  value={openAsset.altText}
                  onChange={(e) => updateAsset(openAsset.id, { altText: e.target.value })}
                  className="w-full h-9 px-3 text-[13px] rounded-md border border-black/10 outline-none focus:border-ink/30"
                />
              </label>

              <label className="block mb-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Tags (comma separated)</div>
                <input
                  value={openAsset.tags.join(", ")}
                  onChange={(e) => updateAsset(openAsset.id, { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                  className="w-full h-9 px-3 text-[13px] rounded-md border border-black/10 outline-none focus:border-ink/30"
                />
              </label>

              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Folder</div>
                <select
                  value={openAsset.folder}
                  onChange={(e) => updateAsset(openAsset.id, { folder: e.target.value as MediaFolder })}
                  className="w-full h-9 px-3 text-[13px] rounded-md border border-black/10 bg-white outline-none focus:border-ink/30"
                >
                  {FOLDERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>

              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Used in</div>
                {openAsset.usedIn.length === 0 ? (
                  <Chip tone="amber">Not referenced anywhere</Chip>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {openAsset.usedIn.map((u) => (
                      <Chip key={u} tone="neutral">{u}</Chip>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-black/[0.06]">
                <button
                  onClick={() => copyUrl(openAsset)}
                  className="h-9 px-3 text-[13px] rounded-md border border-black/10 hover:bg-black/[0.04] inline-flex items-center gap-1.5"
                >
                  <Copy className="h-4 w-4" /> Copy URL
                </button>
                {openAsset.url && (
                  <a
                    href={openAsset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-3 text-[13px] rounded-md border border-black/10 hover:bg-black/[0.04] inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-4 w-4" /> Open
                  </a>
                )}
                <button
                  onClick={() => toggleStar(openAsset.id)}
                  className="h-9 px-3 text-[13px] rounded-md border border-black/10 hover:bg-black/[0.04] inline-flex items-center gap-1.5"
                >
                  <Star className={`h-4 w-4 ${openAsset.starred ? "fill-current text-gold" : ""}`} />
                  {openAsset.starred ? "Starred" : "Star"}
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => {
                    if (confirm(`Delete "${openAsset.name}"?`)) {
                      removeAsset(openAsset.id);
                      setOpenId(null);
                      toast.success("Deleted");
                    }
                  }}
                  className="h-9 px-3 text-[13px] rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "amber" }) {
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-display font-semibold mt-1 ${tone === "amber" ? "text-amber-700" : ""}`}>{value}</div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium capitalize">{value}</div>
    </div>
  );
}

function FolderRow({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between text-[13px] px-2 py-1.5 rounded-md ${active ? "bg-ink text-white" : "hover:bg-black/[0.04]"}`}
    >
      <span className="inline-flex items-center gap-2">
        <Folder className={`h-3.5 w-3.5 ${active ? "text-white" : "text-ink/60"}`} />
        {label}
      </span>
      <span className={`text-[11px] ${active ? "text-white/70" : "text-muted-foreground"}`}>{count}</span>
    </button>
  );
}
