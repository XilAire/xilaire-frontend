import type { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import UniversityThemeProvider, {
  type UniversityTheme,
} from "@/components/providers/UniversityThemeProvider";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { getCurrentUserProfileSettings } from "@/lib/university/profile-settings";

type AppLayoutProps = {
  children: ReactNode;
};

function normalizeTheme(
  value: string | null | undefined,
): UniversityTheme {
  if (
    value === "light" ||
    value === "dark" ||
    value === "system"
  ) {
    return value;
  }

  return "system";
}

export default async function AppLayout({
  children,
}: AppLayoutProps) {
  const [
    currentUserRole,
    profileSettings,
  ] =
    await Promise.all([
      resolveCurrentUserRole(),
      getCurrentUserProfileSettings(),
    ]);

  const canManageUniversity =
    currentUserRole?.role_name ===
      "master_admin" ||
    Number(
      currentUserRole?.role_rank ??
        0,
    ) >= 4;

  const initialTheme =
    normalizeTheme(
      profileSettings.profile.theme,
    );

  return (
    <UniversityThemeProvider
      initialTheme={initialTheme}
    >
      <AppShell
        canManageUniversity={
          canManageUniversity
        }
      >
        {children}
      </AppShell>
    </UniversityThemeProvider>
  );
}
