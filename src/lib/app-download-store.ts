import { create } from "zustand";
import {
  appConfigAdminApi,
  appConfigStoreApi,
  type DownloadOfferConfig,
} from "@/lib/api/platform";

export type AppDownloadOffer = DownloadOfferConfig;

type ClaimResult = {
  code: string;
  label: string;
  pct: number;
  alreadyClaimed: boolean;
  expiresAt?: string | null;
};

type AppDownloadState = {
  offer: AppDownloadOffer | null;
  claimResult: ClaimResult | null;
  dismissedAt: number | null;
  claimedAt: number | null;
  installedAt: number | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  updateOffer: (patch: Partial<AppDownloadOffer>) => Promise<void>;
  dismiss: () => void;
  claim: () => Promise<ClaimResult | null>;
  markInstalled: () => void;
  reset: () => void;
};

const DEFAULT_OFFER: AppDownloadOffer = {
  enabled: true,
  percent: 10,
  label: "App Download Reward",
  validDays: 30,
};

function mapOffer(raw: unknown): AppDownloadOffer {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    enabled: o.enabled !== false,
    percent: Number(o.percent ?? DEFAULT_OFFER.percent),
    label: String(o.label ?? DEFAULT_OFFER.label),
    validDays: Number(o.validDays ?? DEFAULT_OFFER.validDays),
  };
}

export const useAppDownload = create<AppDownloadState>()((set, get) => ({
  offer: null,
  claimResult: null,
  dismissedAt: null,
  claimedAt: null,
  installedAt: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const cfg = (await appConfigAdminApi.get()) as Record<string, unknown>;
      set({
        offer: mapOffer(cfg.downloadOffer),
        hydrated: true,
      });
    } catch {
      // Admin config may be unavailable on storefront surfaces — fall back to public config
      try {
        const pub = (await appConfigStoreApi.get()) as Record<string, unknown>;
        set({
          offer: mapOffer(pub.downloadOffer),
          hydrated: true,
        });
      } catch (err) {
        console.warn("[app-download] hydrate failed", err);
        set({ offer: DEFAULT_OFFER, hydrated: true });
      }
    }
  },
  updateOffer: async (patch) => {
    const cur = get().offer ?? DEFAULT_OFFER;
    const next = { ...cur, ...patch };
    set({ offer: next });
    try {
      const cfg = (await appConfigAdminApi.update({ downloadOffer: patch })) as Record<string, unknown>;
      set({ offer: mapOffer(cfg.downloadOffer ?? next) });
    } catch (err) {
      console.warn("[app-download] updateOffer", err);
      await get().hydrate();
    }
  },
  dismiss: () => set({ dismissedAt: Date.now() }),
  claim: async () => {
    try {
      const result = await appConfigStoreApi.claimDownloadOffer();
      set({
        claimedAt: Date.now(),
        claimResult: result,
      });
      return result;
    } catch (err) {
      console.warn("[app-download] claim", err);
      // Keep local claim marker for UX cooldown even if API fails (e.g. guest)
      set({ claimedAt: Date.now() });
      return null;
    }
  },
  markInstalled: () => set({ installedAt: Date.now() }),
  reset: () =>
    set({
      dismissedAt: null,
      claimedAt: null,
      installedAt: null,
      claimResult: null,
    }),
}));
