import AdminUsersHeader from "@/components/admin/users/AdminUsersHeader";
import AdminUsersPagination from "@/components/admin/users/AdminUsersPagination";
import AdminUsersStats from "@/components/admin/users/AdminUsersStats";
import AdminUsersTable from "@/components/admin/users/AdminUsersTable";
import AdminUsersToolbar from "@/components/admin/users/AdminUsersToolbar";

import {
  getAdminUniversityUsers,
  type AdminUsersQuery,
} from "@/lib/university/admin-users";

type AdminUsersPageProps = {
  query: AdminUsersQuery;
};

export default async function AdminUsersPage({
  query,
}: AdminUsersPageProps) {
  const result =
    await getAdminUniversityUsers(
      query,
    );

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-[1600px]
        space-y-5
        px-4
        py-6
        sm:px-6
        sm:py-8
        lg:px-8
      "
    >
      <AdminUsersHeader />

      <AdminUsersStats
        stats={result.stats}
      />

      <AdminUsersToolbar
        search={
          result.filters.search
        }
        plan={
          result.filters.plan
        }
        role={
          result.filters.role
        }
        status={
          result.filters.status
        }
        resultCount={
          result.pagination
            .totalItems
        }
      />

      <AdminUsersTable
        users={result.users}
      />

      <AdminUsersPagination
        page={
          result.pagination.page
        }
        pageSize={
          result.pagination
            .pageSize
        }
        totalItems={
          result.pagination
            .totalItems
        }
        totalPages={
          result.pagination
            .totalPages
        }
        search={
          result.filters.search
        }
        plan={
          result.filters.plan
        }
        role={
          result.filters.role
        }
        status={
          result.filters.status
        }
      />
    </div>
  );
}
