"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

type AppShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
  topbar: ReactNode;
  footer: ReactNode;
};

export default function AppShell({
  children,
  sidebar,
  topbar,
  footer,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      setMobileOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const drawer = drawerRef.current;
    const firstFocusable = drawer?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    firstFocusable?.focus();

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const handleResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileOpen]);

  function handleDrawerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusable = Array.from(
      drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.getClientRects().length > 0);

    if (focusable.length === 0) {
      event.preventDefault();
      drawer.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleSidebarClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof Element && target.closest("a[href]")) {
      setMobileOpen(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground transition-colors">
      <div className="flex min-h-dvh min-w-0">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            tabIndex={-1}
            className="fixed inset-0 z-40 bg-slate-50/70 dark:bg-slate-950/70 md:hidden"
            onClick={() => {
              setMobileOpen(false);
              menuButtonRef.current?.focus();
            }}
          />
        )}

        <div
          ref={drawerRef}
          id="xilaire-mobile-navigation"
          role={mobileOpen ? "dialog" : undefined}
          aria-modal={mobileOpen ? true : undefined}
          aria-label={mobileOpen ? "Main navigation" : undefined}
          data-mobile-open={mobileOpen}
          tabIndex={-1}
          onKeyDown={handleDrawerKeyDown}
          onClick={handleSidebarClick}
          className={
            "fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] overflow-y-auto bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)] transition-transform duration-200 " +
            "[&>aside]:!flex [&>aside]:min-h-full " +
            "md:static md:z-auto md:w-64 md:max-w-none md:shrink-0 md:translate-x-0 md:overflow-visible md:transition-none " +
            (mobileOpen
              ? "visible translate-x-0"
              : "invisible -translate-x-full md:visible")
          }
        >
          {mobileOpen && (
            <button
              type="button"
              aria-label="Close mobile menu"
              onClick={() => {
                setMobileOpen(false);
                menuButtonRef.current?.focus();
              }}
              className="absolute right-2 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 md:hidden"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          {sidebar}
        </div>

        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <div className="relative min-w-0">
            <div className="absolute left-2 top-1/2 z-40 -translate-y-1/2 md:hidden">
              <button
                ref={menuButtonRef}
                type="button"
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
                aria-controls="xilaire-mobile-navigation"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--accent)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-w-0 [&>header>div]:pl-14 md:[&>header>div]:pl-5 lg:[&>header>div]:pl-6">
              {topbar}
            </div>
          </div>

          <main className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">
            <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
              {children}
            </div>
          </main>

          {footer}
        </div>


      </div>
    </div>
  );
}
