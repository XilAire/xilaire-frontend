import "../globals.css";

import type { ReactNode } from "react";
import CaseSidebar from "@/components/layout/CaseSidebar";
import CaseSidebarShell from "@/components/layout/CaseSidebarShell";
import CaseTopBar from "@/components/layout/CaseTopBar";
import { CaseThemeProvider } from "@/components/providers/CaseThemeProvider";
import { getProfile, type Profile } from "@/lib/getProfile";

/* -------------------------------------------------
   METADATA
------------------------------------------------- */
export const metadata = {
  title: "CASE Trades | Dashboard",
};

/* -------------------------------------------------
   LAYOUT (SERVER COMPONENT — PURE)
------------------------------------------------- */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // ---------------------------------------------------------------------------
  // SERVER-SIDE PROFILE LOAD (DEFENSIVE — TYPED)
  // ---------------------------------------------------------------------------
  let profile: Profile | undefined;

  try {
    profile = await getProfile();
  } catch {
    profile = undefined;
  }

  return (
    <CaseThemeProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 transition-colors">
        <div className="flex min-h-screen">
          {/* -------------------------------------------------
              SIDEBAR (CLIENT, MOBILE-AWARE VIA SHELL)
          ------------------------------------------------- */}
          <CaseSidebarShell>
            <CaseSidebar profile={profile} />
          </CaseSidebarShell>

          {/* -------------------------------------------------
              MAIN COLUMN
          ------------------------------------------------- */}
          <div className="flex flex-1 flex-col">
            {/* -------------------------------------------------
                TOP BAR (CLIENT)
            ------------------------------------------------- */}
            <CaseTopBar profile={profile} />

            {/* -------------------------------------------------
                PAGE CONTENT
            ------------------------------------------------- */}
            <main className="flex-1 p-6">
              <div className="mx-auto max-w-7xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </CaseThemeProvider>
  );
}
