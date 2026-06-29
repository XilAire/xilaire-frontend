export async function logAdminAction({
  supabaseAdmin,
  actorId,
  targetUserId,
  orgId,
  action,
  oldValue,
  newValue,
}: {
  supabaseAdmin: any;
  actorId: string;
  targetUserId: string;
  orgId: string;
  action: string;
  oldValue?: any;
  newValue?: any;
}) {
  await supabaseAdmin.from("admin_audit_logs").insert({
    actor_id: actorId,
    target_user_id: targetUserId,
    org_id: orgId,
    action,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
  });
}
