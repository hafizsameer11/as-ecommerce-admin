import { useEffect, useState, useCallback, useRef } from "react";
import { useAppDownload } from "@/lib/app-download-store";
import { getCookieConsent } from "@/lib/cookie-consent";

/** Re-show the offer on later visits if the customer only dismissed it. */
const DISMISS_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export function useAppDownloadOffer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const store = useAppDownload();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void store.hydrate();
  }, [store.hydrate]);

  useEffect(() => {
    if (!mounted) return;
    const onOpen = () => {
      window.dispatchEvent(new CustomEvent("asl:app-offer-opened"));
      setOpen(true);
    };
    window.addEventListener("asl:open-app-offer", onOpen);
    return () => window.removeEventListener("asl:open-app-offer", onOpen);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (store.offer && !store.offer.enabled) return;
    if (store.claimedAt) return;
    if (store.dismissedAt && Date.now() - store.dismissedAt < DISMISS_COOLDOWN_MS) return;
    const schedule = () => {
      if (!getCookieConsent() || timerRef.current) return;
      timerRef.current = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("asl:app-offer-opened"));
        setOpen(true);
      }, 6000);
    };
    schedule();
    window.addEventListener("asl:cookie-consent-updated", schedule);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.removeEventListener("asl:cookie-consent-updated", schedule);
    };
  }, [mounted, store.dismissedAt, store.claimedAt, store.offer]);

  const close = useCallback(() => {
    setOpen(false);
    store.dismiss();
  }, [store]);

  const claim = useCallback(() => {
    setOpen(false);
    void store.claim();
  }, [store]);

  return {
    mounted,
    open,
    close,
    claim,
    markInstalled: store.markInstalled,
    offer: store.offer,
    claimResult: store.claimResult,
  };
}
