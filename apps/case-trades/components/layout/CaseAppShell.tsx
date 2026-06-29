"use client";

import { ReactNode } from "react";

import CaseSidebar from "./CaseSidebar";
import CaseSidebarShell from "./CaseSidebarShell";
import CaseTopBar from "./CaseTopBar";

import type { Profile } from "@/lib/getProfile";

interface CaseAppShellProps {
  children: ReactNode;
  profile: Profile;
}

export default function CaseAppShell({
  children,
  profile,
}: CaseAppShellProps) {
  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      <CaseSidebarShell>
        <CaseSidebar profile={profile} />
      </CaseSidebarShell>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <CaseTopBar profile={profile} />

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}