import Link from "next/link";

import type {
  AdminUniversityPlanFilter,
  AdminUniversityRoleFilter,
  AdminUniversityUserStatusFilter,
} from "@/lib/university/admin-users";

type AdminUsersPaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  search: string;
  plan: AdminUniversityPlanFilter;
  role: AdminUniversityRoleFilter;
  status: AdminUniversityUserStatusFilter;
};

function buildHref({
  page,
  pageSize,
  search,
  plan,
  role,
  status,
}: {
  page: number;
  pageSize: number;
  search: string;
  plan: AdminUniversityPlanFilter;
  role: AdminUniversityRoleFilter;
  status: AdminUniversityUserStatusFilter;
}) {
  const params =
    new URLSearchParams();

  if (search) {
    params.set(
      "search",
      search,
    );
  }

  if (
    plan !== "all"
  ) {
    params.set(
      "plan",
      plan,
    );
  }

  if (
    role !== "all"
  ) {
    params.set(
      "role",
      role,
    );
  }

  if (
    status !== "all"
  ) {
    params.set(
      "status",
      status,
    );
  }

  params.set(
    "page",
    String(page),
  );

  if (
    pageSize !== 25
  ) {
    params.set(
      "pageSize",
      String(pageSize),
    );
  }

  return `/admin/users?${params.toString()}`;
}

function pageWindow(
  page: number,
  totalPages: number,
): number[] {
  const start =
    Math.max(
      1,
      Math.min(
        page - 2,
        totalPages - 4,
      ),
    );

  const end =
    Math.min(
      totalPages,
      start + 4,
    );

  const pages: number[] =
    [];

  for (
    let value = start;
    value <= end;
    value += 1
  ) {
    pages.push(
      value,
    );
  }

  return pages;
}

export default function AdminUsersPagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  search,
  plan,
  role,
  status,
}: AdminUsersPaginationProps) {
  if (
    totalItems === 0
  ) {
    return null;
  }

  const firstItem =
    (page - 1) *
      pageSize +
    1;

  const lastItem =
    Math.min(
      totalItems,
      page * pageSize,
    );

  const pages =
    pageWindow(
      page,
      totalPages,
    );

  const linkBase = `
    inline-flex
    h-9
    min-w-9
    items-center
    justify-center
    rounded-lg
    border
    px-3
    text-xs
    font-bold
    transition
  `;

  return (
    <div
      className="
        flex
        flex-col
        gap-3
        rounded-2xl
        border
        border-[var(--border-default)]
        bg-[var(--surface-default)]
        p-3
        sm:flex-row
        sm:items-center
        sm:justify-between
      "
    >
      <p
        className="
          text-xs
          font-semibold
          text-[var(--text-muted)]
        "
      >
        Showing{" "}
        {firstItem.toLocaleString()}–
        {lastItem.toLocaleString()} of{" "}
        {totalItems.toLocaleString()}
      </p>

      <div
        className="
          flex
          flex-wrap
          items-center
          gap-1.5
        "
      >
        {page > 1 ? (
          <Link
            href={buildHref({
              page:
                page - 1,
              pageSize,
              search,
              plan,
              role,
              status,
            })}
            className={`
              ${linkBase}
              border-[var(--border-default)]
              text-[var(--text-secondary)]
              hover:border-[var(--border-strong)]
              hover:text-[var(--text-primary)]
            `}
          >
            Previous
          </Link>
        ) : (
          <span
            className={`
              ${linkBase}
              cursor-not-allowed
              border-[var(--border-subtle)]
              text-[var(--text-muted)]
              opacity-50
            `}
          >
            Previous
          </span>
        )}

        {pages.map(
          (pageNumber) => {
            const active =
              pageNumber ===
              page;

            return (
              <Link
                key={pageNumber}
                href={buildHref({
                  page:
                    pageNumber,
                  pageSize,
                  search,
                  plan,
                  role,
                  status,
                })}
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                className={`
                  ${linkBase}
                  ${
                    active
                      ? `
                        border-[var(--primary)]
                        bg-[var(--primary)]
                        text-white
                      `
                      : `
                        border-[var(--border-default)]
                        text-[var(--text-secondary)]
                        hover:border-[var(--border-strong)]
                        hover:text-[var(--text-primary)]
                      `
                  }
                `}
              >
                {pageNumber}
              </Link>
            );
          },
        )}

        {page < totalPages ? (
          <Link
            href={buildHref({
              page:
                page + 1,
              pageSize,
              search,
              plan,
              role,
              status,
            })}
            className={`
              ${linkBase}
              border-[var(--border-default)]
              text-[var(--text-secondary)]
              hover:border-[var(--border-strong)]
              hover:text-[var(--text-primary)]
            `}
          >
            Next
          </Link>
        ) : (
          <span
            className={`
              ${linkBase}
              cursor-not-allowed
              border-[var(--border-subtle)]
              text-[var(--text-muted)]
              opacity-50
            `}
          >
            Next
          </span>
        )}
      </div>
    </div>
  );
}
