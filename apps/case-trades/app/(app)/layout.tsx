import "../globals.css";

import type { ReactNode } from "react";
import CaseSidebar from "@/components/layout/CaseSidebar";
import CaseSidebarShell from "@/components/layout/CaseSidebarShell";
import CaseTopBar from "@/components/layout/CaseTopBar";
import { CaseThemeProvider } from "@/components/providers/CaseThemeProvider";
import { getProfile, type Profile } from "@/lib/getProfile";

export const metadata = {
  title: "CASE Trades",
};

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  let profile: Profile | undefined;

  try {
    profile = await getProfile();
  } catch {
    profile = undefined;
  }

  return (
    <CaseThemeProvider>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 transition-colors">
        <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
          <CaseSidebarShell>
            <CaseSidebar profile={profile} />
          </CaseSidebarShell>

          <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden">
            <CaseTopBar profile={profile} />

            <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </CaseThemeProvider>
  );
}