"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  updateUniversityUserRoleAction,
} from "@/app/actions/university-admin-users";

import type {
  UniversityAdminContext,
  UniversityAdminRoleName,
} from "@/lib/university/admin-permissions";

type AdminUserRoleManagerProps = {
  userId: string;
  currentRoleName: string | null;
  currentRoleRank: number;
  viewer: UniversityAdminContext;
};

type RoleOption = {
  name: UniversityAdminRoleName;
  label: string;
  rank: number;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    name: "user",
    label: "User",
    rank: 0,
  },
  {
    name: "power_user",
    label: "Power User",
    rank: 1,
  },
  {
    name: "admin",
    label: "Admin",
    rank: 2,
  },
  {
    name: "super_admin",
    label: "Super Admin",
    rank: 3,
  },
  {
    name: "master_admin",
    label: "Master Admin",
    rank: 4,
  },
];

function roleLabel(
  value: string | null,
): string {
  if (!value) {
    return "User";
  }

  return value
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

export default function AdminUserRoleManager({
  userId,
  currentRoleName,
  currentRoleRank,
  viewer,
}: AdminUserRoleManagerProps) {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    selectedRole,
    setSelectedRole,
  ] =
    useState<UniversityAdminRoleName>(
      (
        currentRoleName === "power_user" ||
        currentRoleName === "admin" ||
        currentRoleName === "super_admin" ||
        currentRoleName === "master_admin"
      )
        ? currentRoleName
        : "user",
    );

  const [
    notice,
    setNotice,
  ] =
    useState<{
      type:
        | "success"
        | "error";
      message: string;
    } | null>(
      null,
    );

  const assignableRoles =
    useMemo(
      () => {
        if (
          viewer.roleRank >=
          4
        ) {
          return ROLE_OPTIONS;
        }

        if (
          viewer.roleRank ===
          3
        ) {
          return ROLE_OPTIONS.filter(
            (role) =>
              role.rank <=
              2,
          );
        }

        return [];
      },
      [
        viewer.roleRank,
      ],
    );

  const canManageTarget =
    viewer.roleRank >= 4
      ? currentRoleRank <= 4
      : (
          viewer.roleRank ===
            3 &&
          currentRoleRank <
            3
        );

  const canChange =
    viewer.permissions
      .canChangeUserRoles &&
    canManageTarget &&
    assignableRoles.length >
      0;

  function handleUpdate() {
    setNotice(
      null,
    );

    startTransition(
      async () => {
        const result =
          await updateUniversityUserRoleAction(
            {
              userId,
              roleName:
                selectedRole,
            },
          );

        setNotice({
          type:
            result.success
              ? "success"
              : "error",

          message:
            result.message,
        });

        if (
          result.success
        ) {
          router.refresh();
        }
      },
    );
  }

  return (
    <div
      className="
        rounded-xl
        border
        border-[var(--border-default)]
        bg-[var(--surface-muted)]
        p-4
      "
    >
      <div
        className="
          flex
          flex-col
          gap-3
          sm:flex-row
          sm:items-start
          sm:justify-between
        "
      >
        <div>
          <p
            className="
              text-xs
              font-extrabold
              uppercase
              tracking-[0.1em]
              text-[var(--text-muted)]
            "
          >
            Administrative Role
          </p>

          <p
            className="
              mt-1
              text-lg
              font-black
              text-[var(--text-primary)]
            "
          >
            {roleLabel(
              currentRoleName,
            )}
          </p>

          <p
            className="
              mt-1
              text-xs
              text-[var(--text-secondary)]
            "
          >
            Rank{" "}
            {currentRoleRank}
          </p>
        </div>

        <div
          className="
            rounded-lg
            border
            border-[var(--border-default)]
            bg-[var(--surface-default)]
            px-3
            py-2
            text-xs
            font-semibold
            text-[var(--text-secondary)]
          "
        >
          Signed in as{" "}
          {roleLabel(
            viewer.roleName,
          )}{" "}
          · Rank{" "}
          {viewer.roleRank}
        </div>
      </div>

      {canChange ? (
        <div
          className="
            mt-4
            grid
            gap-3
            sm:grid-cols-[minmax(0,1fr)_auto]
            sm:items-end
          "
        >
          <label>
            <span
              className="
                mb-1.5
                block
                text-xs
                font-bold
                text-[var(--text-secondary)]
              "
            >
              Change role
            </span>

            <select
              value={
                selectedRole
              }
              onChange={(
                event,
              ) => {
                setSelectedRole(
                  event.target
                    .value as
                    UniversityAdminRoleName,
                );

                setNotice(
                  null,
                );
              }}
              disabled={
                isPending
              }
              className="
                h-11
                w-full
                rounded-xl
                border
                border-[var(--border-default)]
                bg-[var(--surface-default)]
                px-3
                text-sm
                font-semibold
                text-[var(--text-primary)]
                outline-none
                focus:border-[var(--primary)]
                focus:ring-2
                focus:ring-[var(--focus-ring)]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {assignableRoles.map(
                (
                  role,
                ) => (
                  <option
                    key={
                      role.name
                    }
                    value={
                      role.name
                    }
                  >
                    {role.label} ·
                    Rank{" "}
                    {role.rank}
                  </option>
                ),
              )}
            </select>
          </label>

          <button
            type="button"
            onClick={
              handleUpdate
            }
            disabled={
              isPending ||
              selectedRole ===
                currentRoleName
            }
            className="
              inline-flex
              h-11
              items-center
              justify-center
              rounded-xl
              bg-[var(--primary)]
              px-5
              text-sm
              font-bold
              text-white
              transition
              hover:opacity-90
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {isPending
              ? "Updating..."
              : "Update Role"}
          </button>
        </div>
      ) : (
        <div
          className="
            mt-4
            rounded-lg
            border
            border-[var(--border-default)]
            bg-[var(--surface-default)]
            p-3
            text-xs
            leading-5
            text-[var(--text-secondary)]
          "
        >
          {viewer.roleRank < 3
            ? "Admin accounts are read-only for user administration. Super Admin or Master Admin is required to change roles."
            : "You cannot change the role of an account at this administrative level."}
        </div>
      )}

      {notice ? (
        <div
          className={`
            mt-3
            rounded-lg
            border
            p-3
            text-sm
            font-semibold
            ${
              notice.type ===
              "success"
                ? `
                  border-[color-mix(in_srgb,var(--success)_30%,transparent)]
                  bg-[color-mix(in_srgb,var(--success)_10%,transparent)]
                  text-[var(--success)]
                `
                : `
                  border-[color-mix(in_srgb,var(--danger)_30%,transparent)]
                  bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]
                  text-[var(--danger)]
                `
            }
          `}
        >
          {notice.message}
        </div>
      ) : null}

      <div
        className="
          mt-4
          grid
          gap-2
          text-xs
          text-[var(--text-secondary)]
          sm:grid-cols-2
        "
      >
        <p>
          <strong>
            User (0):
          </strong>{" "}
          standard learner access.
        </p>

        <p>
          <strong>
            Power User (1):
          </strong>{" "}
          course-facing access only; no Admin section.
        </p>

        <p>
          <strong>
            Admin (2):
          </strong>{" "}
          view users and curriculum only.
        </p>

        <p>
          <strong>
            Super Admin (3):
          </strong>{" "}
          manage users/Admins and curriculum content.
        </p>

        <p>
          <strong>
            Master Admin (4+):
          </strong>{" "}
          manage all admin levels and protected operations.
        </p>

        <p>
          Publishing and permanent curriculum deletion remain
          Master Admin only.
        </p>
      </div>
    </div>
  );
}
