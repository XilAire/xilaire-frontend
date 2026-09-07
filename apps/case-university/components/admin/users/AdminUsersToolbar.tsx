import Link from "next/link";

import type {
  AdminUniversityPlanFilter,
  AdminUniversityRoleFilter,
  AdminUniversityUserStatusFilter,
} from "@/lib/university/admin-users";

type AdminUsersToolbarProps = {
  search: string;
  plan: AdminUniversityPlanFilter;
  role: AdminUniversityRoleFilter;
  status: AdminUniversityUserStatusFilter;
  resultCount: number;
};

export default function AdminUsersToolbar({
  search,
  plan,
  role,
  status,
  resultCount,
}: AdminUsersToolbarProps) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-[var(--border-default)]
        bg-[var(--surface-default)]
        p-4
        shadow-[var(--shadow-sm)]
      "
    >
      <form
        action="/admin/users"
        method="get"
        className="
          grid
          gap-3
          lg:grid-cols-[minmax(0,1fr)_160px_180px_210px_auto]
          lg:items-end
        "
      >
        <label className="block">
          <span
            className="
              mb-1.5
              block
              text-xs
              font-bold
              text-[var(--text-secondary)]
            "
          >
            Search users
          </span>

          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Name, email, or user ID"
            autoComplete="off"
            className="
              h-11
              w-full
              rounded-xl
              border
              border-[var(--border-default)]
              bg-[var(--background)]
              px-3.5
              text-sm
              text-[var(--text-primary)]
              outline-none
              transition
              placeholder:text-[var(--text-muted)]
              focus:border-[var(--primary)]
              focus:ring-2
              focus:ring-[var(--focus-ring)]
            "
          />
        </label>

        <label className="block">
          <span
            className="
              mb-1.5
              block
              text-xs
              font-bold
              text-[var(--text-secondary)]
            "
          >
            Plan
          </span>

          <select
            name="plan"
            defaultValue={plan}
            className="
              h-11
              w-full
              rounded-xl
              border
              border-[var(--border-default)]
              bg-[var(--background)]
              px-3
              text-sm
              font-semibold
              text-[var(--text-primary)]
              outline-none
              focus:border-[var(--primary)]
              focus:ring-2
              focus:ring-[var(--focus-ring)]
            "
          >
            <option value="all">
              All plans
            </option>

            <option value="free">
              Free
            </option>

            <option value="plus">
              Plus
            </option>

            <option value="pro">
              Pro
            </option>
          </select>
        </label>

        <label className="block">
          <span
            className="
              mb-1.5
              block
              text-xs
              font-bold
              text-[var(--text-secondary)]
            "
          >
            Role
          </span>

          <select
            name="role"
            defaultValue={role}
            className="
              h-11
              w-full
              rounded-xl
              border
              border-[var(--border-default)]
              bg-[var(--background)]
              px-3
              text-sm
              font-semibold
              text-[var(--text-primary)]
              outline-none
              focus:border-[var(--primary)]
              focus:ring-2
              focus:ring-[var(--focus-ring)]
            "
          >
            <option value="all">
              All roles
            </option>

            <option value="user">
              User
            </option>

            <option value="admin">
              Admin
            </option>

            <option value="super_admin">
              Super Admin
            </option>

            <option value="master_admin">
              Master Admin
            </option>
          </select>
        </label>

        <label className="block">
          <span
            className="
              mb-1.5
              block
              text-xs
              font-bold
              text-[var(--text-secondary)]
            "
          >
            Account status
          </span>

          <select
            name="status"
            defaultValue={status}
            className="
              h-11
              w-full
              rounded-xl
              border
              border-[var(--border-default)]
              bg-[var(--background)]
              px-3
              text-sm
              font-semibold
              text-[var(--text-primary)]
              outline-none
              focus:border-[var(--primary)]
              focus:ring-2
              focus:ring-[var(--focus-ring)]
            "
          >
            <option value="all">
              All statuses
            </option>

            <option value="active">
              Active
            </option>

            <option value="never_signed_in">
              Never signed in
            </option>

            <option value="disabled">
              Disabled
            </option>
          </select>
        </label>

        <div
          className="
            flex
            gap-2
          "
        >
          <button
            type="submit"
            className="
              inline-flex
              h-11
              flex-1
              items-center
              justify-center
              rounded-xl
              bg-[var(--primary)]
              px-4
              text-sm
              font-bold
              text-white
              transition
              hover:opacity-90
              lg:flex-none
            "
          >
            Apply
          </button>

          <Link
            href="/admin/users"
            className="
              inline-flex
              h-11
              items-center
              justify-center
              rounded-xl
              border
              border-[var(--border-default)]
              bg-[var(--surface-default)]
              px-4
              text-sm
              font-bold
              text-[var(--text-secondary)]
              transition
              hover:border-[var(--border-strong)]
              hover:text-[var(--text-primary)]
            "
          >
            Clear
          </Link>
        </div>
      </form>

      <div
        className="
          mt-3
          border-t
          border-[var(--border-subtle)]
          pt-3
          text-xs
          font-semibold
          text-[var(--text-muted)]
        "
      >
        {resultCount.toLocaleString()} matching{" "}
        {resultCount === 1
          ? "user"
          : "users"}
      </div>
    </div>
  );
}
