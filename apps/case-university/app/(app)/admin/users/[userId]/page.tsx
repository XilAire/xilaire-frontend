import type {
  Metadata,
} from "next";
import {
  notFound,
  redirect,
} from "next/navigation";

import AdminUserDetails from "@/components/admin/users/AdminUserDetails";
import {
  getAdminUniversityUserById,
} from "@/lib/university/admin-users";

import {
  getCurrentUniversityAdminContext,
} from "@/lib/university/admin-permissions";

export const metadata: Metadata = {
  title:
    "User Details | CASE University Admin",
};

export const dynamic =
  "force-dynamic";

type AdminUserRouteProps = {
  params:
    | Promise<{
        userId: string;
      }>
    | {
        userId: string;
      };
};

export default async function AdminUserRoute({
  params,
}: AdminUserRouteProps) {
  const viewer =
    await getCurrentUniversityAdminContext();

  if (
    !viewer.permissions
      .canViewUserDetails
  ) {
    redirect(
      "/dashboard",
    );
  }

  const {
    userId,
  } =
    await Promise.resolve(
      params,
    );

  const user =
    await getAdminUniversityUserById(
      userId,
    );

  if (!user) {
    notFound();
  }

  return (
    <AdminUserDetails
      user={user}
      viewer={viewer}
    />
  );
}
