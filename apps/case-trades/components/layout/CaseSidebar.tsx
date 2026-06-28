"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Profile } from "@/lib/getProfile";
import OrganizationSwitcher from "@/components/layout/OrganizationSwitcher";
import {
  LayoutGrid,
  Activity,
  BarChart3,
  CreditCard,
  LogOut,
  ChevronDown,
  ShieldCheck,
  PlusCircle,
  Send,
  BookOpen,
  ClipboardList,
  Building2,
  Settings,
  Users,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

function isActivePath(pathname: string, item: NavItem) {
  const cleanHref = item.href.split("?")[0];

  if (item.exact) return pathname === cleanHref;
  return pathname === cleanHref || pathname.startsWith(cleanHref + "/");
}

function withOrgQuery(href: string, organizationSlug?: string | null) {
  if (!organizationSlug) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}org=${encodeURIComponent(organizationSlug)}`;
}

export default function CaseSidebar({ profile }: { profile?: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const email = profile?.email ?? "Unknown User";

  const organizations = profile?.organizations ?? [];
  const currentOrganization = profile?.current_organization ?? null;

  const selectedOrgSlug =
    searchParams.get("org") ??
    currentOrganization?.organization_slug ??
    organizations[0]?.organization_slug ??
    null;

  const selectedOrganization =
    organizations.find(
      (organization) => organization.organization_slug === selectedOrgSlug
    ) ??
    currentOrganization ??
    organizations[0] ??
    null;

  const roleName =
    (profile as any)?.role?.name ??
    (profile as any)?.roles?.name ??
    (profile as any)?.roles?.[0]?.name ??
    (profile as any)?.role_name ??
    "";

  const roleRank =
    (profile as any)?.role?.rank ??
    (profile as any)?.roles?.rank ??
    (profile as any)?.roles?.[0]?.rank ??
    (profile as any)?.rank ??
    null;

  const isMasterAdmin =
    roleName === "master_admin" ||
    roleRank === 4 ||
    email.toLowerCase() === "csthilaire@xilairetechnologies.com" ||
    selectedOrganization?.is_master_admin === true;

  const isPlatformAdmin =
    isMasterAdmin || roleName === "platform_admin" || roleRank === 3;

  const hasSignalsSubscription =
    isPlatformAdmin ||
    (selectedOrganization?.has_active_subscription === true &&
      selectedOrganization?.has_discord_access === true);

  const hasJournalSubscription =
    isPlatformAdmin || selectedOrganization?.has_active_subscription === true;

  const canManageCurrentOrg =
    isPlatformAdmin ||
    selectedOrganization?.role === "owner" ||
    selectedOrganization?.role === "admin";

  function buildHref(href: string) {
    return withOrgQuery(href, selectedOrganization?.organization_slug);
  }

  const tradingItems = useMemo(() => {
    const items: NavItem[] = [];

    if (hasSignalsSubscription) {
      items.push({
        href: buildHref("/dashboard/signals"),
        label: "Signals",
        icon: Activity,
      });
    }

    if (hasJournalSubscription) {
      items.push(
        {
          href: buildHref("/dashboard/journal"),
          label: "Journal",
          icon: BookOpen,
          exact: true,
        },
        {
          href: buildHref("/dashboard/journal/reports"),
          label: "Journal Reports",
          icon: ClipboardList,
        },
        {
          href: buildHref("/dashboard/performance"),
          label: "Performance",
          icon: BarChart3,
        }
      );
    }

    return items;
  }, [
    hasSignalsSubscription,
    hasJournalSubscription,
    selectedOrganization?.organization_slug,
  ]);

  const productItems = useMemo(() => {
    const items: NavItem[] = [];

    if (!hasSignalsSubscription) {
      items.push({
        href: buildHref("/dashboard/products/signals"),
        label: "Unlock Signals",
        icon: Activity,
      });
    }

    if (!hasJournalSubscription) {
      items.push({
        href: buildHref("/dashboard/products/journal"),
        label: "Unlock Journal",
        icon: BookOpen,
      });
    }

    return items;
  }, [
    hasSignalsSubscription,
    hasJournalSubscription,
    selectedOrganization?.organization_slug,
  ]);

  const navGroups: NavGroup[] = useMemo(
    () => [
      {
        label: "Platform",
        defaultOpen: true,
        items: [
          {
            href: buildHref("/dashboard"),
            label: "Dashboard",
            icon: LayoutGrid,
            exact: true,
          },
          {
            href: buildHref("/dashboard/billing"),
            label: "Billing",
            icon: CreditCard,
          },
          {
            href: buildHref("/dashboard/products"),
            label: "Products",
            icon: ShoppingBag,
            exact: true,
          },
        ],
      },
      ...(tradingItems.length > 0
        ? [
            {
              label: "Trading",
              defaultOpen: true,
              items: tradingItems,
            },
          ]
        : []),
      ...(productItems.length > 0
        ? [
            {
              label: "Unlock Products",
              defaultOpen: true,
              items: productItems,
            },
          ]
        : []),
      {
        label: "Control Center",
        defaultOpen: true,
        items: [
          {
            href: buildHref("/dashboard/organizations"),
            label: canManageCurrentOrg ? "Org Settings" : "Organization",
            icon: canManageCurrentOrg ? Settings : Building2,
            exact: true,
          },
          ...(canManageCurrentOrg
            ? [
                {
                  href: buildHref("/dashboard/organizations/billing"),
                  label: "Org Billing",
                  icon: CreditCard,
                },
              ]
            : []),
        ],
      },
      ...(isPlatformAdmin
        ? [
            {
              label: "Admin",
              defaultOpen: true,
              items: [
                {
                  href: buildHref("/dashboard/admin/customers"),
                  label: "Customers",
                  icon: Users,
                },
                {
                  href: buildHref("/dashboard/admin/organizations"),
                  label: "Organizations",
                  icon: Building2,
                },
                {
                  href: buildHref("/dashboard/admin/signals"),
                  label: "Manage Signals",
                  icon: ShieldCheck,
                  exact: true,
                },
                {
                  href: buildHref("/dashboard/admin/signals/create"),
                  label: "Create Signal",
                  icon: PlusCircle,
                },
                {
                  href: buildHref("/dashboard/admin/discord"),
                  label: "Discord Sender",
                  icon: Send,
                },
                {
                  href: buildHref("/dashboard/admin/settings"),
                  label: "Platform Settings",
                  icon: Settings,
                },
              ],
            },
          ]
        : []),
    ],
    [
      tradingItems,
      productItems,
      isPlatformAdmin,
      canManageCurrentOrg,
      selectedOrganization?.organization_slug,
    ]
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      navGroups.map((group) => [group.label, group.defaultOpen ?? true])
    )
  );

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleLogout() {
    setLoading(true);

    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    router.push("/auth/signin");
  }

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-950/90 px-4 py-4 md:flex">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          CASE Trades
        </p>
        <p className="text-sm text-slate-300">Trading Intelligence Platform</p>
      </div>

      {organizations.length > 0 && (
        <div className="mb-5">
          <OrganizationSwitcher
            organizations={organizations}
            currentOrganization={selectedOrganization}
          />
        </div>
      )}

      <nav className="flex-1 space-y-4 text-sm">
        {navGroups.map((group) => {
          const isOpen = openGroups[group.label] ?? group.defaultOpen ?? true;

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="mb-2 flex w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-slate-300"
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>

              {isOpen && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActivePath(pathname, item);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition " +
                          (active
                            ? "bg-emerald-600/20 text-emerald-300"
                            : "text-slate-300 hover:bg-slate-900")
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
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
        <p>Signed in as</p>
        <p className="font-medium text-slate-300">{email}</p>

        <button
          onClick={handleLogout}
          disabled={loading}
          className="mt-3 flex w-full items-center gap-3 rounded-lg bg-slate-800 px-3 py-2 text-left text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {loading ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}