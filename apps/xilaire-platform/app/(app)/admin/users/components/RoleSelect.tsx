"use client";

import { Role, getAssignableRoles } from "@/lib/roles";

interface Props {
  /** Role of the logged-in admin (permission gate only) */
  viewerRole: Role;

  /** ACTUAL role of the row user (source of truth) */
  userRole: Role;

  /** Called when the role is changed */
  onChange: (role: Role) => void;

  disabled?: boolean;
}

export default function RoleSelect({
  viewerRole,
  userRole,
  onChange,
  disabled,
}: Props) {
  /**
   * 🚨 MASTER USER RULE
   * - master_admin can NEVER be changed
   * - master_admin can ONLY be viewed by master_admin
   */
  const isMasterUser = userRole === "master_admin";
  const isViewerMaster = viewerRole === "master_admin";

  /**
   * Assignable roles based on viewer permissions
   */
  const assignableRoles = getAssignableRoles(viewerRole);

  /**
   * Ensure the CURRENT role is always visible in the dropdown
   * even if it is NOT assignable (prevents select mismatch)
   */
  const options: Role[] = assignableRoles.includes(userRole)
    ? assignableRoles
    : [userRole, ...assignableRoles];

  /**
   * Final disabled state
   */
  const isDisabled =
    disabled ||
    isMasterUser || // 🔒 master_admin is immutable
    (!isViewerMaster && isMasterUser);

  return (
    <select
      disabled={isDisabled}
      value={userRole}
      onChange={(e) => onChange(e.target.value as Role)}
      className={[
        "min-w-[140px]",
        "rounded px-2 py-1 text-sm",
        "border border-slate-700",
        "bg-slate-900 text-slate-200",
        "focus:outline-none focus:ring-1 focus:ring-sky-500",
        "disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed",
      ].join(" ")}
    >
      {options.map((role) => (
        <option
          key={role}
          value={role}
          className="bg-slate-900 text-slate-200"
        >
          {role.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}