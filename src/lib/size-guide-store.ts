import { create } from "zustand";
import { sizeGuidesAdminApi } from "@/lib/api/catalog-admin";

export type SizeGuideScope = "brand" | "category";

export type SizeGuideEntry = {
  id: string;
  scope: SizeGuideScope;
  target: string; // brand name or category key (lowercase compare)
  note: string; // e.g. "Model is 6ft 3" tall and wearing size 48."
  chartUrl?: string;
};

function mapGuide(g: Record<string, unknown>): SizeGuideEntry {
  return {
    id: String(g.id),
    scope: (g.scope as SizeGuideScope) || "category",
    target: String(g.target ?? ""),
    note: String(g.note ?? ""),
    chartUrl: g.chartUrl ? String(g.chartUrl) : undefined,
  };
}

type State = {
  guides: SizeGuideEntry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  upsert: (g: SizeGuideEntry) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useSizeGuides = create<State>()((set, get) => ({
  guides: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const rows = await sizeGuidesAdminApi.list();
      set({ guides: (rows as Record<string, unknown>[]).map(mapGuide), hydrated: true });
    } catch (err) {
      console.warn("[size-guides] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  upsert: async (g) => {
    // Optimistic local upsert
    set((s) => ({
      guides: s.guides.some((x) => x.id === g.id)
        ? s.guides.map((x) => (x.id === g.id ? g : x))
        : [g, ...s.guides],
    }));
    try {
      const saved = mapGuide(
        (await sizeGuidesAdminApi.save({
          scope: g.scope,
          target: g.target,
          note: g.note,
          chartUrl: g.chartUrl ?? null,
        })) as Record<string, unknown>,
      );
      set((s) => {
        const without = s.guides.filter(
          (x) =>
            x.id !== g.id &&
            !(x.scope === saved.scope && x.target.toLowerCase() === saved.target.toLowerCase()),
        );
        return { guides: [saved, ...without] };
      });
    } catch (err) {
      console.warn("[size-guides] upsert sync", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    await sizeGuidesAdminApi.remove(id);
    set((s) => ({ guides: s.guides.filter((x) => x.id !== id) }));
  },
}));

/** Brand-specific guide wins over category guide. */
export function useSizeGuideFor(brand: string, category: string) {
  return useSizeGuides((s) => {
    const b = brand.toLowerCase();
    const c = category.toLowerCase();
    return (
      s.guides.find((g) => g.scope === "brand" && g.target.toLowerCase() === b) ??
      s.guides.find((g) => g.scope === "category" && g.target.toLowerCase() === c)
    );
  });
}
