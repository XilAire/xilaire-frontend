import type {
  Metadata,
} from "next";
import {
  redirect,
} from "next/navigation";

import AdminUsersPage from "@/components/admin/users/AdminUsersPage";

import {
  getCurrentUniversityAdminContext,
} from "@/lib/university/admin-permissions";

import type {
  AdminUniversityPlanFilter,
  AdminUniversityRoleFilter,
  AdminUniversityUserStatusFilter,
} from "@/lib/university/admin-users";

export const metadata: Metadata = {
  title:
    "Users | CASE University Admin",
};

export const dynamic =
  "force-dynamic";

type SearchParams = {
  search?:
    | string
    | string[];

  plan?:
    | string
    | string[];

  role?:
    | string
    | string[];

  status?:
    | string
    | string[];

  page?:
    | string
    | string[];

  pageSize?:
    | string
    | string[];
};

type AdminUsersRouteProps = {
  searchParams:
    | Promise<SearchParams>
    | SearchParams;
};

function firstValue(
  value:
    | string
    | string[]
    | undefined,
): string | undefined {
  return Array.isArray(
    value,
  )
    ? value[0]
    : value;
}

export default async function AdminUsersRoute({
  searchParams,
}: AdminUsersRouteProps) {
  const viewer =
    await getCurrentUniversityAdminContext();

  if (
    !viewer.permissions
      .canViewUsers
  ) {
    redirect(
      "/dashboard",
    );
  }

  const resolvedSearchParams =
    await Promise.resolve(
      searchParams,
    );

  return (
    <AdminUsersPage
      query={{
        search:
          firstValue(
            resolvedSearchParams.search,
          ),

        plan:
          firstValue(
            resolvedSearchParams.plan,
          ) as
            | AdminUniversityPlanFilter
            | undefined,

        role:
          firstValue(
            resolvedSearchParams.role,
          ) as
            | AdminUniversityRoleFilter
            | undefined,

        status:
          firstValue(
            resolvedSearchParams.status,
          ) as
            | AdminUniversityUserStatusFilter
            | undefined,

        page:
          Number(
            firstValue(
              resolvedSearchParams.page,
            ) ?? 1,
          ),

        pageSize:
          Number(
            firstValue(
              resolvedSearchParams.pageSize,
            ) ?? 25,
          ),
      }}
    />
  );
}
