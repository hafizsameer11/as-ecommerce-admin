import { koboToNaira } from "@/lib/api/client";

export type AnalyticsKpi = {
  value: number;
  previous?: number;
  delta?: number;
  trendPct?: number;
};

export function mapAnalyticsKpi(raw: unknown): AnalyticsKpi | null {
  if (raw == null || typeof raw !== "object") return null;
  const k = raw as Record<string, unknown>;
  const value = Number(k.value ?? 0);
  const previous = k.previous != null ? Number(k.previous) : undefined;
  const delta = k.delta != null && Number.isFinite(Number(k.delta)) ? Number(k.delta) : undefined;
  const trendPct =
    k.trendPct != null && Number.isFinite(Number(k.trendPct)) ? Number(k.trendPct) : undefined;
  if (!Number.isFinite(value) && delta === undefined && trendPct === undefined) return null;
  return {
    value: Number.isFinite(value) ? value : 0,
    previous: previous != null && Number.isFinite(previous) ? previous : undefined,
    delta,
    trendPct,
  };
}

/** Prefer fractional delta; fall back to trendPct (often already fractional). */
export function kpiDeltaFraction(k: AnalyticsKpi | null | undefined): number | null {
  if (!k) return null;
  if (k.delta != null && Number.isFinite(k.delta)) return k.delta;
  if (k.trendPct != null && Number.isFinite(k.trendPct)) return k.trendPct;
  return null;
}

export function formatKpiDelta(delta: number | null, opts?: { asPp?: boolean }): string {
  if (delta == null || !Number.isFinite(delta)) return "—";
  const sign = delta > 0 ? "+" : "";
  if (opts?.asPp) return `${sign}${(delta * 100).toFixed(1)}pp`;
  return `${sign}${(delta * 100).toFixed(1)}%`;
}

export function mapAnalyticsKpis(
  raw: unknown,
  moneyKeys: string[] = [],
): Record<string, AnalyticsKpi> {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out: Record<string, AnalyticsKpi> = {};
  for (const [key, val] of Object.entries(src)) {
    const mapped = mapAnalyticsKpi(val);
    if (!mapped) continue;
    if (moneyKeys.includes(key)) {
      out[key] = {
        ...mapped,
        value: koboToNaira(mapped.value),
        previous: mapped.previous != null ? koboToNaira(mapped.previous) : undefined,
      };
    } else {
      out[key] = mapped;
    }
  }
  return out;
}
