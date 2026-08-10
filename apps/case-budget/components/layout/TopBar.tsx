"use client";

import type {
  ReactNode,
} from "react";

import {
  useApp,
} from "@/components/providers/AppProvider";

type TopBarProps = {
  title?: string;
  description?: string;
  workspaceName?: string;
  actions?: ReactNode;
  notificationCount?: number;
  showSearch?: boolean;
  showNotifications?: boolean;
  showQuickAdd?: boolean;
  showWorkspaceName?: boolean;
  onOpenMobileNavigation?: () => void;
  onOpenNotifications?: () => void;
  onOpenQuickAdd?: () => void;
  onOpenWorkspaceSwitcher?: () => void;
  onSearch?: () => void;
};

function MenuIcon() {
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
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
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
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function PlusIcon() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const controlClassName =
  "border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]";

export default function TopBar({
  title = "Dashboard",
  description = "Your complete financial overview.",
  workspaceName,
  actions,
  notificationCount = 0,
  showSearch = true,
  showNotifications = true,
  showQuickAdd = true,
  showWorkspaceName = true,
  onOpenMobileNavigation,
  onOpenNotifications,
  onOpenQuickAdd,
  onOpenWorkspaceSwitcher,
  onSearch,
}: TopBarProps) {
  const {
    activeWorkspace,
    openMobileNavigation,
    openNotifications,
    openQuickAdd,
    openSearch,
    openWorkspaceSwitcher,
  } = useApp();

  const resolvedWorkspaceName =
    activeWorkspace?.name ??
    workspaceName ??
    "My Workspace";

  const hasHeaderActions =
    Boolean(actions) ||
    showSearch ||
    showNotifications ||
    showQuickAdd;

  function handleOpenMobileNavigation() {
    if (
      onOpenMobileNavigation
    ) {
      onOpenMobileNavigation();

      return;
    }

    openMobileNavigation();
  }

  function handleSearch() {
    if (
      onSearch
    ) {
      onSearch();

      return;
    }

    openSearch();
  }

  function handleOpenNotifications() {
    if (
      onOpenNotifications
    ) {
      onOpenNotifications();

      return;
    }

    openNotifications();
  }

  function handleOpenQuickAdd() {
    if (
      onOpenQuickAdd
    ) {
      onOpenQuickAdd();

      return;
    }

    openQuickAdd();
  }

  function handleOpenWorkspaceSwitcher() {
    if (
      onOpenWorkspaceSwitcher
    ) {
      onOpenWorkspaceSwitcher();

      return;
    }

    openWorkspaceSwitcher();
  }

  return (
    <div className="mx-auto flex min-h-20 w-full max-w-[1600px] items-center gap-3 px-4 text-[var(--text-primary)] sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={
          handleOpenMobileNavigation
        }
        className={`pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl lg:hidden ${controlClassName}`}
        aria-label="Open navigation menu"
      >
        <MenuIcon />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-lg font-bold tracking-tight text-[var(--text-primary)] sm:text-xl">
            {title}
          </h1>

          {showWorkspaceName ? (
            <>
              <span
                className="hidden text-[var(--border-strong)] sm:inline"
                aria-hidden="true"
              >
                /
              </span>

              <button
                type="button"
                onClick={
                  handleOpenWorkspaceSwitcher
                }
                className="hidden min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:flex"
                aria-label={`Current workspace: ${resolvedWorkspaceName}`}
                aria-haspopup="dialog"
              >
                <span className="truncate">
                  {resolvedWorkspaceName}
                </span>

                <ChevronDownIcon />
              </button>
            </>
          ) : null}
        </div>

        {description ? (
          <p className="mt-0.5 hidden truncate text-sm text-[var(--text-muted)] md:block">
            {description}
          </p>
        ) : null}
      </div>

      {hasHeaderActions ? (
        <div className="flex shrink-0 items-center gap-2">
          {showSearch ? (
            <>
              <button
                type="button"
                onClick={
                  handleSearch
                }
                className={`hidden h-11 min-w-56 items-center gap-3 rounded-xl px-3 text-left text-sm xl:flex ${controlClassName}`}
                aria-label="Search CASE Budget"
                aria-haspopup="dialog"
              >
                <SearchIcon />

                <span className="flex-1">
                  Search
                </span>

                <span className="rounded-md border border-[var(--border-default)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                  ⌘K
                </span>
              </button>

              <button
                type="button"
                onClick={
                  handleSearch
                }
                className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl xl:hidden ${controlClassName}`}
                aria-label="Search CASE Budget"
                aria-haspopup="dialog"
              >
                <SearchIcon />
              </button>
            </>
          ) : null}

          {showNotifications ? (
            <button
              type="button"
              onClick={
                handleOpenNotifications
              }
              className={`pointer-events-auto relative flex h-11 w-11 items-center justify-center rounded-xl ${controlClassName}`}
              aria-label={
                notificationCount >
                0
                  ? `Open notifications. ${notificationCount} unread`
                  : "Open notifications"
              }
              aria-haspopup="dialog"
            >
              <BellIcon />

              {notificationCount >
              0 ? (
                <span className="pointer-events-none absolute right-1.5 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[9px] font-bold leading-none text-[var(--danger-foreground)] ring-2 ring-[var(--surface-default)]">
                  {notificationCount >
                  9
                    ? "9+"
                    : notificationCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {actions
            ? actions
            : null}

          {!actions &&
          showQuickAdd ? (
            <button
              type="button"
              onClick={
                handleOpenQuickAdd
              }
              className="pointer-events-auto flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] transition hover:bg-[var(--primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:px-4"
              aria-haspopup="dialog"
            >
              <PlusIcon />

              <span className="hidden sm:inline">
                Quick add
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}