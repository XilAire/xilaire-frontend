import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank < 1) {
    redirect("/auth/signin");
  }

  return <>{children}</>;
}