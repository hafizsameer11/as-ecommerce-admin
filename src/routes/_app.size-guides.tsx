import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useSizeGuides, type SizeGuideScope } from "@/lib/size-guide-store";
import { useBrands } from "@/lib/brands-store";
import { useCategories } from "@/lib/categories-store";

export const Route = createFileRoute("/_app/size-guides")({
  head: () => ({
    meta: [
      { title: "Size Guides · ASL Admin" },
      { name: "description", content: "Upload size guides and fit notes for brands and categories." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminSizeGuides,
});

function AdminSizeGuides() {
  const { guides, hydrate, upsert, remove } = useSizeGuides();
  const brands = useBrands((s) => s.brands);
  const hydrateBrands = useBrands((s) => s.hydrate);
  const categories = useCategories((s) => s.categories);
  const hydrateCategories = useCategories((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    void hydrateBrands();
    void hydrateCategories();
  }, [hydrate, hydrateBrands, hydrateCategories]);

  /** Backend size guides key off brand/category handles. */
  const brandOptions = useMemo(
    () =>
      [...brands]
        .filter((b) => b.status !== "archived")
        .map((b) => ({ value: b.handle, label: b.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [brands],
  );
  const categoryOptions = useMemo(
    () =>
      [...categories]
        .map((c) => ({ value: c.handle, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [categories],
  );

  const [scope, setScope] = useState<SizeGuideScope>("brand");
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [chartUrl, setChartUrl] = useState<string>();
  const [editId, setEditId] = useState<string>();
  const [saving, setSaving] = useState(false);

  const options = scope === "brand" ? brandOptions : categoryOptions;

  const save = async () => {
    if (!target || !note.trim()) return toast.error("Choose a target and enter the size guide text");
    setSaving(true);
    try {
      await upsert({
        id: editId ?? `sg-${Date.now()}`,
        scope,
        target,
        note: note.trim(),
        chartUrl,
      });
      toast.success("Size guide saved");
      setTarget("");
      setNote("");
      setChartUrl(undefined);
      setEditId(undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save size guide");
    } finally {
      setSaving(false);
    }
  };

  const labelFor = (scope: SizeGuideScope, handle: string) => {
    const list = scope === "brand" ? brandOptions : categoryOptions;
    return list.find((o) => o.value === handle)?.label ?? handle;
  };

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Size Guides</h1>
        <p className="text-sm text-muted-foreground">
          Upload a size chart and the fit text shown under &quot;Size Guide&quot; on product pages. Brand guides override
          category guides.
        </p>
      </div>

      <div className="border border-border rounded-md p-4 space-y-3 bg-background">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-medium space-y-1">
            <span>Apply to</span>
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as SizeGuideScope);
                setTarget("");
              }}
              className="w-full h-10 border border-border rounded px-2 bg-background text-sm"
            >
              <option value="brand">Brand</option>
              <option value="category">Category</option>
            </select>
          </label>
          <label className="text-xs font-medium space-y-1">
            <span>{scope === "brand" ? "Brand" : "Category"}</span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full h-10 border border-border rounded px-2 bg-background text-sm"
            >
              <option value="">Select…</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="text-xs font-medium space-y-1 block">
          <span>Size guide text</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={'Model is 6ft 3" tall and wearing size 48.'}
            className="w-full border border-border rounded p-2 bg-background text-sm"
          />
        </label>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 h-9 px-3 border border-border rounded text-xs cursor-pointer">
            <Upload className="h-3.5 w-3.5" /> {chartUrl ? "Replace chart" : "Upload size chart"}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = () => setChartUrl(String(r.result));
                r.readAsDataURL(f);
              }}
            />
          </label>
          {chartUrl && <span className="text-xs text-muted-foreground">Chart attached</span>}
          <button
            onClick={() => void save()}
            disabled={saving}
            className="ml-auto h-9 px-4 rounded bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60"
          >
            {saving ? "Saving…" : editId ? "Update" : "Save"} guide
          </button>
        </div>
        {note && (
          <div className="border-t border-border pt-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Preview</div>
            <div className="text-[11px] uppercase underline">Size Guide</div>
            <p className="text-[12px]">{note}</p>
          </div>
        )}
      </div>

      <table className="w-full text-sm border border-border">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Scope</th>
            <th className="p-2">Target</th>
            <th className="p-2">Text</th>
            <th className="p-2">Chart</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {guides.map((g) => (
            <tr key={g.id} className="border-t border-border">
              <td className="p-2 capitalize">{g.scope}</td>
              <td className="p-2">{labelFor(g.scope, g.target)}</td>
              <td className="p-2">{g.note}</td>
              <td className="p-2 text-xs">{g.chartUrl ? "Yes" : "-"}</td>
              <td className="p-2 text-right whitespace-nowrap">
                <button
                  className="text-xs underline mr-3"
                  onClick={() => {
                    setEditId(g.id);
                    setScope(g.scope);
                    setTarget(g.target);
                    setNote(g.note);
                    setChartUrl(g.chartUrl);
                  }}
                >
                  Edit
                </button>
                <button aria-label="Delete" onClick={() => void remove(g.id)}>
                  <Trash2 className="h-4 w-4 inline" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
