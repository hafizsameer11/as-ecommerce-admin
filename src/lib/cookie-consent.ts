export const COOKIE_CONSENT_KEY = "asl-cookie-consent";

export type CookieConsent = {
  essential: true;
  performance: boolean;
  functional: boolean;
  advertising: boolean;
  savedAt: string;
};

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<CookieConsent>;
    if (parsed.essential !== true || typeof parsed.savedAt !== "string") return null;
    return {
      essential: true,
      performance: parsed.performance === true,
      functional: parsed.functional === true,
      advertising: parsed.advertising === true,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveCookieConsent(preferences: Omit<CookieConsent, "essential" | "savedAt">) {
  if (typeof window === "undefined") return;
  const consent: CookieConsent = {
    essential: true,
    ...preferences,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent("asl:cookie-consent-updated", { detail: consent }));
}