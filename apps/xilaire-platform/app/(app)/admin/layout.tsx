import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { createServerSupabaseClientReadOnly } from "@/lib/supabaseServerReadOnly";
import AppThemeWrapper from "@/app/(app)/theme-wrapper";

/**
 * Admin layout
 * - Authenticated users only
 * - NO role enforcement here
 * - Prevents redirect race conditions
 * - Enables dark mode via AppThemeWrapper
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabaseClientReadOnly();

  /* ----------------------------------------
     AUTH ONLY
  ---------------------------------------- */
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/signin");
  }

  /* ----------------------------------------
     OPTIONAL PROFILE WARMUP (NON-BLOCKING)
  ---------------------------------------- */
  try {
    await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .limit(1);
  } catch {
    // Never block admin layout
  }

  /* ----------------------------------------
     THEME CONTEXT (DARK MODE)
  ---------------------------------------- */
  return (
    <AppThemeWrapper>
      {children}
    </AppThemeWrapper>
  );
}