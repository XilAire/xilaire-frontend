"use client";

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
  return (
    <header
      className="
        flex items-center justify-between
        border-b border-slate-800
        bg-slate-900/95
        backdrop-blur px-4 py-3 transition-colors
      "
    >
      {/* LEFT — TITLE / SUBTITLE */}
      <div>
        <h1 className="text-lg font-semibold text-slate-100">
          {title}
        </h1>

        {subtitle && (
          <p className="text-xs text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {/* RIGHT — USER MENU */}
      <div className="flex items-center gap-3">
        <CaseUserMenu profile={profile} />
      </div>
    </header>
  );
}
