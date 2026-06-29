"use client";

import { Role } from "@/lib/roles";
import UserRow from "./UserRow";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: "active" | "disabled" | "deleted";
}

interface Props {
  viewerRole: Role;
  users: User[];

  /** ✅ OPTIONAL — last activity lookup */
  lastActivity?: Record<string, string | null>;

  busyUserId: string | null;

  /** ✅ NEW — open activity modal */
  onViewActivity: (userId: string) => void;

  onSuspend: (userId: string) => void;
  onActivate: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  onRoleChange: (userId: string, role: Role) => void;
  onRemove: (userId: string) => void;
}

/**
 * UserTable
 *
 * ✅ Delegates row behavior to UserRow
 * ✅ Keeps table layout concerns only
 * ✅ Accepts lastActivity (read-only, optional)
 */
export default function UserTable({
  viewerRole,
  users,
  lastActivity,
  busyUserId,
  onViewActivity,
  onSuspend,
  onActivate,
  onResetPassword,
  onRoleChange,
  onRemove,
}: Props) {
  return (
    <div className="relative overflow-visible rounded-md border border-slate-800 bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {users.map((user) => (
              <UserRow
                key={user.id}
                viewerRole={viewerRole}
                user={user}
                busy={busyUserId === user.id}
                lastActivity={lastActivity?.[user.id] ?? null}
                onViewActivity={() => onViewActivity(user.id)}
                onUpdate={(id, data) => {
                  if (data.role) onRoleChange(id, data.role);
                  if (data.status === "disabled") onSuspend(id);
                  if (data.status === "active") onActivate(id);
                  if (data.status === "deleted") onRemove(id);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}