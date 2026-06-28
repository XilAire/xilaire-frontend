import { ReactNode } from "react";
import CaseSidebar from "./CaseSidebar";
import CaseTopBar from "./CaseTopBar";
import type { Profile } from "@/lib/getProfile";

interface CaseAppShellProps {
  children: ReactNode;
  profile: Profile;
}

export default function CaseAppShell({ children, profile }: CaseAppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <CaseSidebar profile={profile} />

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <CaseTopBar profile={profile} />

        {/* Main scroll container */}
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}