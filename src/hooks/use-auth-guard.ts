import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";

/**
 * Client-side fake auth gate. Opens the login modal when the user is not
 * logged in, keeping them on the current page. Prototype-only - no server
 * enforcement.
 */
export function useAuthGuard() {
  const isLoggedIn = useAuth((s) => s.isLoggedIn);
  const openLogin = useAuth((s) => s.openLogin);

  useEffect(() => {
    if (!isLoggedIn) {
      openLogin("signin");
    }
  }, [isLoggedIn, openLogin]);

  return isLoggedIn;
}
