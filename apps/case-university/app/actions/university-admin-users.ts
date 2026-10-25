"use server";

import { requireActiveUniversityUser } from "@/lib/university/require-active-user";

import {
  revalidatePath,
} from "next/cache";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";
import {
  canActorManageTargetRole,
  getCurrentUniversityAdminContext,
  normalizeUniversityAdminRank,
  type UniversityAdminRoleName,
} from "@/lib/university/admin-permissions";

type UpdateUniversityUserRoleInput = {
  userId: string;
  roleName: UniversityAdminRoleName;
};

export type UpdateUniversityUserRoleResult = {
  success: boolean;
  message: string;
};

const MANAGED_ROLE_NAMES =
  new Set<UniversityAdminRoleName>([
    "user",
    "power_user",
    "admin",
    "super_admin",
    "master_admin",
  ]);

export async function updateUniversityUserRoleAction(
  input: UpdateUniversityUserRoleInput,
): Promise<UpdateUniversityUserRoleResult> {
  const userId = String(input.userId ?? "").trim();
  const roleName = String(input.roleName ?? "").trim().toLowerCase() as UniversityAdminRoleName;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return { success: false, message: "Invalid user identifier." };
  }
  if (!MANAGED_ROLE_NAMES.has(roleName)) {
    return { success: false, message: "Select a valid CASE University role." };
  }
  await requireActiveUniversityUser();
  const actor = await getCurrentUniversityAdminContext();
  if (!actor.permissions.canChangeUserRoles) {
    return { success: false, message: "You do not have permission to change CASE University user roles." };
  }
  const auth = await createSupabaseServerClient();
  const { data: { user: currentUser }, error: authError } = await auth.auth.getUser();
  if (authError || !currentUser) {
    return { success: false, message: "Your authenticated session could not be verified." };
  }
  if (currentUser.id === userId) {
    return { success: false, message: "You cannot change your own administrative role." };
  }
  const service = createSupabaseServerServiceClient();
  const { data, error } = await service.rpc("update_case_university_user_role", {
    p_actor_id: currentUser.id,
    p_user_id: userId,
    p_role_name: roleName,
  });
  if (error) {
    console.error("[CASE University Admin] Atomic role update failed", error);
    return { success: false, message: "Unable to update the user's role. No changes were committed." };
  }
  const result = data as { success?: boolean; changed?: boolean; role_name?: string } | null;
  if (!result || result.success !== true || result.role_name !== roleName) {
    return { success: false, message: "Role update transaction was not confirmed." };
  }
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return {
    success: true,
    message: result.changed === false
      ? `This user is already assigned the ${roleName.replaceAll("_", " ")} role.`
      : `User role changed to ${roleName.replaceAll("_", " ")} successfully.`,
  };
}


/** CASE University-only account suspension. Does not alter shared Supabase Auth. */
export async function updateUniversityAccountSuspensionAction(input: {
  userId: string;
  suspend: boolean;
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  const userId = String(input.userId ?? "").trim();
  const reason = String(input.reason ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return { success: false, message: "Invalid user identifier." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { success: false, message: "Enter a reason between 10 and 1000 characters." };
  }
  await requireActiveUniversityUser();
  const actor = await getCurrentUniversityAdminContext();
  if (!actor.permissions.canManageUsers) {
    return { success: false, message: "You cannot manage account security." };
  }
  const auth = await createSupabaseServerClient();
  const { data: { user: currentUser }, error: authError } = await auth.auth.getUser();
  if (authError || !currentUser) return { success: false, message: "Authentication required." };
  if (currentUser.id === userId) return { success: false, message: "You cannot suspend your own account." };
  const service = createSupabaseServerServiceClient();
  const { data: targetAuth, error: targetAuthError } = await service.auth.admin.getUserById(userId);
  if (targetAuthError || !targetAuth?.user) return { success: false, message: "Account not found." };
  const { data: target, error: profileError } = await service.from("profiles")
    .select("role_id,roles:roles!profiles_role_id_fkey(rank)")
    .eq("id", userId).maybeSingle();
  if (profileError || !target) return { success: false, message: "Unable to verify target role. No changes made." };
  const relation = target.roles as unknown as { rank: number | null } | Array<{ rank: number | null }> | null;
  const targetRank = normalizeUniversityAdminRank(Array.isArray(relation) ? relation[0]?.rank : relation?.rank);
  if (!canActorManageTargetRole({ actorRank: actor.roleRank, targetRank })) {
    return { success: false, message: "You cannot manage this account's administrative level." };
  }
  // A single database transaction updates status and records the audit event.
  // The RPC independently validates the actor, target rank and current status.
  const { data: transactionResult, error: transactionError } = await service.rpc(
    "update_case_university_account_suspension",
    {
      p_actor_id: currentUser.id,
      p_user_id: userId,
      p_suspend: input.suspend,
      p_reason: reason,
    },
  );
  if (transactionError) {
    console.error("[CASE University] Atomic suspension update failed", transactionError);
    return { success: false, message: "Unable to update University suspension status. No changes were committed." };
  }
  if (!transactionResult || transactionResult.success !== true) {
    return { success: false, message: "Suspension transaction was not confirmed." };
  }
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true, message: input.suspend ? "University access suspended." : "University access restored." };
}
