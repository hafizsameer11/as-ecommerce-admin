import { apiRequest, saveTokens } from "./client";
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

function persistSessionTokens(res: AdminAuthResponse) {
  if (res.accessToken && res.refreshToken) {
    saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
  }
}

export const adminAuthApi = {
  login: async (email: string, password: string) => {
    const res = await apiRequest<AdminAuthResponse>("/admin/auth/login", {
      method: "POST",
      body: { email, password },
      skipAuth: true,
    });
    if (!res.twoFactorRequired) persistSessionTokens(res);
    return res;
  },

  login2fa: async (challenge: string, code: string) => {
    const res = await apiRequest<AdminAuthResponse>("/admin/auth/login/2fa", {
      method: "POST",
      body: { challenge, code },
      skipAuth: true,
    });
    persistSessionTokens(res);
    return res;
  },

  logout: async () => {
    try {
      return await apiRequest<{ signedOut: boolean }>("/admin/auth/logout", { method: "POST" });
    } finally {
      saveTokens(null);
    }
  },

  refresh: async () => {
    const res = await apiRequest<{ accessToken: string; refreshToken: string }>("/admin/auth/refresh", {
      method: "POST",
      body: {},
      skipAuth: true,
    });
    if (res.accessToken && res.refreshToken) {
      saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    }
    return res;
  },

  me: () => apiRequest<AdminProfile>("/admin/me"),
};
