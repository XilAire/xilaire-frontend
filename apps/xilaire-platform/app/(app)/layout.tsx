import "../globals.css";
import "react-datepicker/dist/react-datepicker.css";

import type { ReactNode } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppTopbar from "@/components/layout/AppTopbar";
import MainFooter from "@/components/layout/MainFooter";
import { getProfile } from "@/lib/getProfile";
import { getHelpdeskCounts } from "@/lib/getHelpdeskCounts";
import AppThemeWrapper from "./theme-wrapper";
import AdminShell from "@/components/providers/AdminShell";
import "@/styles/react-datepicker-dark.css";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // ✅ SERVER-SIDE AUTH (UNCHANGED)
  const profile = await getProfile();
  const counts = await getHelpdeskCounts();

  // ✅ REQUIRED BY AppSidebar (Option A)
  const monitoringCounts = {
    endpoints: 0,
    telemetryStale: 0,
  };

  return (
    <AppThemeWrapper>
      {/* ✅ CLIENT AUTH CONTEXT STARTS HERE */}
      <AdminShell>
        <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
          <div className="flex min-h-screen">
            {/* SIDEBAR */}
            <AppSidebar
              profile={profile}
              counts={counts}
              monitoringCounts={monitoringCounts}
            />

            {/* MAIN COLUMN */}
            <div className="flex flex-1 flex-col">
              {/* TOPBAR */}
              <AppTopbar profile={profile} />

              {/* PAGE CONTENT */}
              <main className="flex-1 p-6">
                <div className="mx-auto max-w-7xl space-y-6">
                  {children}
                </div>
              </main>

              {/* FOOTER */}
              <MainFooter />
            </div>
          </div>
        </div>
      </AdminShell>
    </AppThemeWrapper>
  );
}