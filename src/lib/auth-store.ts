import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthMode = "signin" | "signup" | "forgot" | "otp";

export type AuthUser = {
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
};

type AuthState = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  hasOnboarded: boolean;
  isLoginOpen: boolean;
  loginMode: AuthMode;
  loginNext?: string;
  signIn: (email: string, password?: string) => AuthUser;
  register: (data: { name: string; email: string; phone?: string; password?: string }) => AuthUser;
  signOut: () => void;
  completeOnboarding: () => void;
  openLogin: (mode?: AuthMode, next?: string) => void;
  closeLogin: () => void;
  setLoginMode: (mode: AuthMode) => void;
};

const nameFromEmail = (email: string) => {
  const base = email.split("@")[0] ?? "Member";
  return base
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ") || "Member";
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      hasOnboarded: false,
      isLoginOpen: false,
      loginMode: "signin",
      loginNext: undefined,
      signIn: (email) => {
        const user: AuthUser = { name: nameFromEmail(email), email };
        set({ user, isLoggedIn: true });
        return user;
      },
      register: ({ name, email, phone }) => {
        const user: AuthUser = { name: name || nameFromEmail(email), email, phone };
        set({ user, isLoggedIn: true });
        return user;
      },
      signOut: () => set({ user: null, isLoggedIn: false }),
      completeOnboarding: () => set({ hasOnboarded: true }),
      openLogin: (mode = "signin", next) =>
        set({ isLoginOpen: true, loginMode: mode, loginNext: next }),
      closeLogin: () => set({ isLoginOpen: false }),
      setLoginMode: (mode) => set({ loginMode: mode }),
    }),
    { name: "asl-auth" }
  )
);

export const useIsLoggedIn = () => useAuth((s) => s.isLoggedIn);
export const useCurrentUser = () => useAuth((s) => s.user);
export const useLoginModal = () =>
  useAuth((s) => ({
    isOpen: s.isLoginOpen,
    mode: s.loginMode,
    next: s.loginNext,
    open: s.openLogin,
    close: s.closeLogin,
    setMode: s.setLoginMode,
  }));
