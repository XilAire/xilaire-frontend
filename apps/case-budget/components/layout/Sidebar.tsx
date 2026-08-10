"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import WorkspaceManagerModal, {
  type WorkspaceManagerInitialView,
  type WorkspaceManagerWorkspace,
} from "@/components/workspaces/WorkspaceManagerModal";
import UserProfileMenu from "@/components/layout/UserProfileMenu";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";

import {
  useApp,
} from "@/components/providers/AppProvider";

import {
  hasCaseBudgetFeature,
  type CaseBudgetFeature,
  type CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

import type {
  CaseBudgetSubscriptionEntitlementState,
} from "@/types/subscription";

type SidebarNavigationItem = {
  label: string;
  href: string;
  icon: SidebarIconName;
  badge?: string;
  feature?: CaseBudgetFeature;
};

type SidebarNavigationSection = {
  id: SidebarNavigationSectionId;
  label: string;
  icon: SidebarIconName;
  items: SidebarNavigationItem[];
};

type SidebarNavigationSectionId =
  | "home"
  | "budget"
  | "wealth"
  | "insights"
  | "household"
  | "settings";

type SidebarIconName =
  | "dashboard"
  | "budget"
  | "payCycles"
  | "transactions"
  | "bills"
  | "calendar"
  | "goals"
  | "debt"
  | "accounts"
  | "investments"
  | "netWorth"
  | "reports"
  | "health"
  | "coach"
  | "members"
  | "activity"
  | "approvals"
  | "security"
  | "billing"
  | "workspace"
  | "settings";

type SidebarUser = {
  name: string;
  email: string;
};

type SidebarProps = {
  activePath?: string;

  user?: SidebarUser;
  userName?: string;
  userEmail?: string;

  subscriptionPlan?: CaseBudgetPlan;
  subscriptionEntitlements?: CaseBudgetSubscriptionEntitlementState | null;
};

const SIDEBAR_OPEN_SECTION_STORAGE_KEY =
  "case-budget:sidebar-open-section:v2";

const navigationSections: SidebarNavigationSection[] = [
  {
    id: "home",
    label: "Home",
    icon: "dashboard",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: "dashboard",
      },
    ],
  },
  {
    id: "budget",
    label: "Budget",
    icon: "budget",
    items: [
      {
        label: "Budget",
        href: "/dashboard/budget",
        feature: "monthly-budget",
        icon: "budget",
      },
      {
        label: "Pay Cycles",
        href: "/dashboard/pay-cycles",
        icon: "payCycles",
      },
      {
        label: "Transactions",
        href: "/dashboard/transactions",
        feature: "transactions",
        icon: "transactions",
      },
      {
        label: "Bills",
        href: "/dashboard/bills",
        feature: "bills",
        icon: "bills",
      },
      {
        label: "Calendar",
        href: "/dashboard/calendar",
        feature: "calendar",
        icon: "calendar",
      },
    ],
  },
  {
    id: "wealth",
    label: "Wealth",
    icon: "netWorth",
    items: [
      {
        label: "Savings Goals",
        href: "/dashboard/goals",
        feature: "goals",
        icon: "goals",
      },
      {
        label: "Debt Payoff",
        href: "/dashboard/debt",
        feature: "debts",
        icon: "debt",
      },
      {
        label: "Accounts",
        href: "/dashboard/accounts",
        feature: "manual-accounts",
        icon: "accounts",
      },
      {
        label: "Investments",
        href: "/dashboard/investments",
        feature: "investments",
        icon: "investments",
      },
      {
        label: "Net Worth",
        href: "/dashboard/net-worth",
        feature: "net-worth",
        icon: "netWorth",
      },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    icon: "reports",
    items: [
      {
        label: "Reports",
        href: "/dashboard/reports",
        feature: "reports",
        icon: "reports",
      },
      {
        label: "Financial Health",
        href: "/dashboard/financial-health",
        icon: "health",
      },
      {
        label: "AI Coach",
        href: "/dashboard/ai-coach",
        feature: "ai-coach",
        icon: "coach",
        badge: "Pro",
      },
    ],
  },
  {
    id: "household",
    label: "Household",
    icon: "members",
    items: [
      {
        label: "Members",
        href: "/dashboard/household/members",
        icon: "members",
      },
      {
        label: "Activity",
        href: "/dashboard/household/activity",
        icon: "activity",
      },
      {
        label: "Approvals",
        href: "/dashboard/household/approvals",
        icon: "approvals",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    items: [
      {
        label: "Security",
        href: "/dashboard/settings/security",
        icon: "security",
      },
      {
        label: "Billing & Subscription",
        href: "/dashboard/settings/billing",
        icon: "billing",
      },
      {
        label: "Workspace Settings",
        href: "/dashboard/settings/workspaces",
        icon: "workspace",
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: "settings",
      },
    ],
  },
];

function isSidebarNavigationSectionId(
  value:
    unknown,
): value is SidebarNavigationSectionId {
  return (
    value ===
      "home" ||
    value ===
      "budget" ||
    value ===
      "wealth" ||
    value ===
      "insights" ||
    value ===
      "household" ||
    value ===
      "settings"
  );
}

function readStoredOpenSectionId():
  SidebarNavigationSectionId | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        SIDEBAR_OPEN_SECTION_STORAGE_KEY,
      );

    return isSidebarNavigationSectionId(
      storedValue,
    )
      ? storedValue
      : null;
  } catch {
    return null;
  }
}

function writeStoredOpenSectionId(
  sectionId:
    SidebarNavigationSectionId,
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      SIDEBAR_OPEN_SECTION_STORAGE_KEY,
      sectionId,
    );
  } catch {
    // The accordion still works for the current page session.
  }
}

function getActiveNavigationSectionId(
  activePath:
    string,
):
  SidebarNavigationSectionId | null {
  for (
    const section
    of navigationSections
  ) {
    const containsActiveItem =
      section.items.some(
        (
          item,
        ) =>
          isNavigationItemActive(
            activePath,
            item.href,
          ),
      );

    if (
      containsActiveItem
    ) {
      return section.id;
    }
  }

  return null;
}

function isNavigationItemActive(
  activePath: string,
  href: string,
) {
  if (
    href === "/dashboard"
  ) {
    return activePath === href;
  }

  return (
    activePath === href ||
    activePath.startsWith(
      `${href}/`,
    )
  );
}

function SectionChevronIcon({
  isOpen,
}: {
  isOpen:
    boolean;
}) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={[
        "transition-transform duration-200",
        isOpen
          ? "rotate-180"
          : "",
      ].join(
        " ",
      )}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SidebarIcon({
  name,
}: {
  name: SidebarIconName;
}) {
  const sharedProps = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...sharedProps}>
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="2"
          />
          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="2"
          />
          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="2"
          />
          <rect
            x="14"
            y="14"
            width="7"
            height="7"
            rx="2"
          />
        </svg>
      );

    case "budget":
      return (
        <svg {...sharedProps}>
          <path d="M4 6.5h16" />
          <path d="M4 12h16" />
          <path d="M4 17.5h16" />
          <circle
            cx="8"
            cy="6.5"
            r="1.5"
          />
          <circle
            cx="15"
            cy="12"
            r="1.5"
          />
          <circle
            cx="11"
            cy="17.5"
            r="1.5"
          />
        </svg>
      );

    case "payCycles":
      return (
        <svg {...sharedProps}>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
          />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M3 10h18" />
          <path d="m8 15 2 2 5-5" />
        </svg>
      );

    case "transactions":
      return (
        <svg {...sharedProps}>
          <path d="M7 7h11" />
          <path d="m15 4 3 3-3 3" />
          <path d="M17 17H6" />
          <path d="m9 14-3 3 3 3" />
        </svg>
      );

    case "bills":
      return (
        <svg {...sharedProps}>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h3" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...sharedProps}>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
          />
          <path d="M16 3v4" />
          <path d="M8 3v4" />
          <path d="M3 10h18" />
        </svg>
      );

    case "goals":
      return (
        <svg {...sharedProps}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <circle
            cx="12"
            cy="12"
            r="5"
          />
          <circle
            cx="12"
            cy="12"
            r="1"
          />
        </svg>
      );

    case "debt":
      return (
        <svg {...sharedProps}>
          <path d="M4 7h16" />
          <path d="M6 3h12l2 4H4l2-4Z" />
          <path d="M6 7v11" />
          <path d="M10 7v11" />
          <path d="M14 7v11" />
          <path d="M18 7v11" />
          <path d="M4 18h16" />
          <path d="M3 21h18" />
        </svg>
      );

    case "accounts":
      return (
        <svg {...sharedProps}>
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="3"
          />
          <path d="M3 10h18" />
          <path d="M7 15h3" />
        </svg>
      );

    case "investments":
      return (
        <svg {...sharedProps}>
          <path d="M4 19V9" />
          <path d="M10 19V5" />
          <path d="M16 19v-7" />
          <path d="M22 19V3" />
          <path d="M2 19h20" />
        </svg>
      );

    case "netWorth":
      return (
        <svg {...sharedProps}>
          <path d="M4 17 9 12l4 4 7-9" />
          <path d="M15 7h5v5" />
          <path d="M4 21h16" />
        </svg>
      );

    case "reports":
      return (
        <svg {...sharedProps}>
          <path d="M4 19V9" />
          <path d="M10 19V5" />
          <path d="M16 19v-7" />
          <path d="M22 19V3" />
        </svg>
      );

    case "health":
      return (
        <svg {...sharedProps}>
          <path d="M3 12h4l2-5 4 10 2-5h6" />
          <path d="M20.5 5.5a5 5 0 0 0-7.1 0L12 6.9l-1.4-1.4a5 5 0 1 0-7.1 7.1L12 21l8.5-8.4a5 5 0 0 0 0-7.1Z" />
        </svg>
      );

    case "coach":
      return (
        <svg {...sharedProps}>
          <path d="M12 3a4 4 0 0 0-4 4v1a4 4 0 0 0 4 4 4 4 0 0 0 4-4V7a4 4 0 0 0-4-4Z" />
          <path d="M7 10H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2" />
          <path d="M17 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" />
          <path d="M12 16v5" />
          <path d="M9 21h6" />
        </svg>
      );

    case "members":
      return (
        <svg {...sharedProps}>
          <circle
            cx="9"
            cy="8"
            r="4"
          />
          <path d="M2 21a7 7 0 0 1 14 0" />
          <path d="M16 3.5a4 4 0 0 1 0 8" />
          <path d="M18 15a6 6 0 0 1 4 6" />
        </svg>
      );

    case "activity":
      return (
        <svg {...sharedProps}>
          <path d="M12 8v5l3 2" />
          <circle
            cx="12"
            cy="13"
            r="8"
          />
          <path d="M12 2v3" />
          <path d="M8 2h8" />
        </svg>
      );

    case "approvals":
      return (
        <svg {...sharedProps}>
          <path d="M9 11 12 14 20 6" />
          <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
        </svg>
      );

    case "security":
      return (
        <svg {...sharedProps}>
          <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );


    case "billing":
      return (
        <svg {...sharedProps}>
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="3"
          />
          <path d="M3 10h18" />
          <path d="M7 15h4" />
          <path d="M16.5 14.5v3" />
          <path d="M15 16h3" />
        </svg>
      );

    case "workspace":
      return (
        <svg {...sharedProps}>
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="2"
          />
          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="2"
          />
          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="2"
          />
          <path d="M17.5 14v7" />
          <path d="M14 17.5h7" />
        </svg>
      );

    case "settings":
      return (
        <svg {...sharedProps}>
          <circle
            cx="12"
            cy="12"
            r="3"
          />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );
  }
}

export default function Sidebar({
  activePath = "/dashboard",
  user,
  userName,
  userEmail,
  subscriptionPlan = "free",
  subscriptionEntitlements: _subscriptionEntitlements,
}: SidebarProps) {
  const [
    isWorkspaceManagerOpen,
    setIsWorkspaceManagerOpen,
  ] = useState(
    false,
  );

  const [
    workspaceManagerInitialView,
    setWorkspaceManagerInitialView,
  ] = useState<WorkspaceManagerInitialView>(
    "manage",
  );

  const [
    openSectionId,
    setOpenSectionId,
  ] = useState<SidebarNavigationSectionId>(
    "home",
  );

  const {
    currentUser,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    openWorkspaceSwitcher,
  } = useApp();

  const activeSectionId =
    getActiveNavigationSectionId(
      activePath,
    );

  useEffect(
    () => {
      if (
        activeSectionId
      ) {
        setOpenSectionId(
          activeSectionId,
        );

        writeStoredOpenSectionId(
          activeSectionId,
        );

        return;
      }

      const storedSectionId =
        readStoredOpenSectionId();

      if (
        storedSectionId
      ) {
        setOpenSectionId(
          storedSectionId,
        );
      }
    },
    [
      activeSectionId,
    ],
  );

  useEffect(
    () => {
      writeStoredOpenSectionId(
        openSectionId,
      );
    },
    [
      openSectionId,
    ],
  );

  const activeWorkspace =
    workspaces.find(
      (
        workspace,
      ) =>
        workspace.id ===
        activeWorkspaceId,
    ) ??
    workspaces[0] ??
    null;

  const workspaceManagerWorkspace:
    WorkspaceManagerWorkspace | null =
    activeWorkspace &&
    (
      activeWorkspace.type ===
        "personal" ||
      activeWorkspace.type ===
        "household" ||
      activeWorkspace.type ===
        "business"
    )
      ? {
          id:
            activeWorkspace.id,

          name:
            activeWorkspace.name,

          type:
            activeWorkspace.type,

          memberCount:
            activeWorkspace.memberCount,

          isOwner:
            activeWorkspace.isOwner,
        }
      : null;

  function openWorkspaceManager(
    initialView:
      WorkspaceManagerInitialView,
  ) {
    setWorkspaceManagerInitialView(
      initialView,
    );

    setIsWorkspaceManagerOpen(
      true,
    );
  }

  function openNavigationSection(
    sectionId:
      SidebarNavigationSectionId,
  ) {
    setOpenSectionId(
      sectionId,
    );
  }

  const resolvedUserName =
    currentUser?.displayName ??
    user?.name ??
    userName ??
    "CASE Budget User";

  const resolvedUserEmail =
    currentUser?.email ??
    user?.email ??
    userEmail ??
    "";

  const canAccessNavigationItem = (
    item: SidebarNavigationItem,
  ) => {
    if (!item.feature) {
      return true;
    }

    return hasCaseBudgetFeature(
      subscriptionPlan,
      item.feature,
    );
  };

  const getNavigationBadge = (
    item: SidebarNavigationItem,
  ) => {
    if (
      item.feature === "ai-coach"
    ) {
      return "Pro";
    }

    if (
      item.feature &&
      !canAccessNavigationItem(
        item,
      )
    ) {
      return "Plus";
    }

    return item.badge;
  };

  return (
    <aside className="flex min-h-full flex-col bg-[var(--sidebar-background)] px-4 py-5 text-[var(--sidebar-foreground)] transition-colors duration-200">
      <div className="px-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          aria-label="Go to CASE Budget dashboard"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] font-black text-[var(--primary-foreground)] shadow-[var(--shadow-primary)]">
            CB
          </div>

          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight text-[var(--sidebar-foreground)]">
              CASE Budget
            </p>

            <p className="truncate text-xs font-medium text-[var(--sidebar-muted-foreground)]">
              Financial command center
            </p>
          </div>
        </Link>
      </div>

      <div className="mt-6">
        <WorkspaceSwitcher
          workspaces={
            workspaces
          }
          activeWorkspaceId={
            activeWorkspaceId
          }
          onWorkspaceChange={(
            workspace,
          ) => {
            setActiveWorkspace(
              workspace.id,
            );
          }}
          onCreateWorkspace={() => {
            openWorkspaceManager(
              "create",
            );
          }}
          onManageWorkspace={() => {
            openWorkspaceManager(
              "manage",
            );
          }}
        />
      </div>

      <nav
        className="mt-6 flex-1 space-y-2"
        aria-label="Primary navigation"
      >
        {navigationSections.map(
          (
            section,
          ) => {
            const hasActiveItem =
              section.items.some(
                (
                  item,
                ) =>
                  isNavigationItemActive(
                    activePath,
                    item.href,
                  ),
              );

            const isOpen =
              openSectionId ===
              section.id;


            return (
              <section
                key={
                  section.id
                }
                className={[
                  "overflow-hidden rounded-2xl border transition",
                  hasActiveItem
                    ? "border-[color-mix(in_srgb,var(--primary)_20%,var(--sidebar-border))] bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]"
                    : "border-transparent",
                ].join(
                  " ",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    openNavigationSection(
                      section.id,
                    );
                  }}
                  aria-expanded={
                    isOpen
                  }
                  className={[
                    "group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition",
                    "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                    hasActiveItem
                      ? "text-[var(--sidebar-foreground)]"
                      : "text-[var(--sidebar-section-foreground)] hover:bg-[var(--sidebar-hover-background)] hover:text-[var(--sidebar-hover-foreground)]",
                  ].join(
                    " ",
                  )}
                >
                  <span
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                      hasActiveItem
                        ? "bg-[var(--sidebar-active-background)] text-[var(--sidebar-active-foreground)]"
                        : "bg-[var(--sidebar-hover-background)] text-[var(--sidebar-icon-foreground)] group-hover:text-[var(--sidebar-hover-foreground)]",
                    ].join(
                      " ",
                    )}
                  >
                    <SidebarIcon
                      name={
                        section.icon
                      }
                    />
                  </span>

                  <span className="min-w-0 flex-1 truncate text-xs font-extrabold uppercase tracking-[0.14em]">
                    {
                      section.label
                    }
                  </span>

                  <span
                    className={[
                      "shrink-0 transition",
                      hasActiveItem
                        ? "text-[var(--sidebar-active-foreground)]"
                        : "text-[var(--sidebar-icon-foreground)]",
                    ].join(
                      " ",
                    )}
                  >
                    <SectionChevronIcon
                      isOpen={
                        isOpen
                      }
                    />
                  </span>
                </button>

                <div
                  className={[
                    "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  ].join(
                    " ",
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="space-y-1 px-2 pb-2">
                      {section.items.map(
                        (
                          item,
                        ) => {
                          const hasAccess =
                            canAccessNavigationItem(
                              item,
                            );

                          const badge =
                            getNavigationBadge(
                              item,
                            );

                          const isActive =
                            isNavigationItemActive(
                              activePath,
                              item.href,
                            );

                          const resolvedHref =
                            hasAccess
                              ? item.href
                              : "/dashboard/settings/billing";

                          return (
                            <Link
                              key={
                                item.href
                              }
                              href={
                                resolvedHref
                              }
                              aria-current={
                                isActive
                                  ? "page"
                                  : undefined
                              }
                              className={[
                                "group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                                isActive
                                  ? "bg-[var(--sidebar-active-background)] text-[var(--sidebar-active-foreground)]"
                                  : hasAccess
                                    ? "text-[var(--sidebar-muted-foreground)] hover:bg-[var(--sidebar-hover-background)] hover:text-[var(--sidebar-hover-foreground)]"
                                    : "text-[var(--sidebar-muted-foreground)] opacity-70 hover:bg-[var(--sidebar-hover-background)] hover:text-[var(--sidebar-hover-foreground)]",
                              ].join(
                                " ",
                              )}
                            >
                              <span
                                className={[
                                  "shrink-0 transition",
                                  isActive
                                    ? "text-[var(--sidebar-active-foreground)]"
                                    : "text-[var(--sidebar-icon-foreground)] group-hover:text-[var(--sidebar-hover-foreground)]",
                                ].join(
                                  " ",
                                )}
                              >
                                <SidebarIcon
                                  name={
                                    item.icon
                                  }
                                />
                              </span>

                              <span className="min-w-0 flex-1 truncate">
                                {
                                  item.label
                                }
                              </span>

                              {badge ? (
                                <span
                                  className={[
                                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                                    badge ===
                                    "Pro"
                                      ? "bg-[var(--pro-soft)] text-[var(--pro)]"
                                      : "bg-[var(--warning-soft)] text-[var(--warning)]",
                                  ].join(
                                    " ",
                                  )}
                                >
                                  {badge}
                                </span>
                              ) : null}
                            </Link>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          },
        )}
      </nav>

      <div className="mt-4 border-t border-[var(--sidebar-border)] pt-4">
        <UserProfileMenu
          name={
            resolvedUserName
          }
          email={
            resolvedUserEmail
          }
          className="mt-2"
          onOpenWorkspaceSwitcher={
            openWorkspaceSwitcher
          }
        />
      </div>

      <WorkspaceManagerModal
        open={
          isWorkspaceManagerOpen
        }
        workspace={
          workspaceManagerWorkspace
        }
        initialView={
          workspaceManagerInitialView
        }
        onClose={() => {
          setIsWorkspaceManagerOpen(
            false,
          );
        }}
        onOpenSettings={() => {
          setIsWorkspaceManagerOpen(
            false,
          );

          window.location.assign(
            "/dashboard/settings/workspaces",
          );
        }}
      />
    </aside>
  );
}