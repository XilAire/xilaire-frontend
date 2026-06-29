import type { ReactNode } from "react";
import HelpdeskLayoutClient from "./HelpdeskLayoutClient";
import { getProfile } from "@/lib/getProfile";
import AppThemeWrapper from "../(app)/theme-wrapper"; // 🔥 FIX: import ThemeProvider wrapper

export default async function HelpdeskLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Fetch logged-in profile on the server
  const profile = await getProfile();

  return (
    <AppThemeWrapper>
      <HelpdeskLayoutClient profile={profile}>
        {children}
      </HelpdeskLayoutClient>
    </AppThemeWrapper>
  );
}
