import Link from "next/link";

import type {
  AdminUniversityUserRow,
} from "@/lib/university/admin-users";

type AdminUserRowProps = {
  user: AdminUniversityUserRow;
  variant?: "table" | "card";
};

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date);
}

function roleLabel(
  roleName: string,
): string {
  return roleName
    .replace(
      /[_-]+/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function RoleBadge({
  roleName,
  roleRank,
}: {
  roleName: string;
  roleRank: number;
}) {
  return (
    <span
      className="
        inline-flex
        rounded-full
        border
        border-[var(--border-default)]
        bg-[var(--surface-muted)]
        px-2.5
        py-1
        text-[10px]
        font-extrabold
        uppercase
        tracking-[0.08em]
        text-[var(--text-secondary)]
      "
    >
      {roleLabel(
        roleName,
      )} · {roleRank}
    </span>
  );
}

function planClasses(
  plan:
    AdminUniversityUserRow["plan"],
): string {
  if (plan === "pro") {
    return `
      border-[var(--achievement-border)]
      bg-[var(--achievement-soft)]
      text-[var(--achievement)]
    `;
  }

  if (plan === "plus") {
    return `
      border-[var(--primary-border)]
      bg-[var(--primary-soft)]
      text-[var(--primary)]
    `;
  }

  return `
    border-[var(--border-default)]
    bg-[var(--surface-muted)]
    text-[var(--text-secondary)]
  `;
}

function statusLabel(
  status:
    AdminUniversityUserRow["status"],
): string {
  switch (status) {
    case "never_signed_in":
      return "Never Signed In";

    case "disabled":
      return "Disabled";

    case "active":
    default:
      return "Active";
  }
}

function statusClasses(
  status:
    AdminUniversityUserRow["status"],
): string {
  if (
    status === "active"
  ) {
    return `
      bg-[color-mix(in_srgb,var(--success)_12%,transparent)]
      text-[var(--success)]
    `;
  }

  if (
    status === "disabled"
  ) {
    return `
      bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]
      text-[var(--danger)]
    `;
  }

  return `
    bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]
    text-[var(--warning)]
  `;
}

function PlanBadge({
  plan,
}: {
  plan:
    AdminUniversityUserRow["plan"];
}) {
  return (
    <span
      className={`
        inline-flex
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        font-extrabold
        uppercase
        tracking-[0.1em]
        ${planClasses(plan)}
      `}
    >
      {plan}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status:
    AdminUniversityUserRow["status"];
}) {
  return (
    <span
      className={`
        inline-flex
        rounded-full
        px-2.5
        py-1
        text-[10px]
        font-extrabold
        uppercase
        tracking-[0.08em]
        ${statusClasses(status)}
      `}
    >
      {statusLabel(status)}
    </span>
  );
}

export default function AdminUserRow({
  user,
  variant = "table",
}: AdminUserRowProps) {
  if (
    variant === "card"
  ) {
    return (
      <article
        className="
          rounded-2xl
          border
          border-[var(--border-default)]
          bg-[var(--surface-default)]
          p-4
          shadow-[var(--shadow-sm)]
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            gap-3
          "
        >
          <div className="min-w-0">
            <p
              className="
                truncate
                font-black
                text-[var(--text-primary)]
              "
            >
              {user.fullName ??
                "Unnamed User"}
            </p>

            <p
              className="
                mt-1
                truncate
                text-sm
                text-[var(--text-secondary)]
              "
            >
              {user.email ??
                "No email"}
            </p>
          </div>

          <div
            className="
              flex
              flex-wrap
              justify-end
              gap-1.5
            "
          >
            <RoleBadge
              roleName={
                user.roleName
              }
              roleRank={
                user.roleRank
              }
            />

            <PlanBadge
              plan={user.plan}
            />
          </div>
        </div>

        <div
          className="
            mt-4
            grid
            grid-cols-2
            gap-3
            text-xs
          "
        >
          <div>
            <p className="text-[var(--text-muted)]">
              Status
            </p>

            <div className="mt-1">
              <StatusBadge
                status={user.status}
              />
            </div>
          </div>

          <div>
            <p className="text-[var(--text-muted)]">
              Registered
            </p>

            <p
              className="
                mt-1
                font-semibold
                text-[var(--text-primary)]
              "
            >
              {formatDateTime(
                user.createdAt,
              )}
            </p>
          </div>

          <div>
            <p className="text-[var(--text-muted)]">
              Courses
            </p>

            <p
              className="
                mt-1
                font-semibold
                text-[var(--text-primary)]
              "
            >
              {user.completedCourseCount}/
              {user.courseCount} completed
            </p>
          </div>

          <div>
            <p className="text-[var(--text-muted)]">
              Certificates
            </p>

            <p
              className="
                mt-1
                font-semibold
                text-[var(--text-primary)]
              "
            >
              {user.certificateCount}
            </p>
          </div>
        </div>

        <p
          className="
            mt-3
            truncate
            font-mono
            text-[10px]
            text-[var(--text-muted)]
          "
          title={user.id}
        >
          {user.id}
        </p>

        <Link
          href={`/admin/users/${user.id}`}
          className="
            mt-4
            inline-flex
            h-10
            w-full
            items-center
            justify-center
            rounded-xl
            border
            border-[var(--border-default)]
            bg-[var(--surface-muted)]
            text-sm
            font-bold
            text-[var(--text-primary)]
            transition
            hover:border-[var(--primary-border)]
            hover:text-[var(--primary)]
          "
        >
          View User
        </Link>
      </article>
    );
  }

  return (
    <tr
      className="
        border-b
        border-[var(--border-subtle)]
        last:border-b-0
      "
    >
      <td
        className="
          px-4
          py-4
          align-top
        "
      >
        <Link
          href={`/admin/users/${user.id}`}
          className="
            group
            block
            min-w-0
          "
        >
          <p
            className="
              font-bold
              text-[var(--text-primary)]
              group-hover:text-[var(--primary)]
            "
          >
            {user.fullName ??
              "Unnamed User"}
          </p>

          <p
            className="
              mt-1
              max-w-[280px]
              truncate
              text-xs
              text-[var(--text-secondary)]
            "
          >
            {user.email ??
              "No email"}
          </p>

          <p
            className="
              mt-1
              max-w-[280px]
              truncate
              font-mono
              text-[10px]
              text-[var(--text-muted)]
            "
            title={user.id}
          >
            {user.id}
          </p>
        </Link>
      </td>

      <td
        className="
          px-4
          py-4
          align-top
        "
      >
        <RoleBadge
          roleName={
            user.roleName
          }
          roleRank={
            user.roleRank
          }
        />
      </td>

      <td
        className="
          px-4
          py-4
          align-top
        "
      >
        <PlanBadge
          plan={user.plan}
        />

        {user.billingStatus ? (
          <p
            className="
              mt-1.5
              text-[10px]
              font-semibold
              text-[var(--text-muted)]
            "
          >
            {user.billingStatus}
          </p>
        ) : null}
      </td>

      <td
        className="
          px-4
          py-4
          align-top
        "
      >
        <StatusBadge
          status={user.status}
        />
      </td>

      <td
        className="
          px-4
          py-4
          align-top
          text-xs
          text-[var(--text-secondary)]
        "
      >
        <p>
          {formatDateTime(
            user.createdAt,
          )}
        </p>

        <p
          className="
            mt-1
            text-[10px]
            text-[var(--text-muted)]
          "
        >
          Last sign-in:{" "}
          {formatDateTime(
            user.lastSignInAt,
          )}
        </p>
      </td>

      <td
        className="
          px-4
          py-4
          align-top
          text-xs
          text-[var(--text-secondary)]
        "
      >
        <p>
          {user.completedCourseCount}/
          {user.courseCount} courses
        </p>

        <p
          className="
            mt-1
            text-[10px]
            text-[var(--text-muted)]
          "
        >
          {user.certificateCount}{" "}
          {user.certificateCount ===
          1
            ? "certificate"
            : "certificates"}
        </p>
      </td>

      <td
        className="
          px-4
          py-4
          text-right
          align-top
        "
      >
        <Link
          href={`/admin/users/${user.id}`}
          className="
            inline-flex
            h-9
            items-center
            justify-center
            rounded-lg
            border
            border-[var(--border-default)]
            px-3
            text-xs
            font-bold
            text-[var(--text-primary)]
            transition
            hover:border-[var(--primary-border)]
            hover:text-[var(--primary)]
          "
        >
          View
        </Link>
      </td>
    </tr>
  );
}
