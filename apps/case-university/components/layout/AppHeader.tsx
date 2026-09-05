"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  signOutAction,
} from "@/app/actions/auth";

import {
  getUniversityTopBarBootstrapAction,
  markAllUniversityNotificationsReadAction,
  markUniversityNotificationReadAction,
  searchUniversityTopBarAction,
} from "@/app/actions/university-top-bar";

import {
  updateUniversityThemePreferenceAction,
} from "@/app/actions/university-profile-settings";

import NavigationControls from "@/components/layout/NavigationControls";

import {
  useUniversityTheme,
} from "@/components/providers/UniversityThemeProvider";

import type {
  UniversityNotification,
  UniversityNotificationFeed,
  UniversityTopBarSearchResult,
} from "@/lib/university/top-bar-types";

type AppHeaderProps = {
  title?: string;
};

type OpenMenu =
  | "search"
  | "notifications"
  | "account"
  | null;

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1h-4v-.1a1.7 1.7 0 0 0-.4-1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1v-4H3a1.7 1.7 0 0 0 1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V2.9h4V3a1.7 1.7 0 0 0 .4 1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.4.3.8.6 1 .3.3.6.4 1 .4h.1v4H21a1.7 1.7 0 0 0-1 .4 1.7 1.7 0 0 0-.6 1Z" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="5" />
      <path d="m8.5 12.5-1.5 8 5-3 5 3-1.5-8" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function SearchTypeBadge({
  type,
}: {
  type: UniversityTopBarSearchResult["result_type"];
}) {
  const label =
    type === "course"
      ? "Course"
      : type === "module"
        ? "Module"
        : "Lesson";

  return (
    <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--primary)]">
      {label}
    </span>
  );
}

function notificationTypeLabel(
  notification: UniversityNotification,
) {
  return notification.notification_type
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

function formatRelativeTime(
  value: string,
) {
  const date =
    new Date(value);

  const diff =
    Date.now() -
    date.getTime();

  if (
    !Number.isFinite(diff)
  ) {
    return "";
  }

  const minutes =
    Math.max(
      0,
      Math.floor(
        diff / 60000,
      ),
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24,
    );

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
    },
  ).format(date);
}

export default function AppHeader({
  title = "CASE University",
}: AppHeaderProps) {
  const router =
    useRouter();

  const {
    resolvedTheme,
    toggleTheme,
  } =
    useUniversityTheme();

  const [
    openMenu,
    setOpenMenu,
  ] =
    useState<OpenMenu>(
      null,
    );

  const [
    isSigningOut,
    setIsSigningOut,
  ] =
    useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  const [
    searchResults,
    setSearchResults,
  ] =
    useState<
      UniversityTopBarSearchResult[]
    >([]);

  const [
    searchLoading,
    setSearchLoading,
  ] =
    useState(false);

  const [
    searchError,
    setSearchError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    notifications,
    setNotifications,
  ] =
    useState<UniversityNotificationFeed>({
      unread_count: 0,
      items: [],
    });

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] =
    useState(true);

  const [
    notificationsError,
    setNotificationsError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    displayName,
    setDisplayName,
  ] =
    useState(
      "CASE Account",
    );

  const [
    email,
    setEmail,
  ] =
    useState<string | null>(
      null,
    );

  const headerMenuRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const searchInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  useEffect(
    () => {
      let cancelled =
        false;

      getUniversityTopBarBootstrapAction()
        .then(
          (bootstrap) => {
            if (cancelled) {
              return;
            }

            setDisplayName(
              bootstrap.display_name,
            );

            setEmail(
              bootstrap.email,
            );

            setNotifications(
              bootstrap.notifications,
            );

            setNotificationsError(
              null,
            );
          },
        )
        .catch(
          (error: unknown) => {
            if (cancelled) {
              return;
            }

            console.error(
              "Unable to load CASE University top bar",
              error,
            );

            setNotificationsError(
              "Unable to load notifications.",
            );
          },
        )
        .finally(
          () => {
            if (!cancelled) {
              setNotificationsLoading(
                false,
              );
            }
          },
        );

      return () => {
        cancelled =
          true;
      };
    },
    [],
  );

  useEffect(
    () => {
      if (
        openMenu !== "search"
      ) {
        return;
      }

      const timer =
        window.setTimeout(
          () => {
            searchInputRef.current?.focus();
          },
          20,
        );

      return () => {
        window.clearTimeout(
          timer,
        );
      };
    },
    [
      openMenu,
    ],
  );

  useEffect(
    () => {
      if (
        openMenu !== "search"
      ) {
        return;
      }

      const normalized =
        searchQuery.trim();

      if (
        normalized.length <
        2
      ) {
        setSearchResults(
          [],
        );

        setSearchLoading(
          false,
        );

        setSearchError(
          null,
        );

        return;
      }

      let cancelled =
        false;

      const timer =
        window.setTimeout(
          () => {
            setSearchLoading(
              true,
            );

            setSearchError(
              null,
            );

            searchUniversityTopBarAction(
              normalized,
            )
              .then(
                (results) => {
                  if (
                    !cancelled
                  ) {
                    setSearchResults(
                      results,
                    );
                  }
                },
              )
              .catch(
                (error: unknown) => {
                  if (
                    cancelled
                  ) {
                    return;
                  }

                  console.error(
                    "Unable to search CASE University",
                    error,
                  );

                  setSearchResults(
                    [],
                  );

                  setSearchError(
                    "Search is temporarily unavailable.",
                  );
                },
              )
              .finally(
                () => {
                  if (
                    !cancelled
                  ) {
                    setSearchLoading(
                      false,
                    );
                  }
                },
              );
          },
          250,
        );

      return () => {
        cancelled =
          true;

        window.clearTimeout(
          timer,
        );
      };
    },
    [
      searchQuery,
      openMenu,
    ],
  );

  useEffect(
    () => {
      if (
        openMenu === null
      ) {
        return;
      }

      function handlePointerDown(
        event: MouseEvent,
      ) {
        if (
          headerMenuRef.current &&
          !headerMenuRef.current.contains(
            event.target as Node,
          )
        ) {
          setOpenMenu(
            null,
          );
        }
      }

      function handleKeyDown(
        event: KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          setOpenMenu(
            null,
          );
        }

        if (
          (
            event.ctrlKey ||
            event.metaKey
          ) &&
          event.key.toLowerCase() ===
            "k"
        ) {
          event.preventDefault();

          setOpenMenu(
            "search",
          );
        }
      }

      document.addEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handlePointerDown,
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      openMenu,
    ],
  );

  useEffect(
    () => {
      function handleSearchShortcut(
        event: KeyboardEvent,
      ) {
        if (
          (
            event.ctrlKey ||
            event.metaKey
          ) &&
          event.key.toLowerCase() ===
            "k"
        ) {
          event.preventDefault();

          setOpenMenu(
            "search",
          );
        }
      }

      document.addEventListener(
        "keydown",
        handleSearchShortcut,
      );

      return () => {
        document.removeEventListener(
          "keydown",
          handleSearchShortcut,
        );
      };
    },
    [],
  );

  async function handleThemeToggle() {
    const nextTheme =
      toggleTheme();

    try {
      await updateUniversityThemePreferenceAction(
        nextTheme,
      );
    } catch (error) {
      console.error(
        "Unable to persist CASE University theme preference",
        error,
      );
    }
  }

  async function handleNotificationOpen(
    notification: UniversityNotification,
  ) {
    if (
      notification.read_at ===
      null
    ) {
      setNotifications(
        (current) => ({
          unread_count:
            Math.max(
              0,
              current.unread_count -
                1,
            ),

          items:
            current.items.map(
              (item) =>
                item.id ===
                notification.id
                  ? {
                      ...item,
                      read_at:
                        new Date().toISOString(),
                    }
                  : item,
            ),
        }),
      );

      try {
        await markUniversityNotificationReadAction(
          notification.id,
        );
      } catch (error) {
        console.error(
          "Unable to mark notification read",
          error,
        );
      }
    }

    if (
      notification.href
    ) {
      setOpenMenu(
        null,
      );

      router.push(
        notification.href,
      );
    }
  }

  async function handleMarkAllRead() {
    const unread =
      notifications.unread_count;

    if (
      unread <= 0
    ) {
      return;
    }

    const now =
      new Date().toISOString();

    setNotifications(
      (current) => ({
        unread_count: 0,
        items:
          current.items.map(
            (item) => ({
              ...item,
              read_at:
                item.read_at ??
                now,
            }),
          ),
      }),
    );

    try {
      await markAllUniversityNotificationsReadAction();
    } catch (error) {
      console.error(
        "Unable to mark all notifications read",
        error,
      );
    }
  }

  function handleSearchResultOpen(
    result: UniversityTopBarSearchResult,
  ) {
    setOpenMenu(
      null,
    );

    setSearchQuery(
      "",
    );

    setSearchResults(
      [],
    );

    router.push(
      result.href,
    );
  }

  async function handleSignOut() {
    if (
      isSigningOut
    ) {
      return;
    }

    setIsSigningOut(
      true,
    );

    setOpenMenu(
      null,
    );

    try {
      await signOutAction();
    } catch (error) {
      if (
        !isNextRedirectError(
          error,
        )
      ) {
        console.error(
          "Unable to sign out of CASE University",
          error,
        );

        setIsSigningOut(
          false,
        );
      }
    }
  }

  const isDark =
    resolvedTheme ===
    "dark";

  const unreadBadge =
    useMemo(
      () =>
        notifications.unread_count >
        99
          ? "99+"
          : String(
              notifications.unread_count,
            ),
      [
        notifications.unread_count,
      ],
    );

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[color:var(--surface-default)] shadow-[0_1px_0_rgb(15_23_42_/_0.02)] transition-colors duration-200">
      <div className="mx-auto flex min-h-20 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <NavigationControls />

          <div className="hidden h-8 w-px shrink-0 bg-[var(--border-subtle)] sm:block" aria-hidden="true" />

          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">
              {title}
            </p>

            <p className="hidden truncate text-xs font-medium text-[var(--text-muted)] md:block">
              Learn. Practice. Build confidence.
            </p>
          </div>
        </div>

        <div
          ref={headerMenuRef}
          className="relative flex shrink-0 items-center gap-2"
        >
          <button
            type="button"
            onClick={() =>
              setOpenMenu(
                (current) =>
                  current ===
                  "search"
                    ? null
                    : "search",
              )
            }
            aria-expanded={
              openMenu ===
              "search"
            }
            aria-haspopup="dialog"
            className="hidden h-10 min-w-[180px] items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-left text-sm font-semibold text-[var(--text-muted)] outline-none transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] md:flex xl:min-w-[240px]"
          >
            <SearchIcon />

            <span className="flex-1 truncate">
              Search University
            </span>

            <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-muted)]">
              Ctrl K
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setOpenMenu(
                (current) =>
                  current ===
                  "search"
                    ? null
                    : "search",
              )
            }
            aria-label="Search CASE University"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)] outline-none transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] md:hidden"
          >
            <SearchIcon />
          </button>

          <button
            type="button"
            onClick={() =>
              setOpenMenu(
                (current) =>
                  current ===
                  "notifications"
                    ? null
                    : "notifications",
              )
            }
            aria-label="Notifications"
            aria-haspopup="dialog"
            aria-expanded={
              openMenu ===
              "notifications"
            }
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)] outline-none transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <BellIcon />

            {notifications.unread_count >
            0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[9px] font-black text-[var(--primary-foreground)]">
                {unreadBadge}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={
              handleThemeToggle
            }
            aria-label={
              isDark
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            title={
              isDark
                ? "Light mode"
                : "Dark mode"
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)] outline-none transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            {isDark ? (
              <SunIcon />
            ) : (
              <MoonIcon />
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setOpenMenu(
                (current) =>
                  current ===
                  "account"
                    ? null
                    : "account",
              )
            }
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={
              openMenu ===
              "account"
            }
            disabled={
              isSigningOut
            }
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--primary-soft)] px-2.5 text-[var(--primary)] outline-none transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserIcon />

            <span className={`transition-transform duration-150 ${openMenu === "account" ? "rotate-180" : ""}`}>
              <ChevronDownIcon />
            </span>
          </button>

          {openMenu ===
          "search" ? (
            <div
              role="dialog"
              aria-label="Search CASE University"
              className="fixed left-4 right-4 top-[5.5rem] z-50 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-default)] shadow-[var(--shadow-lg)] sm:left-auto sm:right-6 sm:w-[520px] lg:right-8"
            >
              <div className="border-b border-[var(--border-subtle)] p-3">
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-3">
                  <SearchIcon />

                  <input
                    ref={searchInputRef}
                    value={
                      searchQuery
                    }
                    onChange={(
                      event,
                    ) =>
                      setSearchQuery(
                        event.target.value,
                      )
                    }
                    placeholder="Search courses, modules, and lessons..."
                    className="min-h-11 min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div className="max-h-[min(65vh,520px)] overflow-y-auto p-2">
                {searchQuery.trim()
                  .length < 2 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      Search CASE University
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      Enter at least two characters to search published course, module, and lesson metadata.
                    </p>
                  </div>
                ) : searchLoading ? (
                  <div className="px-4 py-8 text-center text-sm font-semibold text-[var(--text-muted)]">
                    Searching...
                  </div>
                ) : searchError ? (
                  <div className="px-4 py-8 text-center text-sm font-semibold text-red-600 dark:text-red-400">
                    {searchError}
                  </div>
                ) : searchResults.length ===
                  0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      No results found
                    </p>

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Try another course, module, or lesson name.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map(
                      (result) => (
                        <button
                          key={`${result.result_type}:${result.entity_id}`}
                          type="button"
                          onClick={() =>
                            handleSearchResultOpen(
                              result,
                            )
                          }
                          className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <SearchTypeBadge
                                type={
                                  result.result_type
                                }
                              />

                              <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                                {result.title}
                              </p>
                            </div>

                            {result.subtitle ? (
                              <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                                {result.subtitle}
                              </p>
                            ) : null}
                          </div>

                          <span className="shrink-0 text-[var(--text-muted)] transition group-hover:text-[var(--primary)]">
                            <ArrowRightIcon />
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {openMenu ===
          "notifications" ? (
            <div
              role="dialog"
              aria-label="Notifications"
              className="fixed left-4 right-4 top-[5.5rem] z-50 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-default)] shadow-[var(--shadow-lg)] sm:left-auto sm:right-6 sm:w-[420px] lg:right-8"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                <div>
                  <p className="text-sm font-black text-[var(--text-primary)]">
                    Notifications
                  </p>

                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {notifications.unread_count} unread
                  </p>
                </div>

                {notifications.unread_count >
                0 ? (
                  <button
                    type="button"
                    onClick={
                      handleMarkAllRead
                    }
                    className="text-xs font-bold text-[var(--primary)] hover:underline"
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>

              <div className="max-h-[min(65vh,520px)] overflow-y-auto p-2">
                {notificationsLoading ? (
                  <div className="px-4 py-8 text-center text-sm font-semibold text-[var(--text-muted)]">
                    Loading notifications...
                  </div>
                ) : notificationsError ? (
                  <div className="px-4 py-8 text-center text-sm font-semibold text-red-600 dark:text-red-400">
                    {notificationsError}
                  </div>
                ) : notifications.items.length ===
                  0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      You're all caught up
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      Course, lesson, Practice, assessment, certificate, and system updates will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.items.map(
                      (notification) => (
                        <button
                          key={
                            notification.id
                          }
                          type="button"
                          onClick={() =>
                            handleNotificationOpen(
                              notification,
                            )
                          }
                          className={[
                            "relative w-full rounded-xl px-3 py-3 text-left outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                            notification.read_at ===
                            null
                              ? "bg-[var(--primary-soft)]"
                              : "",
                          ].join(" ")}
                        >
                          {notification.read_at ===
                          null ? (
                            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[var(--primary)]" />
                          ) : null}

                          <div className="pr-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--primary)]">
                                {notificationTypeLabel(
                                  notification,
                                )}
                              </span>

                              <span className="text-[10px] text-[var(--text-muted)]">
                                {formatRelativeTime(
                                  notification.created_at,
                                )}
                              </span>
                            </div>

                            <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                              {notification.title}
                            </p>

                            {notification.body ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
                                {notification.body}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {openMenu ===
          "account" ? (
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-72 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-default)] p-2 shadow-[var(--shadow-lg)]"
            >
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-black text-[var(--text-primary)]">
                  {displayName}
                </p>

                {email ? (
                  <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                    {email}
                  </p>
                ) : null}
              </div>

              <div className="my-1 h-px bg-[var(--border-subtle)]" aria-hidden="true" />

              <AccountLink
                href="/profile"
                label="Profile"
                icon={<UserIcon />}
                onNavigate={() =>
                  setOpenMenu(
                    null,
                  )
                }
              />

              <AccountLink
                href="/settings"
                label="Account settings"
                icon={<SettingsIcon />}
                onNavigate={() =>
                  setOpenMenu(
                    null,
                  )
                }
              />

              <AccountLink
                href="/certificates"
                label="Certificates"
                icon={<CertificateIcon />}
                onNavigate={() =>
                  setOpenMenu(
                    null,
                  )
                }
              />

              <div className="my-1 h-px bg-[var(--border-subtle)]" aria-hidden="true" />

              <button
                type="button"
                role="menuitem"
                onClick={
                  handleSignOut
                }
                disabled={
                  isSigningOut
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 outline-none transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <SignOutIcon />

                <span>
                  {isSigningOut
                    ? "Signing out..."
                    : "Sign out"}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function AccountLink({
  href,
  label,
  icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={
        onNavigate
      }
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--text-secondary)] outline-none transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function isNextRedirectError(
  error: unknown,
) {
  if (
    typeof error !==
      "object" ||
    error ===
      null
  ) {
    return false;
  }

  const digest =
    "digest" in error
      ? (
          error as {
            digest?: unknown;
          }
        ).digest
      : undefined;

  return (
    typeof digest ===
      "string" &&
    digest.startsWith(
      "NEXT_REDIRECT",
    )
  );
}
