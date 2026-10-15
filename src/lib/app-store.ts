import { toast } from "sonner";

/** Public app store listings. Leave empty until the apps are published. */
export const APP_STORE_URL = "";
export const PLAY_STORE_URL = "";

export function openAppStore() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod|Macintosh/.test(ua);
  const url = isIOS ? APP_STORE_URL || PLAY_STORE_URL : PLAY_STORE_URL || APP_STORE_URL;
  if (!url) {
    toast("App store listing coming soon");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
