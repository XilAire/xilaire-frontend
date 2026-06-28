import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const role = await resolveCurrentUserRole();

  const allowedRanks = [3, 4];

  if (!allowedRanks.includes(role.role_rank)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}