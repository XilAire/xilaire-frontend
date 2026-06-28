import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const role = await resolveCurrentUserRole();

  /* -------------------------------------------------
     ADMIN ACCESS (rank >= 2)
  ------------------------------------------------- */
if (role.role_rank !== 3) {
  redirect("/dashboard");
}


  return <>{children}</>;
}
