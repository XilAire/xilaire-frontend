"use client";

import type {
  ReactNode,
} from "react";

import {
  useEffect,
} from "react";

import {
  usePathname,
} from "next/navigation";

import AppOverlays from "@/components/layout/AppOverlays";
import MobileNav from "@/components/layout/MobileNav";
import Sidebar from "@/components/layout/Sidebar";

import {
  useApp,
} from "@/components/providers/AppProvider";

import type {
  CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

import type {
  CaseBudgetSubscriptionEntitlementState,
} from "@/types/subscription";

type AppShellProps = {
  children:
    ReactNode;

  sidebar?:
    ReactNode;

  topBar?:
    ReactNode;

  mobileNavigation?:
    ReactNode;

  hideSidebar?:
    boolean;

  hideMobileNavigation?:
    boolean;

  subscriptionPlan?:
    CaseBudgetPlan;

  subscriptionEntitlements?:
    CaseBudgetSubscriptionEntitlementState | null;
};

function CloseIcon() {
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
      <path d="M18 6 6 18" />

      <path d="m6 6 12 12" />
    </svg>
  );
}

export default function AppShell({
  children,
  sidebar,
  topBar,
  mobileNavigation,
  hideSidebar =
    false,
  hideMobileNavigation =
    false,
  subscriptionPlan =
    "free",
  subscriptionEntitlements =
    null,
}: AppShellProps) {
  const pathname =
    usePathname();

  const {
    isMobileNavigationOpen,
    closeMobileNavigation,
  } =
    useApp();

  /*
   * Subscription information is resolved on the server at the
   * dashboard boundary and passed into AppShell.
   *
   * AppShell then forwards the same trusted access state to every
   * navigation surface.
   *
   * We intentionally do not query Supabase from this Client Component.
   */
  const resolvedSidebar =
    sidebar ?? (
      <Sidebar
        activePath={
          pathname
        }
        subscriptionPlan={
          subscriptionPlan
        }
        subscriptionEntitlements={
          subscriptionEntitlements
        }
      />
    );

  const resolvedMobileNavigation =
    mobileNavigation ?? (
      <MobileNav />
    );

  useEffect(
    () => {
      closeMobileNavigation();
    },
    [
      closeMobileNavigation,
      pathname,
    ],
  );

  useEffect(
    () => {
      if (
        !isMobileNavigationOpen
      ) {
        document.body.style.overflow =
          "";

        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      function handleEscape(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          closeMobileNavigation();
        }
      }

      window.addEventListener(
        "keydown",
        handleEscape,
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          "keydown",
          handleEscape,
        );
      };
    },
    [
      closeMobileNavigation,
      isMobileNavigationOpen,
    ],
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-200">
      <div className="flex min-h-screen">
        {!hideSidebar ? (
          <aside className="hidden w-72 shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)] transition-colors duration-200 lg:block">
            <div className="sticky top-0 h-screen overflow-y-auto">
              {
                resolvedSidebar
              }
            </div>
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col bg-[var(--background)] transition-colors duration-200">
          {topBar ? (
            <header className="sticky top-0 z-40 border-b border-[var(--topbar-border)] bg-[var(--topbar-background)] backdrop-blur-xl transition-colors duration-200">
              {topBar}
            </header>
          ) : null}

          <main className="min-w-0 flex-1 bg-[var(--background)] pb-24 text-[var(--text-primary)] transition-colors duration-200 lg:pb-0">
            {
              children
            }
          </main>

          {!hideMobileNavigation ? (
            <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 border-t border-[var(--sidebar-border)] bg-[var(--sidebar-background)] backdrop-blur-xl transition-colors duration-200 lg:hidden">
              {
                resolvedMobileNavigation
              }
            </div>
          ) : null}
        </div>
      </div>

      {!hideSidebar &&
      isMobileNavigationOpen ? (
        <div className="fixed inset-0 z-[1200] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={
              closeMobileNavigation
            }
            className="absolute inset-0 cursor-default bg-[var(--surface-overlay)] backdrop-blur-sm"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="absolute inset-y-0 left-0 flex w-[min(88vw,320px)] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)] shadow-[var(--shadow-xl)]"
          >
            <div className="flex shrink-0 justify-end border-b border-[var(--sidebar-border)] px-4 py-3">
              <button
                type="button"
                onClick={
                  closeMobileNavigation
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-background)] text-[var(--sidebar-muted-foreground)] transition hover:bg-[var(--sidebar-hover-background)] hover:text-[var(--sidebar-hover-foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                aria-label="Close navigation menu"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {
                resolvedSidebar
              }
            </div>
          </aside>
        </div>
      ) : null}

      <AppOverlays />
    </div>
  );
}