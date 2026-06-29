"use client";

import { Menu } from "lucide-react";

import type { Profile } from "@/lib/getProfile";
import CaseUserMenu from "@/components/layout/CaseUserMenu";

type CaseTopBarProps = {
  title?: string;
  subtitle?: string;
  profile?: Profile;
};

export default function CaseTopBar({
  title = "Dashboard",
  subtitle = "Trading intelligence and performance overview.",
  profile,
}: CaseTopBarProps) {
  function handleMobileMenuOpen() {
    window.dispatchEvent(new Event("case:toggle-sidebar"));
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur transition-colors">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={handleMobileMenuOpen}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-100 transition hover:bg-slate-700 active:scale-95 md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-100 sm:text-lg">
            {title}
          </h1>

          {subtitle && (
            <p className="hidden truncate text-xs text-slate-400 sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <CaseUserMenu profile={profile} />
      </div>
    </header>
  );
}