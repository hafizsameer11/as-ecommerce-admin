import { apiRequest } from "./client";
import type { AdminRole } from "@/lib/admin-role-store";

export type AdminProfile = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  roleLabel: string;
  status: string;
  density?: "comfortable" | "cozy" | "compact";
  sidebarCollapsed?: boolean;
  permissions: string[];
};

export type AdminAuthResponse = {
  accessToken: string;
  refreshToken: string;
  admin: AdminProfile;
  twoFactorRequired?: boolean;
  challenge?: string;
};

export const adminAuthApi = {
  login: (email: string, password: string) =>
    apiRequest<AdminAuthResponse>("/admin/auth/login", { method: "POST", body: { email, password } }),

  login2fa: (challenge: string, code: string) =>
    apiRequest<AdminAuthResponse>("/admin/auth/login/2fa", {
      method: "POST",
      body: { challenge, code },
    }),

  logout: () => apiRequest<{ signedOut: boolean }>("/admin/auth/logout", { method: "POST" }),

  refresh: () => apiRequest<{ accessToken: string; refreshToken: string }>("/admin/auth/refresh", { method: "POST", body: {} }),

  me: () => apiRequest<AdminProfile>("/admin/me"),
};
