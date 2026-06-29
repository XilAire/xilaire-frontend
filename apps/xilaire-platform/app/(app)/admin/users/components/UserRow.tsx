"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Role, canEditUser } from "@/lib/roles";

import RoleSelect from "./RoleSelect";
import StatusToggle from "./StatusToggle";
import UserActionsMenu from "./UserActionsMenu";
import { RoleBadge } from "./RoleBadge";
import { StatusPill } from "./StatusPill";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  status: "active" | "disabled" | "deleted";
}

interface Props {
  viewerRole: Role;
  user: User;
  onUpdate: (id: string, data: Partial<User>) => void;

  /** 🔹 NEW — delegate activity intent upward */
  onViewActivity: () => void;

  /** 🔹 Optional UI helpers */
  lastActivity?: string | null;
  busy?: boolean;
}

/* -------------------------------------------------
   COMPONENT
------------------------------------------------- */
export default function UserRow({
  viewerRole,
  user,
  onUpdate,
  onViewActivity,
  lastActivity = null,
  busy = false,
}: Props) {
  const router = useRouter();

  const editable = canEditUser(viewerRole, user.role);
  const isDeleted = user.status === "deleted";

  const statusForToggle: "active" | "disabled" =
    isDeleted
      ? "disabled"
      : user.status === "active"
      ? "active"
      : "disabled";

  /* ---------------------------
     Navigation handlers
  --------------------------- */
  const handleViewDetails = useCallback(() => {
    router.push(`/admin/users/${user.id}?tab=details`);
  }, [router, user.id]);

  /* ---------------------------
     Render
  --------------------------- */
  return (
    <tr
      className={[
        "border-b transition-colors",
        "hover:bg-muted/40",
        isDeleted ? "opacity-50" : "",
        busy ? "pointer-events-none opacity-70" : "",
      ].join(" ")}
      aria-disabled={isDeleted}
      aria-busy={busy}
    >
      {/* USER */}
      <td className="px-4 py-4">
        <button
          onClick={handleViewDetails}
          className="text-left group focus:outline-none focus:ring-2 focus:ring-ring rounded"
          aria-label={`View details for ${user.email}`}
        >
          <div className="font-medium group-hover:underline">
            {user.full_name ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            {user.email}
          </div>
        </button>
      </td>

      {/* EMAIL */}
      <td className="px-4 py-4 text-sm text-muted-foreground">
        {user.email}
      </td>

      {/* ROLE */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <RoleBadge role={user.role} />
          <RoleSelect
            viewerRole={viewerRole}
            userRole={user.role}
            disabled={!editable || isDeleted || busy}
            onChange={(role) => onUpdate(user.id, { role })}
          />
        </div>
      </td>

      {/* STATUS */}
      <td className="px-4 py-4">
        {editable && !isDeleted ? (
          <StatusToggle
            value={statusForToggle}
            disabled={busy}
            onChange={(status) => onUpdate(user.id, { status })}
          />
        ) : (
          <StatusPill status={statusForToggle} />
        )}

        {lastActivity && (
          <div className="mt-1 text-xs text-muted-foreground">
            Last activity: {new Date(lastActivity).toLocaleString()}
          </div>
        )}
      </td>

      {/* ACTIONS */}
      <td className="px-4 py-4 text-right">
        {editable && !isDeleted ? (
          <UserActionsMenu
            status={statusForToggle}
            onViewActivity={onViewActivity}
            onResetPassword={() => {}}
            onSuspend={() => onUpdate(user.id, { status: "disabled" })}
            onActivate={() => onUpdate(user.id, { status: "active" })}
            onRemove={() => onUpdate(user.id, { status: "deleted" })}
          />
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            🔒 Locked
          </span>
        )}
      </td>
    </tr>
  );
}
