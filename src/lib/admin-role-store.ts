import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ApiError } from "@/lib/api/client";
import { adminAuthApi, type AdminProfile } from "@/lib/api/auth";

export type AdminRole =
  | "super_admin"
  | "ops_manager"
  | "catalog_manager"
  | "concierge_agent"
  | "support"
  | "marketing"
  | "finance"
  | "content_editor"
  | "analyst";

export const ADMIN_ROLES: { id: AdminRole; label: string; short: string }[] = [
  { id: "super_admin", label: "Super Admin", short: "SA" },
  { id: "ops_manager", label: "Operations Manager", short: "OM" },
  { id: "catalog_manager", label: "Catalog Manager", short: "CM" },
  { id: "concierge_agent", label: "Concierge Agent", short: "CA" },
  { id: "support", label: "Customer Support", short: "CS" },
  { id: "marketing", label: "Marketing", short: "MK" },
  { id: "finance", label: "Finance", short: "FN" },
  { id: "content_editor", label: "Content Editor", short: "CE" },
  { id: "analyst", label: "Analyst", short: "AN" },
];

export type Density = "comfortable" | "cozy" | "compact";

type State = {
  isSignedIn: boolean;
  email: string | null;
  name: string;
  role: AdminRole;
  density: Density;
  sidebarCollapsed: boolean;
  permissions: string[];
  signIn: (email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setRole: (r: AdminRole) => void;
  setDensity: (d: Density) => void;
  toggleSidebar: () => void;
  bootstrap: () => Promise<void>;
  applyProfile: (p: AdminProfile) => void;
};

export const useAdmin = create<State>()(
  persist(
    (set, get) => ({
      isSignedIn: false,
      email: null,
      name: "Admin",
      role: "super_admin",
      density: "cozy",
      sidebarCollapsed: false,
      permissions: [],
      applyProfile: (p) =>
        set({
          isSignedIn: true,
          email: p.email,
          name: p.name,
          role: p.role,
          density: p.density ?? get().density,
          sidebarCollapsed: p.sidebarCollapsed ?? get().sidebarCollapsed,
          permissions: p.permissions ?? [],
        }),
      signIn: async (email, password) => {
        if (!password) throw new ApiError(400, null, "Password is required");
        const res = await adminAuthApi.login(email, password);
        if (res.twoFactorRequired) {
          throw new ApiError(401, null, "Two-factor authentication is required");
        }
        get().applyProfile(res.admin);
      },
      signOut: async () => {
        try {
          await adminAuthApi.logout();
        } catch {
          /* clear local anyway */
        }
        set({ isSignedIn: false, email: null, permissions: [] });
      },
      setRole: (role) => set({ role }),
      setDensity: (density) => set({ density }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      bootstrap: async () => {
        try {
          const me = await adminAuthApi.me();
          get().applyProfile(me);
        } catch {
          set({ isSignedIn: false, email: null, permissions: [] });
        }
      },
    }),
    {
      name: "asl-admin",
      partialize: (s) => ({
        isSignedIn: s.isSignedIn,
        email: s.email,
        name: s.name,
        role: s.role,
        density: s.density,
        sidebarCollapsed: s.sidebarCollapsed,
        permissions: s.permissions,
      }),
    }
  )
);
