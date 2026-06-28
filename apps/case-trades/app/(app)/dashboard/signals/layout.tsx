import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

/* -------------------------------------------------
   SIGNALS LAYOUT
   - Applies to /dashboard/signals/**
   - Read access: authenticated users
   - Write access: enforced inside pages/actions
------------------------------------------------- */
export const dynamic = "force-dynamic";

export default async function SignalsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const role = await resolveCurrentUserRole();

  /* -------------------------------------------------
     AUTH GUARD
     Any authenticated user (rank >= 1)
  ------------------------------------------------- */
  if (!role || role.role_rank < 1) {
    redirect("/auth/signin");
  }

  /* -------------------------------------------------
     IMPORTANT
     - UI shell is handled by dashboard layout
     - This layout ONLY handles access
     - No role branching here (enterprise pattern)
  ------------------------------------------------- */
  return <>{children}</>;
}
