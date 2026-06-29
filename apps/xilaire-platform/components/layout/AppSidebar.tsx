"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  LifeBuoy,
  Monitor,
  Activity,
  Cpu,
  Settings,
  Shield,
  AlertTriangle,
  Bell,
  LayoutDashboard,
  Bot,
  FileBarChart,
  CreditCard,
  Users,
  UserPlus,
  Briefcase,
  FolderKanban,
  MapPinned,
  ClipboardList,
  Receipt,
  FileText,
  Building2,
} from "lucide-react";
import { supabase } from "@/lib/supabasePlatformClient";
import {
  buildPortalNav,
  type SidebarNavItem,
} from "@/components/layout/buildPortalNav";
import type { AccessContext } from "@/lib/portalAccess";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type HelpdeskCounts = {
  tickets: number;
  incidents: number;
  serviceRequests: number;
  changeRequests: number;
  approvals: number;
};

type MonitoringCounts = {
  endpoints: number;
  telemetryStale: number;
};

type NavBadges = {
  alerts: number;
  notificationsFailed: number;
};

type NavItem = {
  href: string;
  label: string;
  icon?: React.ElementType;
  key?: keyof HelpdeskCounts;
  badge?: keyof NavBadges;
  countKey?: keyof MonitoringCounts;
};

type NavGroup = {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

type SidebarProfile = {
  full_name: string | null;
  email: string;
  role: string | null;
  account_type?: string | null;
  status?: string | null;
  org_id?: string | null;
} | null;

type ResolvedProfile = {
  full_name: string | null;
  email: string;
  role: string | null;
  account_type: string | null;
  status: string | null;
  org_id: string | null;
};

type VendorAccessState = {
  vendorRecordExists: boolean;
  vendorIsActive: boolean;
  vendorLegacyActive: boolean;
  vendorOnboardingStatus: string | null;
  vendorOnboardingCompletedAt: string | null;
};

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function toResolvedProfile(profile: SidebarProfile): ResolvedProfile {
  return {
    full_name: profile?.full_name ?? "Unknown User",
    email: profile?.email ?? "",
    role: profile?.role ?? "user",
    account_type: profile?.account_type ?? null,
    status: profile?.status ?? null,
    org_id: profile?.org_id ?? null,
  };
}

function profileNeedsHydration(profile: ResolvedProfile) {
  return (
    !profile.account_type ||
    !profile.role ||
    !profile.status ||
    !profile.org_id
  );
}

function itemIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function getGroupIcon(label: string): React.ElementType {
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

function getItemIcon(href: string): React.ElementType | undefined {
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

function convertPortalNavToGroups(items: SidebarNavItem[]): NavGroup[] {
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
const staticOperationalGroups: NavGroup[] = [
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

/* -------------------------------------------------
   SIDEBAR
------------------------------------------------- */
export default function AppSidebar({
  profile,
  counts,
  monitoringCounts,
}: {
  profile: SidebarProfile;
  counts: HelpdeskCounts;
  monitoringCounts: MonitoringCounts;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [resolvedProfile, setResolvedProfile] = useState<ResolvedProfile>(() =>
    toResolvedProfile(profile),
  );

  const [vendorAccessState, setVendorAccessState] = useState<VendorAccessState>(
    {
      vendorRecordExists: false,
      vendorIsActive: false,
      vendorLegacyActive: false,
      vendorOnboardingStatus: null,
      vendorOnboardingCompletedAt: null,
    },
  );

  const [navBadges, setNavBadges] = useState<NavBadges>({
    alerts: 0,
    notificationsFailed: 0,
  });

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setResolvedProfile(toResolvedProfile(profile));
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateProfile() {
      const current = toResolvedProfile(profile);

      if (!profileNeedsHydration(current)) {
        return;
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user?.id) {
          return;
        }

        const { data: freshProfile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, email, role, account_type, status, org_id")
          .eq("id", user.id)
          .single();

        if (profileError || !freshProfile) {
          return;
        }

        if (!cancelled) {
          setResolvedProfile({
            full_name: freshProfile.full_name ?? current.full_name,
            email: freshProfile.email ?? current.email,
            role: freshProfile.role ?? current.role,
            account_type: freshProfile.account_type ?? null,
            status: freshProfile.status ?? null,
            org_id: freshProfile.org_id ?? null,
          });
        }
      } catch {
        // intentional no-op
      }
    }

    hydrateProfile();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateVendorAccess() {
      const accountType = normalize(resolvedProfile.account_type);
      const orgId = resolvedProfile.org_id;

      if (accountType !== "vendor" || !orgId) {
        if (!cancelled) {
          setVendorAccessState({
            vendorRecordExists: false,
            vendorIsActive: false,
            vendorLegacyActive: false,
            vendorOnboardingStatus: null,
            vendorOnboardingCompletedAt: null,
          });
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("infrastructure_vendors")
          .select(
            "id, active, is_active, onboarding_status, onboarding_completed_at",
          )
          .eq("org_id", orgId)
          .limit(1)
          .maybeSingle();

        if (error) {
          return;
        }

        if (!cancelled) {
          setVendorAccessState({
            vendorRecordExists: Boolean(data?.id),
            vendorIsActive: Boolean(data?.is_active),
            vendorLegacyActive: Boolean(data?.active),
            vendorOnboardingStatus: data?.onboarding_status ?? null,
            vendorOnboardingCompletedAt: data?.onboarding_completed_at ?? null,
          });
        }
      } catch {
        // intentional no-op
      }
    }

    hydrateVendorAccess();

    return () => {
      cancelled = true;
    };
  }, [resolvedProfile.account_type, resolvedProfile.org_id]);

  const accessContext: AccessContext = useMemo(
    () => ({
      role: resolvedProfile.role,
      accountType: resolvedProfile.account_type,
      profileStatus: resolvedProfile.status,
      orgId: resolvedProfile.org_id,
      vendorRecordExists: vendorAccessState.vendorRecordExists,
      vendorIsActive: vendorAccessState.vendorIsActive,
      vendorLegacyActive: vendorAccessState.vendorLegacyActive,
      vendorOnboardingStatus: vendorAccessState.vendorOnboardingStatus,
      vendorOnboardingCompletedAt:
        vendorAccessState.vendorOnboardingCompletedAt,
    }),
    [resolvedProfile, vendorAccessState],
  );

  const portalDrivenGroups = useMemo(() => {
    return convertPortalNavToGroups(buildPortalNav(accessContext));
  }, [accessContext]);

  const normalizedAccountType = normalize(resolvedProfile.account_type);
  const normalizedRole = normalize(resolvedProfile.role);

  const isVendor = normalizedAccountType === "vendor";

  const isInternalLike =
    !isVendor &&
    (normalizedAccountType === "internal" ||
      normalizedAccountType === "business" ||
      normalizedAccountType === "individual" ||
      normalizedAccountType === "" ||
      normalizedRole === "finance" ||
      normalizedRole === "admin" ||
      normalizedRole === "super_admin" ||
      normalizedRole === "master_admin" ||
      normalizedRole === "project_manager");

  const canViewOperationalPlatform =
    !isVendor ||
    normalizedRole === "admin" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "master_admin" ||
    normalizedRole === "project_manager" ||
    normalizedRole === "finance";

  const canViewHelpDesk = isInternalLike;

  const canViewMonitoring =
    normalizedRole === "project_manager" ||
    normalizedRole === "admin" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "master_admin";

  const canViewVault =
    !isVendor ||
    normalizedRole === "admin" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "master_admin" ||
    normalizedRole === "project_manager" ||
    normalizedRole === "finance";

  const visibleNavGroups = useMemo(() => {
    const groups: NavGroup[] = [];

    if (canViewOperationalPlatform) {
      const platformGroup = staticOperationalGroups.find(
        (g) => g.label === "Platform",
      );
      if (platformGroup) groups.push(platformGroup);
    }

    if (canViewHelpDesk) {
      const helpDeskGroup = staticOperationalGroups.find(
        (g) => g.label === "Help Desk",
      );
      if (helpDeskGroup) groups.push(helpDeskGroup);
    }

    if (canViewMonitoring) {
      const monitoringGroup = staticOperationalGroups.find(
        (g) => g.label === "Monitoring",
      );
      if (monitoringGroup) groups.push(monitoringGroup);
    }

    if (canViewVault) {
      groups.push({
        label: "Vault",
        icon: FileText,
        items: [
          {
            href: "/vault",
            label: "Overview",
            icon: LayoutDashboard,
          },
          {
            href: "/vault/search",
            label: "Search",
            icon: FileBarChart,
          },
          {
            href: "/vault/messages",
            label: "Messages",
            icon: FileText,
          },
          {
            href: "/vault/cases",
            label: "Cases",
            icon: FolderKanban,
          },
          {
            href: "/vault/holds",
            label: "Holds",
            icon: Shield,
          },
          {
            href: "/vault/exports",
            label: "Exports",
            icon: Receipt,
          },
          {
            href: "/vault/ingest",
            label: "Ingestion",
            icon: Cpu,
          },
          {
            href: "/vault/sources",
            label: "Sources",
            icon: Building2,
          },
          {
            href: "/vault/custodians",
            label: "Custodians",
            icon: Users,
          },
          {
            href: "/vault/retention",
            label: "Retention",
            icon: ClipboardList,
          },
          {
            href: "/vault/audit",
            label: "Audit",
            icon: FileBarChart,
          },
        ].filter(
          (entry, index, arr) =>
            arr.findIndex((x) => x.href === entry.href) === index,
        ),
      });
    }

    const organizedPortalGroups = portalDrivenGroups.map((group) => {
      if (group.label === "Finance") {
        return {
          ...group,
          items: [
            ...group.items,
            {
              href: "/finance/invoices",
              label: "Finance Invoices",
              icon: getItemIcon("/finance/invoices"),
            },
            {
              href: "/finance/overages",
              label: "Overage Usage",
              icon: getItemIcon("/finance/overages"),
            },
          ].filter(
            (entry, index, arr) =>
              arr.findIndex((x) => x.href === entry.href) === index,
          ),
        };
      }

      return group;
    });

    groups.push(
      ...organizedPortalGroups.filter(
        (group) => group.label !== "Platform" && group.items.length > 0,
      ),
    );

    return groups;
  }, [
    canViewOperationalPlatform,
    canViewHelpDesk,
    canViewMonitoring,
    canViewVault,
    portalDrivenGroups,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadBadges() {
      try {
        const res = await fetch("/api/navigation/badges", {
          credentials: "include",
        });

        if (!res.ok) return;

        const data = await res.json();

        if (!cancelled) {
          setNavBadges(data);
        }
      } catch {
        // intentional no-op
      }
    }

    loadBadges();

    const interval = setInterval(loadBadges, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const nextState = Object.fromEntries(
      visibleNavGroups.map((group) => [
        group.label,
        group.items.some((item) => itemIsActive(pathname, item.href)),
      ]),
    ) as Record<string, boolean>;

    setOpenSections((prev) => ({
      ...nextState,
      ...prev,
    }));
  }, [pathname, visibleNavGroups]);

  function toggleSection(label: string) {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/auth/signin");
  }

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-950/90 px-3 py-4 md:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-3 px-2">
        <Image
          src="/icon-light.png"
          alt="XilAire Technologies"
          width={32}
          height={32}
          priority
        />
        <div>
          <p className="text-sm font-semibold text-slate-200">
            XilAire Platform
          </p>
          <p className="text-xs text-slate-400">Operations & Automation</p>
        </div>
      </Link>

      <nav className="space-y-4 text-sm">
        {visibleNavGroups.map((group) => {
          const GroupIcon = group.icon;
          const open = openSections[group.label] ?? false;

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleSection(group.label)}
                className="flex w-full items-center justify-between px-2 py-2 text-xs uppercase tracking-wide text-slate-500 hover:text-slate-300"
              >
                <span className="flex items-center gap-2">
                  <GroupIcon className="h-4 w-4" />
                  {group.label}
                </span>
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {open && (
                <div className="mt-1 space-y-1 pl-1">
                  {group.items.map((link) => {
                    const active = itemIsActive(pathname, link.href);
                    const ItemIcon = link.icon;

                    const count =
                      typeof link.badge === "string"
                        ? navBadges[link.badge]
                        : typeof link.key === "string"
                          ? counts?.[link.key] ?? 0
                          : typeof link.countKey === "string"
                            ? monitoringCounts?.[link.countKey] ?? 0
                            : null;

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={
                          "flex items-center justify-between rounded-lg px-2 py-2 transition " +
                          (active
                            ? "bg-sky-600/20 text-sky-300"
                            : "text-slate-300 hover:bg-slate-900")
                        }
                      >
                        <span className="flex items-center gap-2">
                          {ItemIcon && <ItemIcon className="h-4 w-4" />}
                          {link.label}
                        </span>

                        {typeof count === "number" && count > 0 && (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                            {count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-800 pt-3 text-xs text-slate-500">
        <p className="font-medium text-slate-300">{resolvedProfile.full_name}</p>
        <p className="mb-3 text-[11px]">{resolvedProfile.email}</p>

        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-left text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}