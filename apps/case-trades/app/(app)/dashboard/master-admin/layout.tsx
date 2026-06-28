import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

export const dynamic = "force-dynamic";

export default async function MasterAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const role = await resolveCurrentUserRole();

  /* -------------------------------------------------
     MASTER ADMIN ACCESS ONLY (rank === 4)
  ------------------------------------------------- */
  if (!role || role.role_rank !== 4) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
