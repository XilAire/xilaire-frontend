"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import UserTable from "./components/UserTable";
import InviteUserModal from "./components/InviteUserModal";
import AdminActivityModal from "./components/activity/AdminActivityModal";
import type { AdminActivity } from "./components/activity/adminActivity.types";
import { Role } from "@/lib/roles";

/* ---------------------------------------------------------
   TYPES — UI SOURCE OF TRUTH
--------------------------------------------------------- */
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  status: "active" | "disabled";
}

interface Props {
  viewerRole: Role;
  users: User[];
  lastActivity: Record<string, string | null>;
}

/* ---------------------------------------------------------
   COMPONENT
--------------------------------------------------------- */
export default function UserAdmin({
  viewerRole,
  users,
  lastActivity,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // Activity modal state
  const [activityUserId, setActivityUserId] = useState<string | null>(null);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const [localUsers, setLocalUsers] = useState<User[]>(users);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  /* ---------------------------------------------------------
     Detect deep-link timeline intent
  --------------------------------------------------------- */
  useEffect(() => {
    const tab = searchParams.get("tab");
    const userId = searchParams.get("userId");

    if (tab === "timeline" && userId) {
      setActivityUserId(userId);
    } else {
      setActivityUserId(null);
    }
  }, [searchParams]);

  /* ---------------------------------------------------------
     Fetch activity logs when modal opens
  --------------------------------------------------------- */
  useEffect(() => {
    if (!activityUserId) return;

    let cancelled = false;

    const load = async () => {
      setActivitiesLoading(true);

      try {
        const res = await fetch(
          `/api/admin/users/${activityUserId}/activity`
        );

        const json = await res.json();

        /**
         * Normalize activity response
         * - Supports [] OR { data: [] }
         * - Guarantees activities is always an array
         */
        const activityArray: AdminActivity[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : [];

        if (!cancelled) setActivities(activityArray);
      } catch (err) {
        console.error(err);
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setActivitiesLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [activityUserId]);

  /* ---------------------------------------------------------
     OPEN activity modal (from table)
  --------------------------------------------------------- */
  const onViewActivity = useCallback(
    (userId: string) => {
      setActivityUserId(userId);
      router.replace(`/admin/users?tab=timeline&userId=${userId}`);
    },
    [router]
  );

  /* ---------------------------------------------------------
     Close activity modal + clean URL
  --------------------------------------------------------- */
  const closeActivity = useCallback(() => {
    setActivityUserId(null);
    setActivities([]);
    router.replace("/admin/users");
  }, [router]);

  /* ---------------------------------------------------------
     SHARED ADMIN ACTION HANDLER
  --------------------------------------------------------- */
  const adminAction = useCallback(
    async (
      userId: string,
      endpoint: string,
      payload: Record<string, any> = {},
      optimistic?: (u: User) => User
    ) => {
      setBusyUserId(userId);

      if (optimistic) {
        setLocalUsers((prev) =>
          prev.map((u) => (u.id === userId ? optimistic(u) : u))
        );
      }

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, ...payload }),
        });

        if (!res.ok) throw new Error(await res.text());
        router.refresh();
      } catch (err) {
        console.error(err);
        router.refresh();
      } finally {
        setBusyUserId(null);
      }
    },
    [router]
  );

  /* ---------------------------------------------------------
     ACTION WRAPPERS
  --------------------------------------------------------- */
  const onSuspend = useCallback(
    (userId: string) =>
      adminAction(
        userId,
        "/api/admin/users/suspend",
        {},
        (u) => ({ ...u, status: "disabled" })
      ),
    [adminAction]
  );

  const onActivate = useCallback(
    (userId: string) =>
      adminAction(
        userId,
        "/api/admin/users/activate",
        {},
        (u) => ({ ...u, status: "active" })
      ),
    [adminAction]
  );

  const onResetPassword = useCallback(
    (userId: string) =>
      adminAction(userId, "/api/admin/users/reset-password"),
    [adminAction]
  );

  const onRoleChange = useCallback(
    (userId: string, role: Role) =>
      adminAction(
        userId,
        "/api/admin/users/role",
        { role },
        (u) => ({ ...u, role })
      ),
    [adminAction]
  );

  const onRemove = useCallback(
    (userId: string) => {
      if (!confirm("Are you sure you want to remove this user?")) return;
      return adminAction(userId, "/api/admin/users/remove");
    },
    [adminAction]
  );

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">User Administration</h1>

        {viewerRole !== "user" && (
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Invite User
          </button>
        )}
      </div>

      <UserTable
        viewerRole={viewerRole}
        users={localUsers}
        lastActivity={lastActivity}
        busyUserId={busyUserId}
        onViewActivity={onViewActivity}
        onSuspend={onSuspend}
        onActivate={onActivate}
        onResetPassword={onResetPassword}
        onRoleChange={onRoleChange}
        onRemove={onRemove}
      />

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      <AdminActivityModal
        open={!!activityUserId}
        onClose={closeActivity}
        activities={activities}
        loading={activitiesLoading}
      />
    </div>
  );
}
