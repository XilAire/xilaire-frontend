"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  useApp,
} from "@/components/providers/AppProvider";

export type MobileNavItem = {
  id: string;
  label: string;
  href: string;
  icon: MobileNavIcon;
  badge?: number | string;
};

export type MobileNavIcon =
  | "dashboard"
  | "budget"
  | "payCycles"
  | "transactions"
  | "accounts"
  | "more";

type MobileNavProps = {
  activeItem?: string;
  items?: MobileNavItem[];
  onNavigate?: (
    item: MobileNavItem,
  ) => void;
};

const defaultItems: MobileNavItem[] = [
  {
    id: "dashboard",
    label: "Home",
    href: "/dashboard",
    icon: "dashboard",
  },
  {
    id: "budget",
    label: "Budget",
    href: "/dashboard/budget",
    icon: "budget",
  },
  {
    id: "transactions",
    label: "Activity",
    href: "/dashboard/transactions",
    icon: "transactions",
  },
  {
    id: "payCycles",
    label: "Pay Cycles",
    href: "/dashboard/pay-cycles",
    icon: "payCycles",
  },
  {
    id: "more",
    label: "More",
    href: "#",
    icon: "more",
  },
];

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

function isNavigationItemActive(
  pathname: string,
  item: MobileNavItem,
) {
  if (
    item.id === "more"
  ) {
    return false;
  }

  if (
    item.href === "/dashboard"
  ) {
    return pathname === "/dashboard";
  }

  return (
    pathname === item.href ||
    pathname.startsWith(
      `${item.href}/`,
    )
  );
}

function DashboardIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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
}

function BudgetIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />

      <circle
        cx="8"
        cy="7"
        r="1.2"
      />

      <circle
        cx="15"
        cy="12"
        r="1.2"
      />

      <circle
        cx="10"
        cy="17"
        r="1.2"
      />
    </svg>
  );
}

function PayCyclesIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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
}

function TransactionsIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 7h11" />
      <path d="m15 4 3 3-3 3" />
      <path d="M17 17H6" />
      <path d="m9 14-3 3 3 3" />
    </svg>
  );
}

function AccountsIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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
}

function MoreIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="5"
        cy="12"
        r="1"
      />

      <circle
        cx="12"
        cy="12"
        r="1"
      />

      <circle
        cx="19"
        cy="12"
        r="1"
      />
    </svg>
  );
}

function Icon({
  icon,
}: {
  icon: MobileNavIcon;
}) {
  switch (icon) {
    case "dashboard":
      return <DashboardIcon />;

    case "budget":
      return <BudgetIcon />;

    case "payCycles":
      return <PayCyclesIcon />;

    case "transactions":
      return <TransactionsIcon />;

    case "accounts":
      return <AccountsIcon />;

    case "more":
      return <MoreIcon />;
  }
}

type MobileNavigationContentProps = {
  item: MobileNavItem;
  active: boolean;
};

function MobileNavigationContent({
  item,
  active,
}: MobileNavigationContentProps) {
  return (
    <>
      <div
        className={joinClassNames(
          "relative rounded-xl p-2 transition-all duration-200",
          active
            ? "bg-[var(--sidebar-active-background)] text-[var(--sidebar-active-foreground)]"
            : "text-[var(--sidebar-muted-foreground)] group-hover:bg-[var(--sidebar-hover-background)] group-hover:text-[var(--sidebar-hover-foreground)]",
        )}
      >
        <Icon
          icon={item.icon}
        />

        {item.badge !==
        undefined ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-[var(--danger-foreground)]">
            {item.badge}
          </span>
        ) : null}
      </div>

      <span
        className={joinClassNames(
          "text-[11px] font-medium transition-colors",
          active
            ? "text-[var(--sidebar-active-foreground)]"
            : "text-[var(--sidebar-muted-foreground)] group-hover:text-[var(--sidebar-hover-foreground)]",
        )}
      >
        {item.label}
      </span>

      {active ? (
        <span className="absolute left-1/2 top-0 h-1 w-10 -translate-x-1/2 rounded-b-full bg-[var(--primary)]" />
      ) : null}
    </>
  );
}

export default function MobileNav({
  activeItem,
  items = defaultItems,
  onNavigate,
}: MobileNavProps) {
  const pathname =
    usePathname();

  const {
    isMobileNavigationOpen,
    openMobileNavigation,
  } = useApp();

  function getIsActive(
    item: MobileNavItem,
  ) {
    if (
      item.id === "more"
    ) {
      return isMobileNavigationOpen;
    }

    if (
      activeItem
    ) {
      return (
        activeItem ===
        item.id
      );
    }

    return isNavigationItemActive(
      pathname,
      item,
    );
  }

  function handleNavigate(
    item: MobileNavItem,
  ) {
    onNavigate?.(
      item,
    );
  }

  function handleMoreNavigation(
    item: MobileNavItem,
  ) {
    if (
      onNavigate
    ) {
      onNavigate(
        item,
      );

      return;
    }

    openMobileNavigation();
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="safe-area-bottom border-t border-[var(--sidebar-border)] bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)] transition-colors duration-200"
    >
      <div
        className="grid h-20"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map(
          (
            item: MobileNavItem,
          ) => {
            const active =
              getIsActive(
                item,
              );

            const sharedClassName =
              joinClassNames(
                "group relative flex min-w-0 flex-col items-center justify-center gap-1 outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]",
              );

            if (
              item.id ===
                "more" ||
              item.href === "#"
            ) {
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={
                    item.label
                  }
                  aria-pressed={
                    active
                  }
                  aria-expanded={
                    item.id ===
                    "more"
                      ? isMobileNavigationOpen
                      : undefined
                  }
                  aria-haspopup={
                    item.id ===
                    "more"
                      ? "dialog"
                      : undefined
                  }
                  onClick={() => {
                    handleMoreNavigation(
                      item,
                    );
                  }}
                  className={
                    sharedClassName
                  }
                >
                  <MobileNavigationContent
                    item={item}
                    active={
                      active
                    }
                  />
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-label={
                  item.label
                }
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                onClick={() => {
                  handleNavigate(
                    item,
                  );
                }}
                className={
                  sharedClassName
                }
              >
                <MobileNavigationContent
                  item={item}
                  active={active}
                />
              </Link>
            );
          },
        )}
      </div>
    </nav>
  );
}