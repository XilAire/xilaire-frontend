import { createServerSupabaseClientReadOnly } from "@/lib/supabaseServerReadOnly";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import UserAdmin from "./UserAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserRole = "user" | "admin" | "super_admin" | "master_admin";
type RawUserStatus = "active" | "disabled" | "deleted" | null;

function normalizeRole(role?: string | null): UserRole {
  if (
    role === "user" ||
    role === "admin" ||
    role === "super_admin" ||
    role === "master_admin"
  ) {
    return role;
  }
  return "user";
}

function normalizeStatus(
  status?: RawUserStatus
): "active" | "disabled" | "deleted" {
  if (status === "disabled" || status === "deleted") {
    return status;
  }
  return "active";
}

function formatLastActivity(
  activity: { action: string; created_at: string } | null
): string | null {
  if (!activity) return null;
  return `${activity.action} • ${new Date(
    activity.created_at
  ).toLocaleString()}`;
}

export default async function AdminUsersPage() {
  /* -------------------------------------------------
     🔒 READ-ONLY AUTH CONTEXT
  ------------------------------------------------- */
  const supabase = createServerSupabaseClientReadOnly();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-6 text-sm">Authentication required.</div>;
  }

  /* -------------------------------------------------
     🔐 VIEWER CONTEXT
  ------------------------------------------------- */
  const { data: orgUser } = await supabaseAdmin
    .from("org_users")
    .select("role, org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let viewerRole: UserRole;
  let viewerOrgId: string | null;

  if (orgUser) {
    viewerRole = normalizeRole(orgUser.role);
    viewerOrgId = orgUser.org_id;
  } else {
    const { data: viewerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, org_id")
      .eq("id", user.id)
      .single();

    if (!viewerProfile) {
      return <div className="p-6 text-sm">Profile not found.</div>;
    }

    viewerRole = normalizeRole(viewerProfile.role);
    viewerOrgId = viewerProfile.org_id;
  }

  /* -------------------------------------------------
     👥 USERS LIST
  ------------------------------------------------- */
  let query = supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, status, org_id")
    .order("created_at", { ascending: true });

  if (viewerRole !== "master_admin" && viewerOrgId) {
    query = query.eq("org_id", viewerOrgId);
  }

  const { data: users } = await query;

  const normalizedUsers =
    users
      ?.map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: normalizeRole(u.role),
        status: normalizeStatus(u.status),
      }))
      // 🚨 CRITICAL: do NOT pass deleted users to UserAdmin
      .filter((u) => u.status !== "deleted")
      // 🔒 TS guarantee
      .map((u) => ({
        ...u,
        status: u.status as "active" | "disabled",
      })) ?? [];

  /* -------------------------------------------------
     🕒 LAST ACTIVITY (AUDIT LOGS — ONE QUERY)
  ------------------------------------------------- */
  const { data: auditLogs } = await supabaseAdmin
    .from("profile_audit_logs")
    .select("target_id, action, created_at")
    .order("created_at", { ascending: false });

  // Reduce to latest activity per user
  const latestActivity = new Map<
    string,
    { action: string; created_at: string }
  >();

  auditLogs?.forEach((log) => {
    if (!latestActivity.has(log.target_id)) {
      latestActivity.set(log.target_id, {
        action: log.action,
        created_at: log.created_at,
      });
    }
  });

  // ✅ FINAL SHAPE — Record<string, string | null>
  const lastActivity: Record<string, string | null> = Object.fromEntries(
    Array.from(latestActivity.entries()).map(([userId, activity]) => [
      userId,
      formatLastActivity(activity),
    ])
  );

  return (
    <UserAdmin
      viewerRole={viewerRole}
      users={normalizedUsers}
      lastActivity={lastActivity}
    />
  );
}
