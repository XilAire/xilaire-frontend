import "../globals.css";
import "react-datepicker/dist/react-datepicker.css";

import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
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
      {/* CLIENT AUTH CONTEXT */}
      <AdminShell>
        <AppShell
          sidebar={
            <AppSidebar
              profile={profile}
              counts={counts}
              monitoringCounts={monitoringCounts}
            />
          }
          topbar={<AppTopbar profile={profile} />}
          footer={<MainFooter />}
        >
          {children}
        </AppShell>
      </AdminShell>
    </AppThemeWrapper>
  );
}