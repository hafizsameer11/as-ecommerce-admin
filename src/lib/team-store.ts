import { create } from "zustand";
import { ADMIN_ROLES, type AdminRole } from "./admin-role-store";
import { teamAdminApi } from "@/lib/api/platform";

export type MemberStatus = "active" | "invited" | "suspended";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: MemberStatus;
  twoFactor: boolean;
  lastActiveAt: string; // ISO
  createdAt: string;
  avatarColor: string;
};

export type PermissionKey =
  | "orders.view" | "orders.edit" | "orders.refund"
  | "concierge.view" | "concierge.assign" | "concierge.quote"
  | "catalog.view" | "catalog.edit" | "catalog.publish"
  | "inventory.adjust"
  | "customers.view" | "customers.edit" | "customers.wallet"
  | "marketing.manage" | "content.publish"
  | "finance.view" | "finance.payouts" | "finance.ledger"
  | "analytics.view"
  | "support.tickets" | "support.reply"
  | "team.manage" | "settings.manage" | "integrations.manage" | "audit.view";

export const PERMISSION_GROUPS: { id: string; label: string; items: { key: PermissionKey; label: string }[] }[] = [
  { id: "sales", label: "Sales & Orders", items: [
    { key: "orders.view", label: "View orders" },
    { key: "orders.edit", label: "Edit orders & fulfilment" },
    { key: "orders.refund", label: "Issue refunds" },
  ]},
  { id: "concierge", label: "Concierge", items: [
    { key: "concierge.view", label: "View requests" },
    { key: "concierge.assign", label: "Assign & progress requests" },
    { key: "concierge.quote", label: "Send quotes" },
  ]},
  { id: "catalog", label: "Catalog", items: [
    { key: "catalog.view", label: "View catalog" },
    { key: "catalog.edit", label: "Edit products & collections" },
    { key: "catalog.publish", label: "Publish / unpublish" },
    { key: "inventory.adjust", label: "Adjust inventory" },
  ]},
  { id: "customers", label: "Customers", items: [
    { key: "customers.view", label: "View customers" },
    { key: "customers.edit", label: "Edit customer profiles" },
    { key: "customers.wallet", label: "Adjust wallets & credits" },
  ]},
  { id: "growth", label: "Marketing & Content", items: [
    { key: "marketing.manage", label: "Manage campaigns, coupons, banners" },
    { key: "content.publish", label: "Publish pages, blog, FAQs" },
  ]},
  { id: "finance", label: "Finance", items: [
    { key: "finance.view", label: "View finance" },
    { key: "finance.payouts", label: "Approve payouts" },
    { key: "finance.ledger", label: "Post ledger entries" },
  ]},
  { id: "insights", label: "Analytics", items: [
    { key: "analytics.view", label: "View analytics & reports" },
  ]},
  { id: "support", label: "Support", items: [
    { key: "support.tickets", label: "View tickets" },
    { key: "support.reply", label: "Reply & resolve" },
  ]},
  { id: "system", label: "System", items: [
    { key: "team.manage", label: "Manage team & roles" },
    { key: "settings.manage", label: "Store settings" },
    { key: "integrations.manage", label: "Integrations & webhooks" },
    { key: "audit.view", label: "Audit log" },
  ]},
];

export const ROLE_PERMISSIONS: Record<AdminRole, PermissionKey[]> = {
  super_admin: PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key)),
  ops_manager: [
    "orders.view","orders.edit","orders.refund",
    "concierge.view","concierge.assign","concierge.quote",
    "catalog.view","inventory.adjust",
    "customers.view","customers.edit",
    "analytics.view","support.tickets","support.reply",
  ],
  catalog_manager: [
    "catalog.view","catalog.edit","catalog.publish","inventory.adjust",
    "analytics.view",
  ],
  concierge_agent: [
    "concierge.view","concierge.assign","concierge.quote",
    "customers.view","orders.view","support.tickets","support.reply",
  ],
  support: [
    "orders.view","customers.view","support.tickets","support.reply",
    "concierge.view",
  ],
  marketing: [
    "marketing.manage","content.publish","customers.view","analytics.view",
  ],
  finance: [
    "orders.view","finance.view","finance.payouts","finance.ledger","analytics.view",
  ],
  content_editor: [
    "content.publish","catalog.view",
  ],
  analyst: [
    "analytics.view","orders.view","customers.view","catalog.view","finance.view",
  ],
};

function iso(v: unknown, fallback = new Date().toISOString()): string {
  if (!v) return fallback;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
}

function mapMember(m: Record<string, unknown>): TeamMember {
  const role = (ADMIN_ROLES.some((r) => r.id === m.role) ? m.role : "support") as AdminRole;
  const status = (["active", "invited", "suspended"].includes(m.status as string)
    ? m.status
    : "active") as MemberStatus;
  return {
    id: String(m.id),
    name: String(m.name ?? ""),
    email: String(m.email ?? ""),
    role,
    status,
    twoFactor: !!(m.twoFactor ?? m.twoFactorEnabled),
    lastActiveAt: iso(m.lastActiveAt),
    createdAt: iso(m.createdAt),
    avatarColor: String(m.avatarColor ?? "#111827"),
  };
}

type State = {
  members: TeamMember[];
  overrides: Partial<Record<AdminRole, PermissionKey[]>>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  invite: (m: { name: string; email: string; role: AdminRole }) => Promise<void>;
  updateMember: (id: string, patch: Partial<TeamMember>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  resendInvite: (id: string) => Promise<void>;
  setRolePermissions: (role: AdminRole, perms: PermissionKey[]) => Promise<void>;
  resetRolePermissions: (role: AdminRole) => Promise<void>;
};

export const useTeam = create<State>()((set, get) => ({
  members: [],
  overrides: {},
  hydrated: false,

  hydrate: async () => {
    try {
      const [membersRaw, rolesRaw] = await Promise.all([
        teamAdminApi.members(),
        teamAdminApi.roles(),
      ]);
      const members = (Array.isArray(membersRaw) ? membersRaw : []).map((m) =>
        mapMember(m as Record<string, unknown>),
      );
      const overrides: State["overrides"] = {};
      for (const row of Array.isArray(rolesRaw) ? rolesRaw : []) {
        const r = row as Record<string, unknown>;
        if (r.customized && typeof r.role === "string" && Array.isArray(r.permissions)) {
          overrides[r.role as AdminRole] = r.permissions as PermissionKey[];
        }
      }
      set({ members, overrides, hydrated: true });
    } catch (err) {
      console.warn("[team] hydrate failed", err);
      set({ hydrated: true });
    }
  },

  invite: async ({ name, email, role }) => {
    try {
      const res = (await teamAdminApi.invite({ name, email, role })) as Record<string, unknown>;
      const raw = (res.member ?? res) as Record<string, unknown>;
      const m = mapMember(raw);
      set({ members: [m, ...get().members] });
    } catch (err) {
      console.warn("[team] invite failed", err);
      throw err;
    }
  },

  updateMember: async (id, patch) => {
    const body: Record<string, unknown> = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.role !== undefined) body.role = patch.role;
    if (patch.status === "active" || patch.status === "suspended") body.status = patch.status;
    try {
      if (Object.keys(body).length) {
        const updated = mapMember((await teamAdminApi.update(id, body)) as Record<string, unknown>);
        set({ members: get().members.map((m) => (m.id === id ? { ...m, ...updated } : m)) });
      } else {
        set({ members: get().members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
      }
    } catch (err) {
      console.warn("[team] updateMember failed", err);
      throw err;
    }
  },

  removeMember: async (id) => {
    try {
      await teamAdminApi.remove(id);
      set({ members: get().members.filter((m) => m.id !== id) });
    } catch (err) {
      console.warn("[team] removeMember failed", err);
      throw err;
    }
  },

  resendInvite: async (id) => {
    try {
      await teamAdminApi.resendInvite(id);
      set({
        members: get().members.map((m) =>
          m.id === id ? { ...m, createdAt: new Date().toISOString() } : m,
        ),
      });
    } catch (err) {
      console.warn("[team] resendInvite failed", err);
      throw err;
    }
  },

  setRolePermissions: async (role, perms) => {
    try {
      await teamAdminApi.setRolePermissions(role, perms);
      set({ overrides: { ...get().overrides, [role]: perms } });
    } catch (err) {
      console.warn("[team] setRolePermissions failed", err);
      throw err;
    }
  },

  resetRolePermissions: async (role) => {
    try {
      await teamAdminApi.resetRolePermissions(role);
      const o = { ...get().overrides };
      delete o[role];
      set({ overrides: o });
    } catch (err) {
      console.warn("[team] resetRolePermissions failed", err);
      throw err;
    }
  },
}));

export const getRolePermissions = (role: AdminRole, overrides: State["overrides"]): PermissionKey[] =>
  overrides[role] ?? ROLE_PERMISSIONS[role];

export const ROLE_LABEL: Record<AdminRole, string> = Object.fromEntries(
  ADMIN_ROLES.map(r => [r.id, r.label]),
) as Record<AdminRole, string>;
