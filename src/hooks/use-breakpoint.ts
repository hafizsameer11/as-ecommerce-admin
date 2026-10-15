import { useSyncExternalStore } from "react";

export function useIsDesktop(breakpoint = 768) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(`(min-width: ${breakpoint}px)`).matches,
    () => true, // SSR fallback: assume desktop to avoid mobile-stretched flash on desktop
  );
}
