"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
} from "lucide-react";

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

type NavGroup = {
  label: string;
  icon: React.ElementType;
  items: {
    href: string;
    label: string;
    icon?: React.ElementType;
    key?: keyof HelpdeskCounts;
    badge?: keyof NavBadges;
    countKey?: keyof MonitoringCounts;
  }[];
};

/* -------------------------------------------------
   NAV GROUPS
------------------------------------------------- */
const navGroups: NavGroup[] = [
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
  profile: {
    full_name: string | null;
    email: string;
    role: string;
  } | null;
  counts: HelpdeskCounts;
  monitoringCounts: MonitoringCounts;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const safeProfile = profile ?? {
    full_name: "Unknown User",
    email: "",
    role: "user",
  };

  /* -------------------------------------------------
     NAV BADGES
  ------------------------------------------------- */
  const [navBadges, setNavBadges] = useState<NavBadges>({
    alerts: 0,
    notificationsFailed: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadBadges() {
      try {
        const res = await fetch("/api/navigation/badges", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setNavBadges(data);
      } catch {}
    }

    loadBadges();
    const interval = setInterval(loadBadges, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/auth/signin");
  }

  const isMasterAdmin = safeProfile.role === "master_admin";
  const isAdmin =
    safeProfile.role === "admin" || safeProfile.role === "master_admin";

  /* -------------------------------------------------
     SECTION OPEN STATE
  ------------------------------------------------- */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        navGroups.map((g) => [
          g.label,
          g.items.some(
            (i) =>
              pathname === i.href ||
              pathname.startsWith(i.href + "/")
          ),
        ])
      )
  );

  function toggleSection(label: string) {
    setOpenSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  }

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-950/90 px-3 py-4 md:flex">
      {/* -------------------------------------------------
         LOGO / HEADER
      ------------------------------------------------- */}
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
          <p className="text-xs text-slate-400">
            Operations & Automation
          </p>
        </div>
      </Link>

      {/* -------------------------------------------------
         NAVIGATION
      ------------------------------------------------- */}
      <nav className="space-y-4 text-sm">
        {navGroups.map((group) => {
          const GroupIcon = group.icon;
          const open = openSections[group.label];

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleSection(group.label)}
                className="flex w-full items-center justify-between px-2 py-2 text-left text-xs uppercase tracking-wide text-slate-500 hover:text-slate-300"
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
                    const active =
                      pathname === link.href ||
                      pathname.startsWith(link.href + "/");

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

        {/* -------------------------------------------------
           ADMIN
        ------------------------------------------------- */}
        {isAdmin && (
          <div>
            <button className="flex w-full items-center gap-2 px-2 py-2 text-xs uppercase tracking-wide text-slate-500">
              <Shield className="h-4 w-4" />
              Administration
            </button>

            <Link
              href="/endpoints/onboarding"
              className={
                "ml-5 mt-1 flex rounded-lg px-2 py-2 transition " +
                (pathname.startsWith("/endpoints/onboarding")
                  ? "bg-sky-600/20 text-sky-300"
                  : "text-slate-300 hover:bg-slate-900")
              }
            >
              Agent Onboarding
            </Link>
          </div>
        )}

        {/* -------------------------------------------------
           SYSTEM
        ------------------------------------------------- */}
        {isMasterAdmin && (
          <div>
            <button className="flex w-full items-center gap-2 px-2 py-2 text-xs uppercase tracking-wide text-slate-500">
              <Settings className="h-4 w-4" />
              System
            </button>

            <Link
              href="/admin/settings"
              className={
                "ml-5 mt-1 flex rounded-lg px-2 py-2 transition " +
                (pathname.startsWith("/admin/settings")
                  ? "bg-sky-600/20 text-sky-300"
                  : "text-slate-300 hover:bg-slate-900")
              }
            >
              Platform Settings
            </Link>
          </div>
        )}
      </nav>

      {/* -------------------------------------------------
         FOOTER
      ------------------------------------------------- */}
      <div className="mt-auto border-t border-slate-800 pt-3 text-xs text-slate-500">
        <p className="font-medium text-slate-300">
          {safeProfile.full_name}
        </p>
        <p className="mb-3 text-[11px]">{safeProfile.email}</p>

        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-left text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
        >
          {loading ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
