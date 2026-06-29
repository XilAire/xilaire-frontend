import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  CreditCard,
  LayoutGrid,
  PlusCircle,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Profile } from "@/lib/getProfile";

export type CaseNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type CaseNavGroup = {
  label: string;
  items: CaseNavItem[];
  defaultOpen?: boolean;
};

export type CaseNavigationState = {
  email: string;
  organizations: NonNullable<Profile["organizations"]>;
  currentOrganization: Profile["current_organization"] | null;
  selectedOrganization: NonNullable<Profile["organizations"]>[number] | null;
  selectedOrgSlug: string | null;
  roleName: string;
  roleRank: number | null;
  isMasterAdmin: boolean;
  isPlatformAdmin: boolean;
  hasSignalsSubscription: boolean;
  hasJournalSubscription: boolean;
  canManageCurrentOrg: boolean;
  navGroups: CaseNavGroup[];
};

export function isActiveCasePath(pathname: string, item: CaseNavItem) {
  const cleanHref = item.href.split("?")[0];

  if (item.exact) {
    return pathname === cleanHref;
  }

  return pathname === cleanHref || pathname.startsWith(cleanHref + "/");
}

export function withOrgQuery(
  href: string,
  organizationSlug?: string | null
) {
  if (!organizationSlug) {
    return href;
  }

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}org=${encodeURIComponent(organizationSlug)}`;
}

export function buildCaseNavigation({
  profile,
  orgSlug,
}: {
  profile?: Profile;
  orgSlug?: string | null;
}): CaseNavigationState {
  const email = profile?.email ?? "Unknown User";

  const organizations = profile?.organizations ?? [];
  const currentOrganization = profile?.current_organization ?? null;

  const selectedOrgSlug =
    orgSlug ??
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

  const tradingItems: CaseNavItem[] = [];

  if (hasSignalsSubscription) {
    tradingItems.push({
      href: buildHref("/dashboard/signals"),
      label: "Signals",
      icon: Activity,
    });
  }

  if (hasJournalSubscription) {
    tradingItems.push(
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

  const productItems: CaseNavItem[] = [];

  if (!hasSignalsSubscription) {
    productItems.push({
      href: buildHref("/dashboard/products/signals"),
      label: "Unlock Signals",
      icon: Activity,
    });
  }

  if (!hasJournalSubscription) {
    productItems.push({
      href: buildHref("/dashboard/products/journal"),
      label: "Unlock Journal",
      icon: BookOpen,
    });
  }

  const navGroups: CaseNavGroup[] = [
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
  ];

  return {
    email,
    organizations,
    currentOrganization,
    selectedOrganization,
    selectedOrgSlug,
    roleName,
    roleRank,
    isMasterAdmin,
    isPlatformAdmin,
    hasSignalsSubscription,
    hasJournalSubscription,
    canManageCurrentOrg,
    navGroups,
  };
}