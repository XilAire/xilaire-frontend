"use client";

import type {
  ReactNode,
} from "react";

import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import Sidebar from "@/components/layout/Sidebar";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  canManageUniversity?: boolean;
};

export default function AppShell({
  children,
  title = "CASE University",
  canManageUniversity = false,
}: AppShellProps) {
  return (
    <div
      className="
        min-h-dvh
        bg-[var(--background)]
        text-[var(--text-primary)]
        transition-colors
        duration-200
      "
    >
      <div
        className="
          min-h-dvh
          lg:grid
          lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]
        "
      >
        {/* ==================================================
            DESKTOP SIDEBAR
            ================================================== */}

        <div
          className="
            hidden
            border-r
            border-[var(--sidebar-border)]
            bg-[var(--sidebar-background)]
            lg:sticky
            lg:top-0
            lg:block
            lg:h-dvh
            lg:self-start
          "
        >
          <Sidebar
            canManageUniversity={canManageUniversity}
          />
        </div>

        {/* ==================================================
            APPLICATION CONTENT
            ================================================== */}

        <div
          className="
            flex
            min-h-dvh
            min-w-0
            flex-col
          "
        >
          <AppHeader
            title={
              title
            }
          />

          <main
            className="
              min-w-0
              flex-1
              pb-24
              lg:pb-0
            "
          >
            {children}
          </main>
        </div>
      </div>

      {/* ==================================================
          MOBILE NAVIGATION
          ================================================== */}

      <div
        className="
          fixed
          inset-x-0
          bottom-0
          z-50
          lg:hidden
        "
      >
        <MobileNav />
      </div>
    </div>
  );
}
