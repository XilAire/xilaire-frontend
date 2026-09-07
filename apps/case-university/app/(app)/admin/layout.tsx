import type {
  ReactNode,
} from "react";

import {
  redirect,
} from "next/navigation";

import {
  getCurrentUniversityAdminContext,
} from "@/lib/university/admin-permissions";

export const dynamic =
  "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const {
    permissions,
  } =
    await getCurrentUniversityAdminContext();

  if (
    !permissions.canAccessAdmin
  ) {
    redirect(
      "/dashboard",
    );
  }

  return <>{children}</>;
}
