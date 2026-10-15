import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Activity, ShoppingBag, FileText, ShoppingCart, Undo2, Receipt,
  Sparkles, Kanban, MessageSquare, Truck, Package, FolderTree, Tag, Boxes, Image as ImageIcon,
  Star, Users, Users2, Crown, Wallet, MapPin, Megaphone, Ticket, Palette, Flag, Bell,
  Share2, Search, Newspaper, HelpCircle, PenSquare, Route as RouteIcon, PackageCheck,
  Landmark, Percent, BarChart3, LineChart, PieChart, GitBranch, Layers, LifeBuoy,
  MessagesSquare, ThumbsUp, ShieldCheck, ScrollText, PlugZap, Settings, BellRing, Code2,
  CalendarClock,
} from "lucide-react";
import type { AdminRole } from "@/lib/admin-role-store";

export type NavItem = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: number | string;
  roles?: AdminRole[]; // if omitted, visible to all
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", to: "/", icon: LayoutDashboard },
      { id: "activity", label: "Live Activity", to: "/activity", icon: Activity },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { id: "orders", label: "Orders", to: "/orders", icon: ShoppingBag,
        roles: ["super_admin", "ops_manager", "support", "finance"] },
      { id: "drafts", label: "Draft Orders", to: "/drafts", icon: FileText,
        roles: ["super_admin", "ops_manager", "support"] },
      { id: "carts", label: "Abandoned Carts", to: "/carts", icon: ShoppingCart,
        roles: ["super_admin", "ops_manager", "marketing"] },
      { id: "returns", label: "Returns & Refunds", to: "/returns", icon: Undo2,
        roles: ["super_admin", "ops_manager", "support", "finance"] },
      { id: "transactions", label: "Transactions", to: "/transactions", icon: Receipt,
        roles: ["super_admin", "finance"] },
    ],
  },
  {
    id: "concierge",
    label: "Concierge",
    items: [
      { id: "inbox", label: "Requests Inbox", to: "/concierge/inbox", icon: Sparkles,
        roles: ["super_admin", "concierge_agent", "ops_manager"] },
      { id: "board", label: "Sourcing Board", to: "/concierge/board", icon: Kanban,
        roles: ["super_admin", "concierge_agent"] },
      { id: "quotes", label: "Quotes", to: "/concierge/quotes", icon: FileText,
        roles: ["super_admin", "concierge_agent", "finance"] },
      { id: "suppliers", label: "Suppliers", to: "/concierge/suppliers", icon: Truck,
        roles: ["super_admin", "concierge_agent"] },
      { id: "chat", label: "Concierge Chat", to: "/concierge/chat", icon: MessageSquare,
        roles: ["super_admin", "concierge_agent"] },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { id: "products", label: "Products", to: "/products", icon: Package,
        roles: ["super_admin", "catalog_manager"] },
      { id: "collections", label: "Collections", to: "/collections", icon: Layers,
        roles: ["super_admin", "catalog_manager"] },
      { id: "categories", label: "Categories", to: "/categories", icon: FolderTree,
        roles: ["super_admin", "catalog_manager"] },
      { id: "brands", label: "Brands", to: "/brands", icon: Tag,
        roles: ["super_admin", "catalog_manager"] },
      { id: "size-guides", label: "Size Guides", to: "/size-guides", icon: ScrollText,
        roles: ["super_admin", "catalog_manager"] },
      { id: "coming-soon", label: "Drops & Reservations", to: "/coming-soon", icon: CalendarClock,
        roles: ["super_admin", "catalog_manager", "ops_manager"] },
      { id: "inventory", label: "Inventory", to: "/inventory", icon: Boxes,
        roles: ["super_admin", "catalog_manager", "ops_manager"] },
      { id: "media", label: "Media Library", to: "/media", icon: ImageIcon,
        roles: ["super_admin", "catalog_manager", "content_editor"] },
      { id: "reviews", label: "Reviews", to: "/reviews", icon: Star,
        roles: ["super_admin", "catalog_manager", "support"] },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    items: [
      { id: "customers", label: "All Customers", to: "/customers", icon: Users,
        roles: ["super_admin", "ops_manager", "support", "marketing"] },
      { id: "segments", label: "Segments", to: "/segments", icon: Users2,
        roles: ["super_admin", "marketing"] },
      { id: "club", label: "ASL Club", to: "/club", icon: Crown,
        roles: ["super_admin", "marketing"] },
      { id: "wallets", label: "Wallets & Credits", to: "/wallets", icon: Wallet,
        roles: ["super_admin", "finance"] },
      { id: "addresses", label: "Addresses", to: "/addresses", icon: MapPin,
        roles: ["super_admin", "support"] },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { id: "campaigns", label: "Campaigns", to: "/campaigns", icon: Megaphone,
        roles: ["super_admin", "marketing"] },
      { id: "coupons", label: "Coupons", to: "/coupons", icon: Ticket,
        roles: ["super_admin", "marketing"] },
      { id: "slots", label: "Homepage Slots", to: "/slots", icon: Palette,
        roles: ["super_admin", "marketing", "content_editor"] },
      { id: "banners", label: "Banners", to: "/banners", icon: Flag,
        roles: ["super_admin", "marketing", "content_editor"] },
      { id: "messaging", label: "Push & Email", to: "/messaging", icon: Bell,
        roles: ["super_admin", "marketing"] },
      { id: "referrals", label: "Referrals", to: "/referrals", icon: Share2,
        roles: ["super_admin", "marketing"] },
      { id: "seo", label: "SEO", to: "/seo", icon: Search,
        roles: ["super_admin", "marketing", "content_editor"] },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { id: "pages", label: "Pages", to: "/pages", icon: Newspaper,
        roles: ["super_admin", "content_editor"] },
      { id: "faqs", label: "FAQs", to: "/faqs", icon: HelpCircle,
        roles: ["super_admin", "content_editor"] },
      { id: "announcement", label: "Announcement Bar", to: "/announcement", icon: Megaphone,
        roles: ["super_admin", "content_editor", "marketing"] },
      { id: "blog", label: "Blog", to: "/blog", icon: PenSquare,
        roles: ["super_admin", "content_editor"] },

    ],
  },
  {
    id: "fulfilment",
    label: "Fulfilment",
    items: [
      { id: "shipments", label: "Shipments", to: "/shipments", icon: Truck,
        roles: ["super_admin", "ops_manager"] },
      { id: "shipping-zones", label: "Shipping Zones", to: "/shipping-zones", icon: RouteIcon,
        roles: ["super_admin", "ops_manager"] },
      { id: "pickups", label: "Pickups", to: "/pickups", icon: PackageCheck,
        roles: ["super_admin", "ops_manager"] },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { id: "payouts", label: "Payouts", to: "/payouts", icon: Landmark,
        roles: ["super_admin", "finance"] },
      { id: "tax", label: "Tax", to: "/tax", icon: Percent,
        roles: ["super_admin", "finance"] },
      { id: "reports", label: "Reports", to: "/reports", icon: BarChart3,
        roles: ["super_admin", "finance", "analyst"] },
      { id: "ledger", label: "Ledger", to: "/ledger", icon: ScrollText,
        roles: ["super_admin", "finance"] },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      { id: "sales-a", label: "Sales", to: "/analytics/sales", icon: LineChart,
        roles: ["super_admin", "analyst", "finance", "marketing"] },
      { id: "traffic-a", label: "Traffic", to: "/analytics/traffic", icon: BarChart3,
        roles: ["super_admin", "analyst", "marketing"] },
      { id: "products-a", label: "Products", to: "/analytics/products", icon: PieChart,
        roles: ["super_admin", "analyst", "catalog_manager"] },
      { id: "concierge-a", label: "Concierge", to: "/analytics/concierge", icon: LineChart,
        roles: ["super_admin", "analyst", "concierge_agent"] },
      { id: "cohorts", label: "Cohorts", to: "/analytics/cohorts", icon: GitBranch,
        roles: ["super_admin", "analyst"] },
    ],
  },
  {
    id: "support",
    label: "Support",
    items: [
      { id: "tickets", label: "Tickets", to: "/tickets", icon: LifeBuoy,
        roles: ["super_admin", "support"] },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id: "team", label: "Team & Roles", to: "/team", icon: ShieldCheck, roles: ["super_admin"] },
      { id: "audit", label: "Audit Log", to: "/audit", icon: ScrollText, roles: ["super_admin"] },
      
      { id: "settings", label: "Store Settings", to: "/settings", icon: Settings, roles: ["super_admin"] },
      { id: "notifications", label: "Notifications", to: "/notification-settings", icon: BellRing, roles: ["super_admin"] },
    ],
  },
];

export function filterNavForRole(role: AdminRole): NavGroup[] {
  return NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);
}
