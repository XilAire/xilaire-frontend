import type { ElementType } from "react";
import { LifeBuoy, Monitor, Activity, Cpu, Settings, Shield, AlertTriangle, Bell, LayoutDashboard, Bot, FileBarChart, CreditCard, Users, UserPlus, Briefcase, FolderKanban, MapPinned, ClipboardList, Receipt, FileText, Building2 } from "lucide-react";
import type { SidebarNavItem } from "@/components/layout/buildPortalNav";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
export type HelpdeskCounts = {
  tickets: number;
  incidents: number;
  serviceRequests: number;
  changeRequests: number;
  approvals: number;
};

export type MonitoringCounts = {
  endpoints: number;
  telemetryStale: number;
};

export type NavBadges = {
  alerts: number;
  notificationsFailed: number;
};

export type NavItem = {
  href: string;
  label: string;
  icon?: ElementType;
  key?: keyof HelpdeskCounts;
  badge?: keyof NavBadges;
  countKey?: keyof MonitoringCounts;
};

export type NavGroup = {
  label: string;
  icon: ElementType;
  items: NavItem[];
};

export type SidebarProfile = {
  full_name: string | null;
  email: string;
  role: string | null;
  account_type?: string | null;
  status?: string | null;
  org_id?: string | null;
} | null;

export type ResolvedProfile = {
  full_name: string | null;
  email: string;
  role: string | null;
  account_type: string | null;
  status: string | null;
  org_id: string | null;
};

export type VendorAccessState = {
  vendorRecordExists: boolean;
  vendorIsActive: boolean;
  vendorLegacyActive: boolean;
  vendorOnboardingStatus: string | null;
  vendorOnboardingCompletedAt: string | null;
};

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
export function itemIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function getGroupIcon(label: string): ElementType {
  switch (label) {
    case "Platform":
      return LayoutDashboard;
    case "Help Desk":
      return LifeBuoy;
    case "Monitoring":
      return Monitor;
    case "Infrastructure":
      return Cpu;
    case "Vendor Portal":
      return Briefcase;
    case "Client Portal":
      return Building2;
    case "Operations":
      return ClipboardList;
    case "Finance":
      return CreditCard;
    case "Administration":
      return Shield;
    case "System":
      return Settings;
    case "Vault":
      return FileText;
    default:
      return LayoutDashboard;
  }
}

function getItemIcon(href: string): ElementType | undefined {
  switch (href) {
    case "/dashboard":
    case "/helpdesk":
    case "/infrastructure":
    case "/vendor":
    case "/client":
    case "/operations":
    case "/finance":
    case "/admin":
    case "/system":
    case "/vault":
      return LayoutDashboard;

    case "/automations":
      return Cpu;
    case "/bots":
      return Bot;
    case "/reports":
    case "/finance/overages":
    case "/vault/search":
    case "/vault/audit":
      return FileBarChart;
    case "/billing":
    case "/admin/finance":
      return CreditCard;
    case "/settings":
    case "/system/settings":
    case "/admin/settings":
      return Settings;

    case "/helpdesk/tickets":
      return LifeBuoy;
    case "/helpdesk/incidents":
      return AlertTriangle;
    case "/helpdesk/service-requests":
      return Cpu;
    case "/helpdesk/change-requests":
      return Settings;
    case "/helpdesk/approvals":
      return Shield;

    case "/endpoints":
      return Monitor;
    case "/telemetry":
      return Activity;
    case "/alerts":
      return AlertTriangle;
    case "/alerts/notifications":
      return Bell;
    case "/endpoints/onboarding":
      return UserPlus;

    case "/client/requests":
      return ClipboardList;

    case "/infrastructure/projects":
    case "/vendor/projects":
    case "/client/projects":
      return FolderKanban;
    case "/infrastructure/scheduling":
    case "/infrastructure/site-visits":
    case "/vendor/site-visits":
      return MapPinned;
    case "/infrastructure/estimates":
    case "/vendor/estimates":
    case "/client/estimates":
      return ClipboardList;
    case "/infrastructure/invoices":
    case "/vendor/invoices":
    case "/client/invoices":
    case "/finance/invoices":
    case "/admin/finance/invoices":
    case "/vault/exports":
      return Receipt;
    case "/infrastructure/documents":
    case "/vendor/documents":
    case "/client/documents":
    case "/vault/messages":
      return FileText;
    case "/vendor/profile":
      return Building2;

    case "/operations/intake":
    case "/operations/assignments":
    case "/operations/approvals":
    case "/operations/delivery":
      return ClipboardList;

    case "/vault/cases":
      return FolderKanban;
    case "/vault/holds":
      return Shield;
    case "/vault/ingest":
      return Cpu;
    case "/vault/sources":
      return Building2;
    case "/vault/custodians":
      return Users;
    case "/vault/retention":
      return ClipboardList;

    case "/finance/vendor-bills":
    case "/finance/recurring":
    case "/finance/profitability":
      return CreditCard;

    case "/admin/users":
      return Users;
    case "/admin/organizations":
    case "/admin/vendors":
      return Building2;
    case "/admin/compliance":
    case "/system/entitlements":
      return Shield;
    case "/admin/audit":
    case "/system/logs":
      return FileBarChart;

    default:
      return undefined;
  }
}

function getGroupLabelForTopLevel(href: string): string {
  if (href === "/dashboard") return "Platform";
  if (href === "/client") return "Client Portal";
  if (href === "/vendor") return "Vendor Portal";
  if (href === "/infrastructure") return "Infrastructure";
  if (href === "/operations") return "Operations";
  if (href === "/finance") return "Finance";
  if (href === "/admin") return "Administration";
  if (href === "/system") return "System";
  return "Platform";
}

export function convertPortalNavToGroups(items: SidebarNavItem[]): NavGroup[] {
  return items.map((item) => {
    const groupLabel = getGroupLabelForTopLevel(item.href);

    const groupItems: NavItem[] = [
      {
        href: item.href,
        label: item.title === "Dashboard" ? "Dashboard" : "Overview",
        icon: getItemIcon(item.href),
      },
      ...(item.children ?? []).map((child) => ({
        href: child.href,
        label: child.title,
        icon: getItemIcon(child.href),
      })),
    ];

    const dedupedItems = groupItems.filter(
      (entry, index, arr) =>
        arr.findIndex((x) => x.href === entry.href) === index,
    );

    return {
      label: groupLabel,
      icon: getGroupIcon(groupLabel),
      items: dedupedItems,
    };
  });
}

/* -------------------------------------------------
   STATIC GROUPS
   These stay separate because they are not part of
   buildPortalNav() yet, but still belong in the sidebar.
------------------------------------------------- */
export const staticOperationalGroups: NavGroup[] = [
  {
    label: "Platform",
    icon: LayoutDashboard,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/automations", label: "Automations", icon: Cpu },
      { href: "/bots", label: "Bots", icon: Bot },
      { href: "/reports", label: "Reports", icon: FileBarChart },
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "Help Desk",
    icon: LifeBuoy,
    items: [
      {
        href: "/helpdesk",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        href: "/helpdesk/tickets",
        label: "Tickets",
        icon: LifeBuoy,
        key: "tickets",
      },
      {
        href: "/helpdesk/incidents",
        label: "Incidents",
        icon: AlertTriangle,
        key: "incidents",
      },
      {
        href: "/helpdesk/service-requests",
        label: "Service Requests",
        icon: Cpu,
        key: "serviceRequests",
      },
      {
        href: "/helpdesk/change-requests",
        label: "Change Requests",
        icon: Settings,
        key: "changeRequests",
      },
      {
        href: "/helpdesk/approvals",
        label: "Approvals",
        icon: Shield,
        key: "approvals",
      },
    ],
  },
  {
    label: "Monitoring",
    icon: Monitor,
    items: [
      {
        href: "/endpoints",
        label: "Endpoints",
        icon: Monitor,
        countKey: "endpoints",
      },
      {
        href: "/telemetry",
        label: "Telemetry",
        icon: Activity,
        countKey: "telemetryStale",
      },
      {
        href: "/alerts",
        label: "Active Alerts",
        icon: AlertTriangle,
        badge: "alerts",
      },
      {
        href: "/alerts/notifications",
        label: "Notification Audit",
        icon: Bell,
        badge: "notificationsFailed",
      },
      {
        href: "/endpoints/onboarding",
        label: "Agent Onboarding",
        icon: UserPlus,
      },
    ],
  },
];

