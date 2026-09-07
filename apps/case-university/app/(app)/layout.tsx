import type { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import UniversityThemeProvider, {
  type UniversityTheme,
} from "@/components/providers/UniversityThemeProvider";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    currentUserRole,
    profileSettings,
  ] = user
    ? await Promise.all([
        resolveCurrentUserRole(),
        getCurrentUserProfileSettings(),
      ])
    : [null, null];

  const canManageUniversity =
    currentUserRole?.role_name ===
      "master_admin" ||
    Number(
      currentUserRole?.role_rank ??
        0,
    ) >= 4;

  const initialTheme =
    normalizeTheme(
      profileSettings?.profile.theme,
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