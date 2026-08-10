"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  type AppWorkspace,
  useApp,
} from "@/components/providers/AppProvider";

type QuickAddItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: QuickAddIconName;
};

type SearchResult = {
  id: string;
  title: string;
  description: string;
  href: string;
  category: string;
};

type QuickAddIconName =
  | "transaction"
  | "bill"
  | "income"
  | "goal"
  | "account"
  | "debt";

const quickAddItems: QuickAddItem[] = [
  {
    id: "transaction",
    label: "Add transaction",
    description:
      "Record a purchase, transfer, or payment.",
    href: "/dashboard/transactions/new",
    icon: "transaction",
  },
  {
    id: "income",
    label: "Add income",
    description:
      "Record a paycheck or other income.",
    href: "/dashboard/transactions/new?type=income",
    icon: "income",
  },
  {
    id: "bill",
    label: "Add bill",
    description:
      "Create a bill and set its due date.",
    href: "/dashboard/bills/new",
    icon: "bill",
  },
  {
    id: "goal",
    label: "Create savings goal",
    description:
      "Start saving toward an important goal.",
    href: "/dashboard/goals/new",
    icon: "goal",
  },
  {
    id: "account",
    label: "Add account",
    description:
      "Connect or manually add a financial account.",
    href: "/dashboard/accounts/new",
    icon: "account",
  },
  {
    id: "debt",
    label: "Add debt",
    description:
      "Track a balance and build a payoff plan.",
    href: "/dashboard/debt/new",
    icon: "debt",
  },
];

const searchResults: SearchResult[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description:
      "View your complete financial overview.",
    href: "/dashboard",
    category: "Pages",
  },
  {
    id: "budget",
    title: "Budget",
    description:
      "Plan every dollar with a zero-based budget.",
    href: "/dashboard/budget",
    category: "Pages",
  },
  {
    id: "transactions",
    title: "Transactions",
    description:
      "Review, categorize, and manage transactions.",
    href: "/dashboard/transactions",
    category: "Pages",
  },
  {
    id: "bills",
    title: "Bills",
    description:
      "Track due dates, payments, and reminders.",
    href: "/dashboard/bills",
    category: "Pages",
  },
  {
    id: "goals",
    title: "Savings Goals",
    description:
      "Track progress toward your financial goals.",
    href: "/dashboard/goals",
    category: "Pages",
  },
  {
    id: "debt",
    title: "Debt Payoff",
    description:
      "Build and manage your debt payoff strategy.",
    href: "/dashboard/debt",
    category: "Pages",
  },
  {
    id: "accounts",
    title: "Accounts",
    description:
      "Manage connected and manual accounts.",
    href: "/dashboard/accounts",
    category: "Pages",
  },
  {
    id: "reports",
    title: "Reports",
    description:
      "Analyze spending, income, and financial trends.",
    href: "/dashboard/reports",
    category: "Pages",
  },
];

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function WorkspaceIcon({
  workspace,
}: {
  workspace: AppWorkspace;
}) {
  const initials =
    workspace.name
      .trim()
      .split(
        /\s+/,
      )
      .map(
        (
          part,
        ) =>
          part.charAt(
            0,
          ),
      )
      .join(
        "",
      )
      .slice(
        0,
        2,
      )
      .toUpperCase();

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary)]">
      {initials || "CB"}
    </span>
  );
}

function QuickAddIcon({
  name,
}: {
  name:
    QuickAddIconName;
}) {
  const sharedProps = {
    width:
      22,
    height:
      22,
    viewBox:
      "0 0 24 24",
    fill:
      "none",
    stroke:
      "currentColor",
    strokeWidth:
      1.8,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
    "aria-hidden":
      true,
  };

  switch (
    name
  ) {
    case "transaction":
      return (
        <svg {...sharedProps}>
          <path d="M7 7h11" />
          <path d="m15 4 3 3-3 3" />
          <path d="M17 17H6" />
          <path d="m9 14-3 3 3 3" />
        </svg>
      );

    case "bill":
      return (
        <svg {...sharedProps}>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h3" />
        </svg>
      );

    case "income":
      return (
        <svg {...sharedProps}>
          <path d="M12 3v14" />
          <path d="m7 8 5-5 5 5" />
          <path d="M5 21h14" />
        </svg>
      );

    case "goal":
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

    case "account":
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
  }
}

export default function AppOverlays() {
  const {
    activeOverlay,
    activeWorkspaceId,
    closeOverlay,
    setActiveWorkspace,
    workspaces,
  } = useApp();

  const searchInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState(
      "",
    );

  const isOpen =
    activeOverlay ===
      "search" ||
    activeOverlay ===
      "notifications" ||
    activeOverlay ===
      "quick-add" ||
    activeOverlay ===
      "workspace";

  const filteredSearchResults =
    searchResults.filter(
      (
        result,
      ) => {
        const normalizedQuery =
          searchQuery
            .trim()
            .toLowerCase();

        if (
          !normalizedQuery
        ) {
          return true;
        }

        return (
          result.title
            .toLowerCase()
            .includes(
              normalizedQuery,
            ) ||
          result.description
            .toLowerCase()
            .includes(
              normalizedQuery,
            ) ||
          result.category
            .toLowerCase()
            .includes(
              normalizedQuery,
            )
        );
      },
    );

  useEffect(
    () => {
      if (
        activeOverlay !==
        "search"
      ) {
        setSearchQuery(
          "",
        );

        return;
      }

      const timeoutId =
        window.setTimeout(
          () => {
            searchInputRef.current?.focus();
          },
          50,
        );

      return () => {
        window.clearTimeout(
          timeoutId,
        );
      };
    },
    [
      activeOverlay,
    ],
  );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      function handleKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          closeOverlay();
        }
      }

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      closeOverlay,
      isOpen,
    ],
  );

  if (
    !isOpen
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1300]">
      <button
        type="button"
        aria-label="Close open panel"
        onClick={
          closeOverlay
        }
        className="absolute inset-0 cursor-default bg-[var(--surface-overlay)] backdrop-blur-sm"
      />

      {activeOverlay ===
      "search" ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Search CASE Budget"
          className="absolute left-1/2 top-4 flex max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-primary)] shadow-[var(--shadow-xl)] sm:top-16"
        >
          <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4">
            <span className="shrink-0 text-[var(--text-muted)]">
              <SearchIcon />
            </span>

            <input
              ref={
                searchInputRef
              }
              type="search"
              value={
                searchQuery
              }
              onChange={(
                event,
              ) => {
                setSearchQuery(
                  event.target
                    .value,
                );
              }}
              placeholder="Search pages, transactions, bills, goals..."
              className="h-16 min-w-0 flex-1 bg-transparent text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />

            <button
              type="button"
              onClick={
                closeOverlay
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label="Close search"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filteredSearchResults.length >
            0 ? (
              <div className="space-y-1">
                {filteredSearchResults.map(
                  (
                    result,
                  ) => (
                    <Link
                      key={
                        result.id
                      }
                      href={
                        result.href
                      }
                      onClick={
                        closeOverlay
                      }
                      className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                        <SearchIcon />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                          {
                            result.title
                          }
                        </span>

                        <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                          {
                            result.description
                          }
                        </span>
                      </span>

                      <span className="hidden shrink-0 text-xs font-medium text-[var(--text-muted)] sm:block">
                        {
                          result.category
                        }
                      </span>

                      <span className="shrink-0 text-[var(--text-muted)]">
                        <ChevronRightIcon />
                      </span>
                    </Link>
                  ),
                )}
              </div>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
                  <SearchIcon />
                </span>

                <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
                  No results found
                </h2>

                <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
                  Try searching for a
                  different page,
                  transaction, bill, or
                  goal.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-xs text-[var(--text-muted)]">
            Press Escape to close
          </div>
        </section>
      ) : null}

      {activeOverlay ===
      "notifications" ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-primary)] shadow-[var(--shadow-xl)]"
        >
          <div className="flex min-h-20 items-center justify-between gap-4 border-b border-[var(--border-default)] px-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Notifications
              </h2>

              <p className="text-sm text-[var(--text-muted)]">
                Updates that need your
                attention.
              </p>
            </div>

            <button
              type="button"
              onClick={
                closeOverlay
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label="Close notifications"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <BellIcon />
            </span>

            <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
              You&apos;re all caught up
            </h3>

            <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--text-muted)]">
              There are no notifications
              requiring your attention
              right now.
            </p>
          </div>

          <div className="border-t border-[var(--border-default)] p-4">
            <Link
              href="/dashboard/notifications"
              onClick={
                closeOverlay
              }
              className="flex h-11 w-full items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              View all notifications
            </Link>
          </div>
        </section>
      ) : null}

      {activeOverlay ===
      "quick-add" ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Quick add"
          className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl border-t border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-primary)] shadow-[var(--shadow-xl)] sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
        >
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-[var(--border-strong)] sm:hidden" />

          <div className="flex min-h-20 items-center justify-between gap-4 border-b border-[var(--border-default)] px-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Quick add
              </h2>

              <p className="text-sm text-[var(--text-muted)]">
                What would you like to
                add?
              </p>
            </div>

            <button
              type="button"
              onClick={
                closeOverlay
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label="Close quick add"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
            {quickAddItems.map(
              (
                item,
              ) => (
                <Link
                  key={
                    item.id
                  }
                  href={
                    item.href
                  }
                  onClick={
                    closeOverlay
                  }
                  className="group flex items-start gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-default)] p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] transition group-hover:bg-[var(--primary)] group-hover:text-[var(--primary-foreground)]">
                    <QuickAddIcon
                      name={
                        item.icon
                      }
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--text-primary)]">
                      {
                        item.label
                      }
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                      {
                        item.description
                      }
                    </span>
                  </span>
                </Link>
              ),
            )}
          </div>
        </section>
      ) : null}

      {activeOverlay ===
      "workspace" ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Switch workspace"
          className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl border-t border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-primary)] shadow-[var(--shadow-xl)] sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
        >
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-[var(--border-strong)] sm:hidden" />

          <div className="flex min-h-20 items-center justify-between gap-4 border-b border-[var(--border-default)] px-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Switch workspace
              </h2>

              <p className="text-sm text-[var(--text-muted)]">
                Choose the finances you
                want to manage.
              </p>
            </div>

            <button
              type="button"
              onClick={
                closeOverlay
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label="Close workspace switcher"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            {workspaces.map(
              (
                workspace,
              ) => {
                const isActive =
                  workspace.id ===
                  activeWorkspaceId;

                return (
                  <button
                    key={
                      workspace.id
                    }
                    type="button"
                    onClick={() => {
                      setActiveWorkspace(
                        workspace.id,
                      );
                    }}
                    className={[
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : "border-[var(--border-default)] bg-[var(--surface-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
                    ].join(
                      " ",
                    )}
                  >
                    <WorkspaceIcon
                      workspace={
                        workspace
                      }
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                        {
                          workspace.name
                        }
                      </span>

                      <span className="mt-0.5 block text-xs capitalize text-[var(--text-muted)]">
                        {
                          workspace.type
                        }

                        {workspace.memberCount
                          ? ` · ${workspace.memberCount} ${
                              workspace.memberCount ===
                              1
                                ? "member"
                                : "members"
                            }`
                          : ""}
                      </span>
                    </span>

                    {isActive ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">
                        <CheckIcon />
                      </span>
                    ) : (
                      <span className="shrink-0 text-[var(--text-muted)]">
                        <ChevronRightIcon />
                      </span>
                    )}
                  </button>
                );
              },
            )}
          </div>

          <div className="border-t border-[var(--border-default)] p-4">
            <Link
              href="/dashboard/settings/workspaces"
              onClick={
                closeOverlay
              }
              className="flex h-11 w-full items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Manage workspaces
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}