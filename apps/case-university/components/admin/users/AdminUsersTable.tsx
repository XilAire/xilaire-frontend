import AdminUserRow from "@/components/admin/users/AdminUserRow";

import type {
  AdminUniversityUserRow,
} from "@/lib/university/admin-users";

type AdminUsersTableProps = {
  users: AdminUniversityUserRow[];
};

export default function AdminUsersTable({
  users,
}: AdminUsersTableProps) {
  if (
    users.length === 0
  ) {
    return (
      <div
        className="
          rounded-2xl
          border
          border-dashed
          border-[var(--border-default)]
          bg-[var(--surface-default)]
          px-6
          py-14
          text-center
        "
      >
        <p
          className="
            text-lg
            font-black
            text-[var(--text-primary)]
          "
        >
          No users matched these filters.
        </p>

        <p
          className="
            mx-auto
            mt-2
            max-w-lg
            text-sm
            leading-6
            text-[var(--text-secondary)]
          "
        >
          Try clearing the search, plan filter,
          or account-status filter.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="
          grid
          gap-3
          md:hidden
        "
      >
        {users.map(
          (user) => (
            <AdminUserRow
              key={user.id}
              user={user}
              variant="card"
            />
          ),
        )}
      </div>

      <div
        className="
          hidden
          overflow-hidden
          rounded-2xl
          border
          border-[var(--border-default)]
          bg-[var(--surface-default)]
          shadow-[var(--shadow-sm)]
          md:block
        "
      >
        <div className="overflow-x-auto">
          <table
            className="
              w-full
              min-w-[1120px]
              border-collapse
            "
          >
            <thead
              className="
                bg-[var(--surface-muted)]
              "
            >
              <tr
                className="
                  border-b
                  border-[var(--border-default)]
                "
              >
                {[
                  "User",
                  "Role",
                  "Plan",
                  "Status",
                  "Account Activity",
                  "Learning",
                  "",
                ].map(
                  (label) => (
                    <th
                      key={label}
                      scope="col"
                      className="
                        px-4
                        py-3
                        text-left
                        text-[10px]
                        font-extrabold
                        uppercase
                        tracking-[0.12em]
                        text-[var(--text-muted)]
                        last:text-right
                      "
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {users.map(
                (user) => (
                  <AdminUserRow
                    key={user.id}
                    user={user}
                    variant="table"
                  />
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
